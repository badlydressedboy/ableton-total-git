using AbletonGit.Core;

namespace AbletonGit.Infrastructure;

public sealed class GitRepository(IProcessRunner runner) : IGitRepository
{
    private Task<ProcessResult> Run(string directory, CancellationToken ct, params string[] args)
        => runner.RunAsync("git", args, directory, ct);
    private async Task<string> Require(string directory, CancellationToken ct, params string[] args)
    {
        var result = await Run(directory, ct, args);
        if (result.ExitCode != 0) throw new CompanionException("Git could not complete the operation. " + result.Error.Trim());
        return result.Output.TrimEnd('\r', '\n');
    }
    public Task<ProcessResult> VersionAsync(bool lfs, string directory, CancellationToken ct)
        => Run(directory, ct, lfs ? ["lfs", "version"] : ["--version"]);
    public async Task<string?> RootAsync(string directory, CancellationToken ct)
    {
        var r = await Run(directory, ct, "rev-parse", "--show-toplevel");
        if (r.ExitCode != 0 && (Directory.Exists(Path.Combine(directory, ".git")) || File.Exists(Path.Combine(directory, ".git"))))
            throw new CompanionException("Git could not read this project's repository. Check ownership and repository integrity using Git. " + r.Error.Trim());
        return r.ExitCode == 0 ? Path.GetFullPath(r.Output.Trim()) : null;
    }
    public async Task InitializeAsync(string directory, CancellationToken ct) => await Require(directory, ct, "init", "--initial-branch=main");
    public async Task ConfigureGitHubRemoteAsync(string directory, string url, CancellationToken ct)
    {
        var clone = GitHubRemote.CloneUrl(url)!;
        var branch = await Run(directory, ct, "symbolic-ref", "--short", "HEAD");
        if (branch.ExitCode != 0) throw new CompanionException("Select a branch in Git before connecting a remote.");
        var name = branch.Output.Trim();
        var origin = await Run(directory, ct, "remote", "get-url", "--push", "origin");
        if (origin.ExitCode == 0 && GitHubRemote.BrowserUrl(origin.Output.Trim()) != GitHubRemote.BrowserUrl(clone))
            throw new CompanionException("origin already points to another repository. Its URL was preserved; change it deliberately using Git.");
        var tracking = await Run(directory, ct, "config", "--get", "branch." + name + ".remote");
        var merge = await Run(directory, ct, "config", "--get", "branch." + name + ".merge");
        if (tracking.ExitCode == 0 && tracking.Output.Trim() != "origin" ||
            merge.ExitCode == 0 && merge.Output.Trim() != "refs/heads/" + name)
            throw new CompanionException("This branch already tracks another destination. Its tracking settings were preserved; configure the remote using Git.");
        if (origin.ExitCode != 0) await Require(directory, ct, "remote", "add", "origin", clone);
        await Require(directory, ct, "config", "branch." + name + ".remote", "origin");
        await Require(directory, ct, "config", "branch." + name + ".merge", "refs/heads/" + name);
        await Require(directory, ct, "config", "branch." + name + ".abletongit-initial-push", "true");
    }
    public async Task InstallLfsAsync(string directory, CancellationToken ct) => await Require(directory, ct, "lfs", "install", "--local");
    public async Task<bool> LfsConfiguredAsync(string directory, CancellationToken ct)
    {
        var result = await Run(directory, ct, "config", "--get", "filter.lfs.clean");
        return result.ExitCode == 0 && result.Output.Contains("git-lfs", StringComparison.Ordinal);
    }
    public async Task<RepositoryState> StateAsync(string directory, CancellationToken ct)
    {
        if (await RootAsync(directory, ct) is null) return new(false, null, null, null, null, null, [], null);
        var status = await Require(directory, ct, "--no-optional-locks", "status", "--porcelain=v1", "-z", "--untracked-files=all");
        var tokens = status.Split('\0', StringSplitOptions.RemoveEmptyEntries);
        var changes = new List<FileChange>();
        for (var i = 0; i < tokens.Length; i++)
        {
            var token = tokens[i];
            if (token.Length < 4) throw new CompanionException("Unable to read Git working changes.");
            var state = token[..2]; var path = token[3..];
            var original = state.Contains('R') || state.Contains('C') ? tokens[++i] : null;
            changes.Add(new(state, path, original));
        }
        var branch = await Run(directory, ct, "symbolic-ref", "--short", "HEAD");
        var remote = await Require(directory, ct, "remote");
        var upstream = await Run(directory, ct, "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}");
        int? ahead = null; int? behind = null;
        if (upstream.ExitCode == 0)
        {
            var count = (await Require(directory, ct, "rev-list", "--left-right", "--count", "HEAD...@{upstream}")).Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
            ahead = int.Parse(count[0], System.Globalization.CultureInfo.InvariantCulture); behind = int.Parse(count[1], System.Globalization.CultureInfo.InvariantCulture);
        }
        var history = await HistoryAsync(directory, ct);
        var initialPush = false;
        if (branch.ExitCode == 0 && upstream.ExitCode != 0)
        {
            var marker = await Run(directory, ct, "config", "--bool", "--get", "branch." + branch.Output.Trim() + ".abletongit-initial-push");
            var configuredRemote = await Run(directory, ct, "config", "--get", "branch." + branch.Output.Trim() + ".remote");
            var configuredMerge = await Run(directory, ct, "config", "--get", "branch." + branch.Output.Trim() + ".merge");
            initialPush = marker.ExitCode == 0 && marker.Output.Trim() == "true" &&
                configuredRemote.Output.Trim() == "origin" && remote.Split('\n').Contains("origin") &&
                configuredMerge.Output.Trim() == "refs/heads/" + branch.Output.Trim();
        }
        var remoteNames = remote.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        string? selectedRemote = null;
        if (branch.ExitCode == 0)
        {
            var configured = await Run(directory, ct, "config", "--get", "branch." + branch.Output.Trim() + ".remote");
            if (configured.ExitCode == 0 && remoteNames.Contains(configured.Output.Trim())) selectedRemote = configured.Output.Trim();
        }
        selectedRemote ??= remoteNames.Contains("origin") ? "origin" : remoteNames.FirstOrDefault();
        string? gitHubUrl = null;
        if (selectedRemote is not null)
        {
            var url = await Run(directory, ct, "remote", "get-url", "--push", "--", selectedRemote);
            if (url.ExitCode == 0) gitHubUrl = GitHubRemote.BrowserUrl(url.Output.Trim());
        }
        return new(true, branch.ExitCode == 0 ? branch.Output.Trim() : "Detached (use Git to select a branch)",
            remote.Length == 0 ? null : string.Join(", ", remote.Split('\n')), upstream.ExitCode == 0 ? upstream.Output.Trim() : null,
            ahead, behind, changes, history.FirstOrDefault(), gitHubUrl, initialPush);
    }
    public async Task<IReadOnlyList<SnapshotEntry>> HistoryAsync(string directory, CancellationToken ct)
    {
        var head = await Run(directory, ct, "rev-parse", "--verify", "HEAD");
        if (head.ExitCode != 0) return [];
        var text = await Require(directory, ct, "log", "-50", "--format=%H%x00%s%x00", "--first-parent");
        var parts = text.Split('\0'); var results = new List<SnapshotEntry>();
        for (var i = 0; i + 1 < parts.Length; i += 2) if (parts[i].Trim().Length > 0) results.Add(new(parts[i].Trim(), parts[i + 1]));
        return results;
    }
    // Overlay the reports Snapshot would write on Git's current changes, without writing files or objects.
    public async Task<IReadOnlyList<FileChange>> PreviewGeneratedAsync(string directory, IReadOnlyList<FileChange> changes,
        IReadOnlyDictionary<string, string?> generated, CancellationToken ct)
    {
        var files = changes.ToDictionary(f => f.Path, StringComparer.Ordinal);
        var head = await Run(directory, ct, "rev-parse", "--verify", "HEAD");
        var blobs = new Dictionary<string, string>(StringComparer.Ordinal);
        if (head.ExitCode == 0)
        {
            var tree = await Require(directory, ct, "ls-tree", "-r", "-z", "HEAD");
            foreach (var entry in tree.Split('\0', StringSplitOptions.RemoveEmptyEntries))
            {
                var tab = entry.IndexOf('\t'); var fields = entry[..tab].Split(' ');
                if (fields[1] == "blob") blobs.Add(entry[(tab + 1)..], fields[2]);
            }
        }
        foreach (var (relative, content) in generated)
        {
            var path = Path.Combine(directory, relative); ProjectDiscovery.EnsureSafePath(directory, path);
            blobs.TryGetValue(relative, out var previous);
            if (content is null)
            {
                files.Remove(relative);
                if (previous is not null) files[relative] = new(" D", relative);
                continue;
            }
            // Unchanged on disk: porcelain already tells us exactly whether Git considers it changed/ignored.
            if (File.Exists(path) && await File.ReadAllTextAsync(path, ct) == content) continue;
            files.Remove(relative);
            if (previous is null)
            {
                var ignored = await Run(directory, ct, "check-ignore", "-q", "--", relative);
                if (ignored.ExitCode > 1) throw new CompanionException("Unable to check ignored preview files.");
                if (ignored.ExitCode == 0) continue;
            }
            var hash = await runner.RunAsync("git", ["hash-object", "--stdin", "--path=" + relative], directory, ct, input: content);
            if (hash.ExitCode != 0) throw new CompanionException("Unable to preview generated reports. " + hash.Error.Trim());
            if (hash.Output.Trim() != previous) files[relative] = new(previous is null ? "??" : " M", relative);
        }
        return files.Values.OrderBy(f => f.Path, StringComparer.Ordinal).ToList();
    }
    public async Task<string?> PreviousMetadataAsync(string directory, CancellationToken ct, string metadataPath = ".abletongit/project.json")
    {
        if ((await Run(directory, ct, "rev-parse", "--verify", "HEAD")).ExitCode != 0) return null;
        var revision = await Require(directory, ct, "--literal-pathspecs", "log", "-1", "--format=%H", "--first-parent", "--", metadataPath);
        if (revision.Length == 0) return null;
        return await Require(directory, ct, "show", revision + ":" + metadataPath);
    }
    public async Task<bool> IsLfsAsync(string directory, string path, CancellationToken ct)
    {
        var output = await Require(directory, ct, "check-attr", "-z", "filter", "--", path);
        var parts = output.Split('\0');
        return parts.Length >= 3 && parts[2] == "lfs";
    }
    public async Task<bool> HasStagedAsync(string directory, CancellationToken ct)
    {
        var result = await Run(directory, ct, "diff", "--cached", "--quiet");
        if (result.ExitCode > 1) throw new CompanionException("Unable to check staged files. " + result.Error.Trim());
        return result.ExitCode == 1;
    }
    public async Task StageAsync(string directory, IReadOnlyList<string> paths, CancellationToken ct)
    {
        if (paths.Count == 0) return;
        var result = await runner.RunAsync("git", ["--literal-pathspecs", "add", "--pathspec-from-file=-", "--pathspec-file-nul"], directory, ct,
            input: string.Join('\0', paths) + "\0");
        if (result.ExitCode != 0) throw new CompanionException("Unable to prepare Snapshot files. " + result.Error.Trim());
    }
    public async Task VerifyStagedAudioAsync(string directory, IReadOnlyList<string> paths, CancellationToken ct)
    {
        foreach (var path in paths)
        {
            var size = await Require(directory, ct, "cat-file", "-s", ":" + path);
            if (!int.TryParse(size, out var bytes) || bytes > 1024)
                throw new CompanionException($"Audio was not stored as an LFS pointer: {path}. Check LFS filters before retrying.");
            var content = await Require(directory, ct, "show", ":" + path);
            if (!content.StartsWith("version https://git-lfs.github.com/spec/v1\n", StringComparison.Ordinal) &&
                !content.StartsWith("version https://git-lfs.github.com/spec/v1\r\n", StringComparison.Ordinal))
                throw new CompanionException($"Audio was not stored as an LFS pointer: {path}. Check LFS filters before retrying.");
        }
    }
    public async Task<string> CommitAsync(string directory, string message, CancellationToken ct)
    {
        await Require(directory, ct, "commit", "-m", message);
        return await Require(directory, ct, "rev-parse", "HEAD");
    }
    public async Task PushAsync(string directory, CancellationToken ct)
    {
        var state = await StateAsync(directory, ct);
        if (state.Remote is null) throw new CompanionException("No remote is configured. Link an existing private repository using Git before Push.");
        if (state.Upstream is null && !state.CanInitialPush) throw new CompanionException("This branch has no remote tracking branch. Configure it with Git before Push.");
        var arguments = state.Upstream is null ? new[] { "push", "--set-upstream", "origin", state.Branch! } : ["push"];
        var result = await runner.RunAsync("git", arguments, directory, ct, TimeSpan.FromMinutes(5));
        if (result.ExitCode != 0) throw new CompanionException("Push failed. Your local Snapshots are still saved. " + result.Error.Trim());
        if (state.CanInitialPush) await Run(directory, ct, "config", "--unset", "branch." + state.Branch + ".abletongit-initial-push");
    }
}
