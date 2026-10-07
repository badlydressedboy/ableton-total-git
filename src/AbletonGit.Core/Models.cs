using System.Text.Json;

namespace AbletonGit.Core;

public sealed class CompanionException(string message, Exception? inner = null) : Exception(message, inner);
public sealed record ProjectLocation(string Root, string SetPath, IReadOnlyList<string> Sets);
public sealed record ProjectInfo(string Name, IReadOnlyList<string> Sets, IReadOnlyList<string> Media);
public sealed record LiveSetInfo(string Path, string? Creator, string? MajorVersion, string? MinorVersion, double? Tempo);
public sealed record Track(string? Id, int Order, string Name, string Type, string? GroupId);
public sealed record Scene(string? Id, int Order, string Name);
public sealed record Clip(string? Id, int TrackOrder, int Order, string Name, string Type, string Location,
    int? SceneOrder, double? Position, double? Length, double? LoopStart, double? LoopEnd, string? Sample);
public sealed record Macro(string Name, string? Value, IReadOnlyList<string> Targets);
public sealed record Device(string? Id, int TrackOrder, int Order, string Name, string Type, string Category,
    string Chain, string? ChainId, string? ParentId, IReadOnlyList<Macro> Macros);
public sealed record Routing(int TrackOrder, string Kind, string? Target, string? Display);
public sealed record Dependency(string Name, string State);
public sealed record ProjectModel(int SchemaVersion, ProjectInfo Project, LiveSetInfo LiveSet,
    IReadOnlyList<Track> Tracks, IReadOnlyList<Scene> Scenes, IReadOnlyList<Clip> Clips,
    IReadOnlyList<Device> Devices, IReadOnlyList<Routing> Routing, IReadOnlyList<Dependency> Dependencies,
    IReadOnlyList<string> Warnings);
public sealed record Change(string Kind, string Category, string Context, string Description, string? Before = null, string? After = null);
public sealed record ProjectDiff(IReadOnlyList<Change> Changes)
{
    public string ToText() => Changes.Count == 0 ? "No musical changes detected." : string.Join("\n", Changes.Select(c =>
        $"{(c.Kind == "added" ? "+" : c.Kind == "removed" ? "-" : "~")} {c.Category} · {c.Context}: {c.Description}" +
        (c.Before is not null || c.After is not null ? $" ({c.Before ?? "unknown"} → {c.After ?? "unknown"})" : "")));
}
public sealed record ProcessResult(int ExitCode, string Output, string Error);
public interface IProcessRunner
{
    Task<ProcessResult> RunAsync(string executable, IReadOnlyList<string> arguments, string directory,
        CancellationToken cancellationToken = default, TimeSpan? timeout = null, string? input = null);
}
public interface ISetReader { Task<ProjectModel> ReadAsync(ProjectLocation location, CancellationToken cancellationToken = default); }
public sealed record FileChange(string State, string Path, string? OriginalPath = null);
public sealed record SnapshotEntry(string Hash, string Message);
public sealed record RepositoryState(bool Exists, string? Branch, string? Remote, string? Upstream, int? Ahead, int? Behind,
    IReadOnlyList<FileChange> Changes, SnapshotEntry? LastSnapshot);
public interface IGitRepository
{
    Task<ProcessResult> VersionAsync(bool lfs, string directory, CancellationToken ct);
    Task<string?> RootAsync(string directory, CancellationToken ct);
    Task InitializeAsync(string directory, CancellationToken ct);
    Task InstallLfsAsync(string directory, CancellationToken ct);
    Task<bool> LfsConfiguredAsync(string directory, CancellationToken ct);
    Task<RepositoryState> StateAsync(string directory, CancellationToken ct);
    Task<IReadOnlyList<SnapshotEntry>> HistoryAsync(string directory, CancellationToken ct);
    Task<string?> PreviousMetadataAsync(string directory, CancellationToken ct, string metadataPath = ".abletongit/project.json");
    Task<bool> IsLfsAsync(string directory, string path, CancellationToken ct);
    Task<bool> HasStagedAsync(string directory, CancellationToken ct);
    Task StageAsync(string directory, IReadOnlyList<string> paths, CancellationToken ct);
    Task VerifyStagedAudioAsync(string directory, IReadOnlyList<string> paths, CancellationToken ct);
    Task<string> CommitAsync(string directory, string message, CancellationToken ct);
    Task PushAsync(string directory, CancellationToken ct);
}
public static class ModelJson
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web) { WriteIndented = true };
    public static string Serialize<T>(T value) => JsonSerializer.Serialize(value, Options) + "\n";
    public static ProjectModel Read(string value)
    {
        try
        {
            var model = JsonSerializer.Deserialize<ProjectModel>(value, Options);
            if (model is null || model.SchemaVersion != 1 || model.Project is null || model.LiveSet is null ||
                model.Project.Sets is null || model.Project.Media is null || model.Dependencies is null || model.Warnings is null ||
                model.Tracks is null || model.Clips is null || model.Devices is null || model.Scenes is null || model.Routing is null ||
                model.Tracks.Any(t => t is null) || model.Clips.Any(c => c is null) || model.Devices.Any(d => d is null || d.Macros is null) ||
                model.Scenes.Any(s => s is null) || model.Routing.Any(r => r is null))
                throw new CompanionException("Snapshot metadata has an unsupported schema. Keep the original and update AbletonGit.");
            if (model.Clips.Any(c => !model.Tracks.Any(t => t.Order == c.TrackOrder)) ||
                model.Devices.Any(d => !model.Tracks.Any(t => t.Order == d.TrackOrder)) ||
                model.Routing.Any(r => !model.Tracks.Any(t => t.Order == r.TrackOrder)))
                throw new CompanionException("Snapshot metadata contains invalid track references. Repair it before comparing Snapshots.");
            return model;
        }
        catch (JsonException ex) { throw new CompanionException("Snapshot metadata could not be read. Repair it before comparing Snapshots.", ex); }
    }
}
