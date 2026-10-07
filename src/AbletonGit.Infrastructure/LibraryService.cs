using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using AbletonGit.Core;

namespace AbletonGit.Infrastructure;

public sealed record LibrarySet(string ProjectPath, string SetPath, string MetadataDirectory, ProjectModel Model);
public sealed record LibraryModel(int SchemaVersion, string Name, IReadOnlyList<LibrarySet> Sets);
public sealed record LibraryAnalysis(LibraryModel Library, IReadOnlyList<string> ChangedFiles);
public sealed record LibraryInit(LibraryAnalysis Analysis, IReadOnlyList<string> Changes);
public sealed record LibraryStatus(LibraryModel Library, RepositoryState Repository, int LfsAudio, int UnmanagedAudio);

// An explicit collection root, one repository and one baseline containing all Set models.
public sealed class LibraryService(IGitRepository git, ISetReader reader, MetadataWriter metadata)
{
    public const int MaxParallelProjects = 4;
    private const string Catalog = ".abletongit/library.json";
    private static readonly string[] ReportNames = ["project.json", "tracks.md", "clips.md", "devices.md", "scenes.md", "routing.md"];
    public static string Root(string path)
    {
        var root = Path.GetFullPath(path);
        if (!Directory.Exists(root)) throw new CompanionException("--all needs the parent folder containing your Ableton projects.");
        ProjectDiscovery.EnsureSafePath(root, root);
        return root;
    }
    private static IReadOnlyList<ProjectLocation> Discover(string root)
    {
        // Fail on nested repositories before reading/writing anything. Do not flatten history.
        void CheckRepositories(string directory)
        {
            foreach (var child in Directory.EnumerateDirectories(directory))
            {
                var name = Path.GetFileName(child);
                if (new[] { ".git", ".abletongit", "Backup", "Samples", "Ableton Project Info" }.Contains(name, StringComparer.OrdinalIgnoreCase)) continue;
                if ((File.GetAttributes(child) & FileAttributes.ReparsePoint) != 0) continue;
                if (Directory.Exists(Path.Combine(child, ".git")) || File.Exists(Path.Combine(child, ".git")))
                    throw new CompanionException($"Nested repository found: {ProjectDiscovery.Relative(root, child)}. Migrate its history deliberately before using --all; no repositories were removed.");
                CheckRepositories(child);
            }
        }
        CheckRepositories(root);
        return ProjectDiscovery.EnumerateFiles(root).Where(p => p.EndsWith(".als", StringComparison.OrdinalIgnoreCase))
            .OrderBy(p => ProjectDiscovery.Relative(root, p), StringComparer.Ordinal)
            .Select(ProjectDiscovery.Discover).ToList();
    }
    public async Task<LibraryModel> ProjectAsync(string path, CancellationToken ct)
    {
        var root = Root(path); var locations = Discover(root); var sets = new LibrarySet[locations.Count];
        if (locations.Count == 0 && !File.Exists(Path.Combine(root, Catalog)))
            throw new CompanionException("No Ableton Sets were found under this folder (Backup folders are excluded).");
        await Parallel.ForEachAsync(Enumerable.Range(0, locations.Count), new ParallelOptions { MaxDegreeOfParallelism = MaxParallelProjects, CancellationToken = ct }, async (index, token) =>
        {
            var location = locations[index];
            var setPath = ProjectDiscovery.Relative(root, location.SetPath);
            try { sets[index] = new(ProjectDiscovery.Relative(root, location.Root), setPath, MetadataPath(setPath), await reader.ReadAsync(location, token)); }
            catch (CompanionException ex) { throw new CompanionException($"Unable to analyse {setPath}: {ex.Message}", ex); }
        });
        return new(1, Path.GetFileName(root), sets);
    }
    public async Task<LibraryAnalysis> AnalyseAsync(string path, CancellationToken ct)
    {
        var root = Root(path);
        var model = await ProjectAsync(root, ct); // Parse every Set before any metadata changes.
        using var held = CompanionService.Lock(root);
        return await Write(root, model, ct);
    }
    public async Task<LibraryInit> InitAsync(string path, CancellationToken ct)
    {
        var root = Root(path); var model = await ProjectAsync(root, ct);
        await Tools(root, ct);
        var existing = await git.RootAsync(root, ct);
        if (existing is not null && !CompanionService.SamePath(existing, root))
            throw new CompanionException("Choose the repository root for --all. Init will not create a repository inside another repository.");
        using var held = CompanionService.Lock(root);
        var changes = new List<string>();
        if (existing is null) { await git.InitializeAsync(root, ct); changes.Add("Initialised one repository for the project library (main)."); }
        await git.InstallLfsAsync(root, ct); changes.Add("Verified/installed repository-local Git LFS.");
        var patterns = new[] { "*.wav", "*.aif", "*.aiff", "*.flac", "*.[wW][aA][vV]", "*.[aA][iI][fF]", "*.[aA][iI][fF][fF]", "*.[fF][lL][aA][cC]" };
        if (await CompanionService.AppendLines(root, ".gitattributes", patterns.Select(p => p + " filter=lfs diff=lfs merge=lfs -text").ToList(), ct)) changes.Add("Added library-wide LFS audio rules.");
        if (await CompanionService.AppendLines(root, ".gitignore", ["*.asd", "Backup/", ".DS_Store", "Thumbs.db", ".abletongit/**/*.tmp", ".abletongit/operation.lock"], ct)) changes.Add("Added cache, backup and metadata temporary-file ignores.");
        var analysis = await Write(root, model, ct);
        changes.AddRange(analysis.ChangedFiles.Select(p => "Generated/updated " + p));
        return new(analysis, changes);
    }
    public async Task<LibraryStatus> StatusAsync(string path, CancellationToken ct)
    {
        var root = Root(path); var model = await ProjectAsync(root, ct); var state = await git.StateAsync(root, ct);
        var media = Media(model);
        var managed = state.Exists ? (await LfsChecks(root, media, ct)).Count(check => check) : 0;
        return new(model, state, managed, media.Count - managed);
    }
    public async Task<IReadOnlyList<SnapshotEntry>> HistoryAsync(string path, CancellationToken ct)
    { var root = Root(path); await RequireRepo(root, ct); return await git.HistoryAsync(root, ct); }
    public async Task PushAsync(string path, CancellationToken ct)
    { var root = Root(path); await RequireRepo(root, ct); using var held = CompanionService.Lock(root); await git.PushAsync(root, ct); }
    public async Task<ProjectDiff> DiffAsync(string path, CancellationToken ct)
    {
        var root = Root(path); await RequireRepo(root, ct);
        return Compare(await Previous(root, ct), await ProjectAsync(root, ct), await git.StateAsync(root, ct));
    }
    public async Task<SnapshotResult> SnapshotAsync(string path, string message, bool push, CancellationToken ct,
        Action<ProjectDiff, IReadOnlyList<FileChange>>? preview = null)
    {
        CompanionService.ValidateMessage(message);
        var root = Root(path); await RequireRepo(root, ct); await Tools(root, ct);
        using var held = CompanionService.Lock(root);
        if (!await git.LfsConfiguredAsync(root, ct)) throw new CompanionException("Git LFS filters are missing. Run Init with --all.");
        if (await git.HasStagedAsync(root, ct)) throw new CompanionException("Files are already prepared in Git. Commit or unstage them before making a Snapshot.");
        var state = await git.StateAsync(root, ct);
        if (state.Branch?.StartsWith("Detached", StringComparison.Ordinal) == true || state.Changes.Any(c => c.State.Contains('U') || c.State is "AA" or "DD"))
            throw new CompanionException("Select a branch and resolve Git conflicts before making a Snapshot.");
        if (new[] { "MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "rebase-merge", "rebase-apply" }.Any(p => File.Exists(Path.Combine(root, ".git", p)) || Directory.Exists(Path.Combine(root, ".git", p))))
            throw new CompanionException("Finish the Git merge/rebase operation before making a Snapshot.");
        var locations = Discover(root);
        var hashes = new Dictionary<string, string>(StringComparer.Ordinal);
        var hashResults = new string[locations.Count];
        await Parallel.ForEachAsync(Enumerable.Range(0, locations.Count), new ParallelOptions { MaxDegreeOfParallelism = MaxParallelProjects, CancellationToken = ct }, async (i, token) =>
            hashResults[i] = await CompanionService.Hash(locations[i].SetPath, token));
        for (var i = 0; i < locations.Count; i++) hashes.Add(locations[i].SetPath, hashResults[i]);
        var model = await ProjectAsync(root, ct); var previous = await Previous(root, ct);
        await CheckSets();
        await Write(root, model, ct);
        state = await git.StateAsync(root, ct);
        var diff = Compare(previous, model, state);
        var projects = model.Sets.Concat(previous?.Sets ?? []).Select(s => s.ProjectPath).Distinct(StringComparer.Ordinal).ToList();
        var metadataPaths = model.Sets.Concat(previous?.Sets ?? []).Select(s => s.MetadataDirectory).Distinct(StringComparer.Ordinal).ToList();
        bool Eligible(string p) => p is Catalog or ".gitignore" or ".gitattributes" ||
            metadataPaths.Any(dir => ReportNames.Any(name => p == dir + "/" + name)) ||
            projects.Any(project => InProject(p, project, out var local) && CompanionService.SnapshotPath(local));
        var files = state.Changes.Where(c => Eligible(c.Path) && (c.OriginalPath is null || Eligible(c.OriginalPath))).ToList();
        var warnings = Warnings(model);
        var media = Media(model); var managed = await LfsChecks(root, media, ct);
        for (var i = 0; i < media.Count; i++) if (!managed[i])
            throw new CompanionException($"Audio is not managed by Git LFS: {media[i]}. Repair its attributes before Snapshot.");
        foreach (var f in files.Where(f => !f.State.Contains('D'))) ProjectDiscovery.EnsureSafePath(root, Path.Combine(root, f.Path));
        preview?.Invoke(diff, files);
        if (files.Count == 0) return new(false, null, "No changes to Snapshot.", diff, files, state, false, null, warnings);
        if (await git.HasStagedAsync(root, ct)) throw new CompanionException("Another application prepared files during analysis. Review them before retrying.");
        await CheckSets();
        await git.StageAsync(root, files.SelectMany(f => f.OriginalPath is null ? new[] { f.Path } : new[] { f.Path, f.OriginalPath }).Distinct(StringComparer.Ordinal).ToList(), ct);
        await git.VerifyStagedAudioAsync(root, files.Where(f => ProjectDiscovery.IsAudio(f.Path) && !f.State.Contains('D')).Select(f => f.Path).ToList(), ct);
        await CheckSets();
        if (!await git.HasStagedAsync(root, ct)) return new(false, null, "No changes to Snapshot.", diff, files, await git.StateAsync(root, ct), false, null, warnings);
        var hash = await git.CommitAsync(root, message.Trim() + "\n\n" + string.Join("\n", diff.ToText().Split('\n').Take(20)), ct);
        var pushed = false; string? error = null;
        if (push) { try { await git.PushAsync(root, ct); pushed = true; } catch (CompanionException ex) { error = ex.Message; } }
        return new(true, hash, message.Trim(), diff, files, await git.StateAsync(root, ct), pushed, error, warnings);
        async Task CheckSets()
        {
            var now = Discover(root).Select(l => l.SetPath).ToList();
            if (!now.SequenceEqual(hashes.Keys)) throw new CompanionException("The library's Sets changed during analysis. Finish saving and retry; review any prepared files using Git.");
            await Parallel.ForEachAsync(hashes, new ParallelOptions { MaxDegreeOfParallelism = MaxParallelProjects, CancellationToken = ct }, async (entry, token) =>
            {
                if (entry.Value != await CompanionService.Hash(entry.Key, token))
                    throw new CompanionException("A Set changed during library analysis. Finish saving and retry; review any prepared files using Git.");
            });
        }
    }
    public async Task<IReadOnlyList<Diagnostic>> DoctorAsync(string path, CancellationToken ct)
    {
        var checks = new List<Diagnostic>();
        try
        {
            var root = Root(path); await Tools(root, ct); checks.Add(new("PASS", "Git and Git LFS available."));
            var status = await StatusAsync(root, ct);
            checks.Add(new("PASS", $"{status.Library.Sets.Select(s => s.ProjectPath).Distinct().Count()} projects; {status.Library.Sets.Count} ALS Sets readable."));
            var repo = await git.RootAsync(root, ct);
            checks.Add(new(repo is null ? "WARN" : CompanionService.SamePath(root, repo) ? "PASS" : "FAIL", repo is null ? "Run Init with --all." : "Repository root: " + repo));
            checks.Add(new(status.UnmanagedAudio == 0 ? "PASS" : "WARN", $"Audio: {status.LfsAudio} LFS-managed; {status.UnmanagedAudio} unmanaged."));
            if (repo is not null) checks.Add(new(await git.LfsConfiguredAsync(root, ct) ? "PASS" : "WARN", "Repository-local LFS filters " + (await git.LfsConfiguredAsync(root, ct) ? "configured." : "missing; run Init.")));
            checks.Add(new(status.Repository.Remote is null ? "WARN" : "PASS", "Remote: " + (status.Repository.Remote ?? "none; local Snapshots work.")));
            var expected = ModelJson.Serialize(status.Library); var catalogPath = Path.Combine(root, Catalog);
            ProjectDiscovery.EnsureSafePath(root, catalogPath);
            var current = File.Exists(catalogPath) && await File.ReadAllTextAsync(catalogPath, ct) == expected;
            var reportsCurrent = new bool[status.Library.Sets.Count];
            await Parallel.ForEachAsync(Enumerable.Range(0, status.Library.Sets.Count), new ParallelOptions { MaxDegreeOfParallelism = MaxParallelProjects, CancellationToken = ct }, async (i, token) =>
            {
                var set = status.Library.Sets[i]; reportsCurrent[i] = true;
                foreach (var (name, content) in MetadataWriter.Render(set.Model))
                {
                    var file = Path.Combine(root, set.MetadataDirectory, name); ProjectDiscovery.EnsureSafePath(root, file);
                    if (!File.Exists(file) || await File.ReadAllTextAsync(file, token) != content) reportsCurrent[i] = false;
                }
            });
            current &= reportsCurrent.All(c => c);
            checks.Add(new(current ? "PASS" : "WARN", current ? "Library catalog is current." : "Library metadata missing/stale; run Analyse with --all."));
            checks.AddRange(Warnings(status.Library).Select(w => new Diagnostic("WARN", w)));
        }
        catch (CompanionException ex) { checks.Add(new("FAIL", ex.Message)); }
        return checks;
    }
    private async Task<LibraryAnalysis> Write(string root, LibraryModel model, CancellationToken ct)
    {
        var changed = new List<string>();
        var results = new IReadOnlyList<string>[model.Sets.Count];
        await Parallel.ForEachAsync(Enumerable.Range(0, model.Sets.Count), new ParallelOptions { MaxDegreeOfParallelism = MaxParallelProjects, CancellationToken = ct }, async (i, token) =>
        {
            var set = model.Sets[i]; results[i] = await metadata.WriteAsync(root, set.Model, token, set.MetadataDirectory);
        });
        foreach (var result in results) changed.AddRange(result);
        // Remove only our six derived reports in stale hash directories; never delete music or arbitrary files.
        var setsDirectory = Path.Combine(root, ".abletongit", "sets"); ProjectDiscovery.EnsureSafePath(root, setsDirectory);
        if (Directory.Exists(setsDirectory)) foreach (var directory in Directory.EnumerateDirectories(setsDirectory))
        {
            var relative = ProjectDiscovery.Relative(root, directory);
            if (model.Sets.Any(s => s.MetadataDirectory == relative) || !ValidKey(Path.GetFileName(directory))) continue;
            foreach (var name in ReportNames)
            {
                var file = Path.Combine(directory, name); ProjectDiscovery.EnsureSafePath(root, file);
                if (File.Exists(file)) { File.Delete(file); changed.Add(relative + "/" + name); }
            }
        }
        var catalog = Path.Combine(root, Catalog); ProjectDiscovery.EnsureSafePath(root, catalog);
        var content = ModelJson.Serialize(model);
        if (!File.Exists(catalog) || await File.ReadAllTextAsync(catalog, ct) != content)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(catalog)!);
            var temp = catalog + ".tmp"; ProjectDiscovery.EnsureSafePath(root, temp);
            try { await File.WriteAllTextAsync(temp, content, new UTF8Encoding(false), ct); File.Move(temp, catalog, true); }
            finally { if (File.Exists(temp)) File.Delete(temp); }
            changed.Add(Catalog);
        }
        return new(model, changed);
    }
    private async Task<LibraryModel?> Previous(string root, CancellationToken ct)
    {
        var text = await git.PreviousMetadataAsync(root, ct, Catalog);
        if (text is null) return null;
        try
        {
            var result = JsonSerializer.Deserialize<LibraryModel>(text, ModelJson.Options);
            if (result is null || result.SchemaVersion != 1 || result.Sets is null || result.Sets.Any(s => s is null || s.Model is null ||
                !SafeRelative(s.ProjectPath) || !SafeRelative(s.SetPath) || s.MetadataDirectory != MetadataPath(s.SetPath)) ||
                result.Sets.Select(s => s.SetPath).Distinct(StringComparer.Ordinal).Count() != result.Sets.Count)
                throw new CompanionException("Library Snapshot metadata has an unsupported or invalid schema.");
            foreach (var s in result.Sets) ModelJson.Read(ModelJson.Serialize(s.Model));
            return result;
        }
        catch (JsonException ex) { throw new CompanionException("Library Snapshot metadata could not be read.", ex); }
    }
    private static ProjectDiff Compare(LibraryModel? before, LibraryModel after, RepositoryState state)
    {
        var changes = new List<Change>(); var old = before?.Sets.ToDictionary(s => s.SetPath, StringComparer.Ordinal) ?? [];
        foreach (var s in after.Sets)
        {
            old.Remove(s.SetPath, out var previous);
            if (previous is null) changes.Add(new("added", "Set", s.ProjectPath, s.SetPath));
            var diff = SemanticDiff.Compare(previous?.Model, s.Model);
            changes.AddRange(diff.Changes.Where(c => c.Category != "Audio").Select(c => c with { Context = s.SetPath + " / " + c.Context }));
        }
        changes.AddRange(old.Values.Select(s => new Change("removed", "Set", s.ProjectPath, s.SetPath)));
        var oldMedia = before is null ? [] : Media(before); var newMedia = Media(after);
        changes.AddRange(newMedia.Except(oldMedia).Select(p => new Change("added", "Audio", "Library", p)));
        changes.AddRange(oldMedia.Except(newMedia).Select(p => new Change("removed", "Audio", "Library", p)));
        changes.AddRange(state.Changes.Where(c => newMedia.Contains(c.Path) && !c.State.Contains('?') && !c.State.Contains('D') && oldMedia.Contains(c.Path))
            .Select(c => new Change("changed", "Audio", "Library", c.Path)));
        return new(changes);
    }
    private static IReadOnlyList<string> Media(LibraryModel model) => model.Sets.SelectMany(s => s.Model.Project.Media.Select(p => s.ProjectPath == "." ? p : s.ProjectPath + "/" + p)).Distinct(StringComparer.Ordinal).Order(StringComparer.Ordinal).ToList();
    private static IReadOnlyList<string> Warnings(LibraryModel model) => model.Sets.SelectMany(s => s.Model.Warnings.Select(w => s.SetPath + ": " + w)).ToList();
    private static string MetadataPath(string set) => ".abletongit/sets/" + Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(set))).ToLowerInvariant();
    private static bool ValidKey(string value) => value.Length == 64 && value.All(c => c is >= '0' and <= '9' or >= 'a' and <= 'f');
    private static bool SafeRelative(string path) => !string.IsNullOrEmpty(path) && !Path.IsPathRooted(path) && !path.Contains('\\') && !path.Contains(':') && !path.Split('/').Contains("..");
    private static bool InProject(string path, string project, out string local)
    {
        local = project == "." ? path : path.StartsWith(project + "/", StringComparison.Ordinal) ? path[(project.Length + 1)..] : "";
        return local.Length > 0;
    }
    private async Task RequireRepo(string root, CancellationToken ct)
    {
        var repo = await git.RootAsync(root, ct);
        if (repo is null) throw new CompanionException("Run abletongit init --all at the parent folder first.");
        if (!CompanionService.SamePath(root, repo)) throw new CompanionException("--all must target the repository root.");
    }
    private async Task<bool[]> LfsChecks(string root, IReadOnlyList<string> media, CancellationToken ct)
    {
        var results = new bool[media.Count];
        await Parallel.ForEachAsync(Enumerable.Range(0, media.Count), new ParallelOptions { MaxDegreeOfParallelism = MaxParallelProjects, CancellationToken = ct }, async (i, token) =>
            results[i] = await git.IsLfsAsync(root, media[i], token));
        return results;
    }
    private async Task Tools(string root, CancellationToken ct)
    {
        foreach (var lfs in new[] { false, true }) if ((await git.VersionAsync(lfs, root, ct)).ExitCode != 0)
            throw new CompanionException(lfs ? "Install Git LFS before library operations." : "Install Git for Windows before library operations.");
    }
}
