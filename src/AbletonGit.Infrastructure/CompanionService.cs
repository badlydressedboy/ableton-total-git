using System.Text;
using System.Security.Cryptography;
using AbletonGit.Core;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace AbletonGit.Infrastructure;

public sealed record AnalysisResult(ProjectModel Model, IReadOnlyList<string> ChangedFiles);
public sealed record InitResult(AnalysisResult Analysis, IReadOnlyList<string> Changes);
public sealed record ProjectStatus(string Project, string Set, RepositoryState Repository, int LfsAudio, int UnmanagedAudio,
    int ChangedAudio, int NewAudio, int ChangedSets, IReadOnlyList<string> Warnings);
public sealed record SnapshotResult(bool Created, string? Hash, string Message, ProjectDiff Diff, IReadOnlyList<FileChange> Files,
    RepositoryState Repository, bool Pushed, string? PushError, IReadOnlyList<string> Warnings);
public sealed record Diagnostic(string Level, string Message);
public sealed record CompanionUiState(bool Initialized, bool CanInitialize, bool CanPush, RepositoryState Repository);
public sealed record SnapshotPreview(IReadOnlyList<FileChange> Files, int Count);

public sealed class CompanionService(IGitRepository git, ISetReader reader, MetadataWriter metadata, ILogger<CompanionService> logger)
{
    public Task<CompanionUiState> UiStateAsync(string path, CancellationToken ct) =>
        UiState(git, ProjectDiscovery.Discover(path).Root, ".abletongit/project.json", ct);
    internal static async Task<CompanionUiState> UiState(IGitRepository git, string root, string catalog, CancellationToken ct)
    {
        var actual = await git.RootAsync(root, ct);
        var correctRoot = actual is null || SamePath(actual, root);
        var state = await git.StateAsync(root, ct);
        var initialized = correctRoot && state.Exists && await git.LfsConfiguredAsync(root, ct) &&
            File.Exists(Path.Combine(root, ".gitattributes")) && File.Exists(Path.Combine(root, ".gitignore")) &&
            File.Exists(Path.Combine(root, catalog));
        var canPush = correctRoot && state.Exists && state.Remote is not null && state.Upstream is not null &&
            state.Ahead > 0 && state.Branch?.StartsWith("Detached", StringComparison.Ordinal) != true;
        return new(initialized, correctRoot && !initialized, canPush, state);
    }
    public async Task<SnapshotPreview> PreviewAsync(string path, CancellationToken ct)
    {
        var l = ProjectDiscovery.Discover(path); await RequireRepository(l.Root, ct);
        var state = await git.StateAsync(l.Root, ct);
        var model = await reader.ReadAsync(l, ct);
        var generated = MetadataWriter.Render(model).ToDictionary(p => ".abletongit/" + p.Key, p => (string?)p.Value, StringComparer.Ordinal);
        var files = (await git.PreviewGeneratedAsync(l.Root, state.Changes, generated, ct))
            .Where(c => SnapshotPath(c.Path) && (c.OriginalPath is null || SnapshotPath(c.OriginalPath))).ToList();
        return new(files, files.Count);
    }
    public async Task<ProjectModel> ProjectAsync(string path, CancellationToken ct) => await reader.ReadAsync(ProjectDiscovery.Discover(path), ct);
    public async Task<AnalysisResult> AnalyseAsync(string path, CancellationToken ct)
    {
        var location = ProjectDiscovery.Discover(path);
        using var projectLock = Lock(location.Root);
        var model = await reader.ReadAsync(location, ct);
        var changed = await metadata.WriteAsync(location.Root, model, ct);
        logger.LogInformation("Analysed {Project}: {Tracks} tracks, {Clips} clips", model.Project.Name, model.Tracks.Count, model.Clips.Count);
        return new(model, changed);
    }
    public async Task<InitResult> InitAsync(string path, CancellationToken ct)
    {
        var location = ProjectDiscovery.Discover(path);
        await ToolsAsync(location.Root, ct);
        var existing = await git.RootAsync(location.Root, ct);
        if (existing is not null && !SamePath(existing, location.Root))
            throw new CompanionException("This project is inside a larger Git repository. Use a separate project repository before Init.");
        var model = await reader.ReadAsync(location, ct);
        using var projectLock = Lock(location.Root);
        var changes = new List<string>();
        if (existing is null) { await git.InitializeAsync(location.Root, ct); changes.Add("Initialised project repository (main)."); }
        await git.InstallLfsAsync(location.Root, ct);
        changes.Add("Verified/installed repository-local Git LFS filters and hook.");
        var patterns = new[] { "*.wav", "*.aif", "*.aiff", "*.flac", "*.[wW][aA][vV]", "*.[aA][iI][fF]", "*.[aA][iI][fF][fF]", "*.[fF][lL][aA][cC]" };
        if (await AppendLines(location.Root, ".gitattributes", patterns.Select(p => p + " filter=lfs diff=lfs merge=lfs -text").ToList(), ct))
            changes.Add("Added missing audio LFS rules to .gitattributes (including uppercase extensions).");
        if (await AppendLines(location.Root, ".gitignore", ["*.asd", "Backup/", ".DS_Store", "Thumbs.db", "[dD][eE][sS][kK][tT][oO][pP].[iI][nN][iI]", ".abletongit/*.tmp", ".abletongit/operation.lock"], ct))
            changes.Add("Added missing cache, Backup and temporary-file rules to .gitignore.");
        var changed = await metadata.WriteAsync(location.Root, model, ct);
        changes.AddRange(changed.Select(p => "Generated " + p));
        return new(new(model, changed), changes);
    }
    public async Task<ProjectStatus> StatusAsync(string path, CancellationToken ct)
    {
        var location = ProjectDiscovery.Discover(path);
        var model = await reader.ReadAsync(location, ct);
        var state = await git.StateAsync(location.Root, ct);
        var managed = 0;
        if (state.Exists) foreach (var media in model.Project.Media) if (await git.IsLfsAsync(location.Root, media, ct)) managed++;
        return new(model.Project.Name, model.LiveSet.Path, state, managed, model.Project.Media.Count - managed,
            state.Changes.Count(c => ProjectDiscovery.IsAudio(c.Path)),
            state.Changes.Count(c => ProjectDiscovery.IsAudio(c.Path) && (c.State == "??" || c.State.Contains('A'))),
            state.Changes.Count(c => c.Path.EndsWith(".als", StringComparison.OrdinalIgnoreCase)), model.Warnings);
    }
    public async Task<IReadOnlyList<SnapshotEntry>> HistoryAsync(string path, CancellationToken ct)
    {
        var l = ProjectDiscovery.Discover(path); await RequireRepository(l.Root, ct);
        return await git.HistoryAsync(l.Root, ct);
    }
    public async Task<ProjectDiff> DiffAsync(string path, CancellationToken ct)
    {
        var l = ProjectDiscovery.Discover(path); await RequireRepository(l.Root, ct);
        var model = await reader.ReadAsync(l, ct);
        return await Diff(l.Root, model, await git.StateAsync(l.Root, ct), ct);
    }
    public async Task<SnapshotResult> SnapshotAsync(string path, string message, bool push, CancellationToken ct,
        Action<ProjectDiff, IReadOnlyList<FileChange>>? preview = null)
    {
        ValidateMessage(message);
        var l = ProjectDiscovery.Discover(path);
        await RequireRepository(l.Root, ct); await ToolsAsync(l.Root, ct);
        using var projectLock = Lock(l.Root);
        if (!await git.LfsConfiguredAsync(l.Root, ct)) throw new CompanionException("Git LFS filters are missing. Run abletongit init first.");
        if (await git.HasStagedAsync(l.Root, ct)) throw new CompanionException("Files are already prepared in Git. Commit or unstage them using Git before making a Snapshot.");
        var initial = await git.StateAsync(l.Root, ct);
        if (initial.Branch?.StartsWith("Detached", StringComparison.Ordinal) == true || initial.Changes.Any(c => c.State.Contains('U') || c.State is "AA" or "DD"))
            throw new CompanionException("Select a branch and resolve Git conflicts before making a Snapshot.");
        var gitDir = Path.Combine(l.Root, ".git");
        if (new[] { "MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "rebase-merge", "rebase-apply" }.Any(p => File.Exists(Path.Combine(gitDir, p)) || Directory.Exists(Path.Combine(gitDir, p))))
            throw new CompanionException("Finish the Git merge/rebase operation before making a Snapshot.");
        var setHash = await Hash(l.SetPath, ct);
        var model = await reader.ReadAsync(l, ct);
        await metadata.WriteAsync(l.Root, model, ct);
        var state = await git.StateAsync(l.Root, ct);
        var diff = await Diff(l.Root, model, state, ct);
        var files = state.Changes.Where(c => SnapshotPath(c.Path) && (c.OriginalPath is null || SnapshotPath(c.OriginalPath))).ToList();
        var audio = files.Where(c => ProjectDiscovery.IsAudio(c.Path) && !c.State.Contains('D')).Select(c => c.Path).ToList();
        foreach (var media in model.Project.Media)
            if (!await git.IsLfsAsync(l.Root, media, ct)) throw new CompanionException($"Audio is not managed by Git LFS: {media}. Run Init or repair its .gitattributes rule.");
        foreach (var file in files.Where(c => !c.State.Contains('D'))) ProjectDiscovery.EnsureSafePath(l.Root, Path.Combine(l.Root, file.Path));
        preview?.Invoke(diff, files);
        if (files.Count == 0) return new(false, null, "No changes to Snapshot.", diff, files, state, false, null, model.Warnings);
        // A concurrent external Git client must not have prepared unrelated files while analysis ran.
        if (await git.HasStagedAsync(l.Root, ct)) throw new CompanionException("Another application prepared Git files during analysis. Review them before retrying.");
        var paths = files.SelectMany(c => c.OriginalPath is null ? new[] { c.Path } : new[] { c.Path, c.OriginalPath }).Distinct(StringComparer.Ordinal).ToList();
        if (setHash != await Hash(l.SetPath, ct)) throw new CompanionException("The Set changed while it was being analysed. Finish saving in Live and retry.");
        await git.StageAsync(l.Root, paths, ct);
        await git.VerifyStagedAudioAsync(l.Root, audio, ct);
        if (setHash != await Hash(l.SetPath, ct)) throw new CompanionException("The Set changed while preparing the Snapshot. Review prepared files using Git, then retry after saving finishes.");
        if (!await git.HasStagedAsync(l.Root, ct)) return new(false, null, "No changes to Snapshot.", diff, files, await git.StateAsync(l.Root, ct), false, null, model.Warnings);
        ct.ThrowIfCancellationRequested();
        var body = string.Join("\n", diff.ToText().Split('\n').Take(20));
        var hash = await git.CommitAsync(l.Root, message.Trim() + "\n\n" + body, ct);
        logger.LogInformation("Created Snapshot {Hash} for {Project}", hash, model.Project.Name);
        string? pushError = null; var pushed = false;
        if (push)
        {
            try { await git.PushAsync(l.Root, ct); pushed = true; }
            catch (CompanionException ex) { pushError = ex.Message; }
        }
        return new(true, hash, message.Trim(), diff, files, await git.StateAsync(l.Root, ct), pushed, pushError, model.Warnings);
    }
    public async Task PushAsync(string path, CancellationToken ct)
    {
        var l = ProjectDiscovery.Discover(path); await RequireRepository(l.Root, ct);
        using var projectLock = Lock(l.Root); await git.PushAsync(l.Root, ct);
    }
    public async Task<IReadOnlyList<Diagnostic>> DoctorAsync(string path, CancellationToken ct)
    {
        var checks = new List<Diagnostic>();
        foreach (var lfs in new[] { false, true })
        {
            try { var v = await git.VersionAsync(lfs, Environment.CurrentDirectory, ct); checks.Add(new(v.ExitCode == 0 ? "PASS" : "FAIL", v.ExitCode == 0 ? v.Output.Trim() : "Install Git LFS; git lfs version failed.")); }
            catch (CompanionException ex) { checks.Add(new("FAIL", ex.Message)); }
        }
        ProjectLocation l;
        try { l = ProjectDiscovery.Discover(path); checks.Add(new("PASS", "Ableton Project detected: " + Path.GetFileName(l.Root))); checks.Add(new("PASS", $"{l.Sets.Count} ALS Set(s) detected; selected {ProjectDiscovery.Relative(l.Root, l.SetPath)}.")); }
        catch (CompanionException ex) { checks.Add(new("FAIL", ex.Message)); return checks; }
        try
        {
            var model = await reader.ReadAsync(l, ct); checks.Add(new("PASS", "ALS gzip and XML readable."));
            checks.AddRange(model.Warnings.Select(w => new Diagnostic("WARN", w)));
            var rendered = MetadataWriter.Render(model);
            var stale = false;
            foreach (var (name, content) in rendered)
            {
                var file = Path.Combine(l.Root, ".abletongit", name);
                ProjectDiscovery.EnsureSafePath(l.Root, file);
                if (!File.Exists(file) || await File.ReadAllTextAsync(file, ct) != content) stale = true;
            }
            checks.Add(new(stale ? "WARN" : "PASS", stale ? "Metadata is missing or stale. Run abletongit analyse." : "Generated metadata is current."));
        }
        catch (CompanionException ex) { checks.Add(new("FAIL", ex.Message)); }
        checks.Add(new(Directory.Exists(Path.Combine(l.Root, "Samples")) ? "PASS" : "WARN", Directory.Exists(Path.Combine(l.Root, "Samples")) ? "Samples directory found." : "No Samples directory. Use Collect All and Save for portability."));
        try
        {
            var state = await git.StateAsync(l.Root, ct);
            checks.Add(new(state.Exists ? "PASS" : "WARN", state.Exists ? $"Repository: {state.Branch}; {state.Changes.Count} working changes." : "Run abletongit init to enable Snapshots."));
            if (state.Exists)
            {
                var root = await git.RootAsync(l.Root, ct);
                if (root is not null && !SamePath(root, l.Root)) checks.Add(new("FAIL", "Project is inside a larger repository. Snapshots require their own project repository."));
                checks.Add(new(await git.LfsConfiguredAsync(l.Root, ct) ? "PASS" : "WARN", "LFS filters: " + (await git.LfsConfiguredAsync(l.Root, ct) ? "configured" : "missing; run Init")));
                var media = ProjectDiscovery.EnumerateFiles(l.Root, true).Where(ProjectDiscovery.IsAudio).ToList();
                var unmanaged = 0;
                foreach (var file in media) if (!await git.IsLfsAsync(l.Root, ProjectDiscovery.Relative(l.Root, file), ct)) unmanaged++;
                checks.Add(new(unmanaged == 0 ? "PASS" : "WARN", $"Audio LFS rules: {media.Count - unmanaged} managed, {unmanaged} unmanaged."));
                checks.Add(new(state.Remote is null ? "WARN" : "PASS", state.Remote is null ? "No Git remote configured; local Snapshots still work." : "Remote: " + state.Remote));
                if (state.Remote is not null && state.Upstream is null) checks.Add(new("WARN", "No remote tracking branch; configure it using Git before Push."));
            }
        }
        catch (CompanionException ex) { checks.Add(new("FAIL", ex.Message)); }
        return checks;
    }
    public static void ValidateMessage(string message)
    {
        if (string.IsNullOrWhiteSpace(message) || message.Length > 500 || message.Any(char.IsControl))
            throw new CompanionException("Enter a Snapshot description of 1–500 characters on a single line.");
    }
    private async Task<ProjectDiff> Diff(string root, ProjectModel model, RepositoryState state, CancellationToken ct)
    {
        var old = await git.PreviousMetadataAsync(root, ct);
        var semantic = SemanticDiff.Compare(old is null ? null : ModelJson.Read(old), model);
        var changes = semantic.Changes.ToList();
        foreach (var file in state.Changes.Where(c => ProjectDiscovery.IsAudio(c.Path) && !c.State.Contains('?') && !c.State.Contains('D')))
            if (!changes.Any(c => c.Category == "Audio" && c.Description == file.Path)) changes.Add(new("changed", "Audio", "Project", file.Path));
        return new(changes);
    }
    private async Task ToolsAsync(string directory, CancellationToken ct)
    {
        foreach (var lfs in new[] { false, true }) if ((await git.VersionAsync(lfs, directory, ct)).ExitCode != 0)
            throw new CompanionException(lfs ? "Git LFS is unavailable. Install Git LFS before Init or Snapshot." : "Git is unavailable. Install Git.");
    }
    internal static async Task<string> Hash(string path, CancellationToken ct)
    {
        await using var stream = File.OpenRead(path);
        return Convert.ToHexString(await SHA256.HashDataAsync(stream, ct));
    }
    private async Task RequireRepository(string root, CancellationToken ct)
    {
        var gitRoot = await git.RootAsync(root, ct);
        if (gitRoot is null) throw new CompanionException("This project has no Snapshots repository. Run abletongit init first.");
        if (!SamePath(root, gitRoot)) throw new CompanionException("Snapshots require a repository rooted at the Ableton Project, separate from its parent repository.");
    }
    internal static bool SamePath(string a, string b) => string.Equals(Path.TrimEndingDirectorySeparator(a), Path.TrimEndingDirectorySeparator(b), OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal);
    public static bool SnapshotPath(string path) => !path.Split('/').Any(p => p is ".git" or "Backup") &&
        (path.EndsWith(".als", StringComparison.OrdinalIgnoreCase) || ProjectDiscovery.IsAudio(path) ||
         path.StartsWith("Ableton Project Info/", StringComparison.Ordinal) ||
         path is ".gitattributes" or ".gitignore" ||
         path.StartsWith(".abletongit/", StringComparison.Ordinal) && MetadataNames.Contains(path[12..]));
    private static readonly HashSet<string> MetadataNames = new(StringComparer.Ordinal) { "project.json", "tracks.md", "clips.md", "devices.md", "scenes.md", "routing.md" };
    internal static FileStream Lock(string root)
    {
        var dir = Path.Combine(root, ".abletongit"); ProjectDiscovery.EnsureSafePath(root, dir); Directory.CreateDirectory(dir);
        var path = Path.Combine(dir, "operation.lock"); ProjectDiscovery.EnsureSafePath(root, path);
        try { return new FileStream(path, FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None); }
        catch (IOException ex) { throw new CompanionException("Another companion operation is running for this project. Wait for it to finish.", ex); }
    }
    internal static async Task<bool> AppendLines(string root, string name, IReadOnlyList<string> entries, CancellationToken ct)
    {
        var path = Path.Combine(root, name); ProjectDiscovery.EnsureSafePath(root, path);
        var text = File.Exists(path) ? await File.ReadAllTextAsync(path, ct) : "";
        var lines = text.Split('\n').Select(s => s.Trim()).ToHashSet(StringComparer.Ordinal);
        if (name == ".gitattributes")
            foreach (var entry in entries)
            {
                var pattern = entry.Split(' ')[0];
                if (lines.Any(l => l.StartsWith(pattern + " ", StringComparison.Ordinal) && l != entry))
                    throw new CompanionException($"Existing LFS rule for {pattern} differs in .gitattributes. Review it using Git; Init will preserve it.");
            }
        var missing = entries.Where(e => !lines.Contains(e)).ToList();
        if (missing.Count == 0) return false;
        await File.WriteAllTextAsync(path, text + (text.Length > 0 && !text.EndsWith('\n') ? "\n" : "") + string.Join("\n", missing) + "\n", new UTF8Encoding(false), ct);
        return true;
    }
}
public static class CompanionRegistration
{
    public static IServiceCollection AddCompanion(this IServiceCollection services) => services
        .AddSingleton<IProcessRunner, ProcessRunner>().AddSingleton<IGitRepository, GitRepository>()
        .AddSingleton<ISetReader, AlsReader>().AddSingleton<MetadataWriter>().AddSingleton<CompanionService>().AddSingleton<LibraryService>();
}
