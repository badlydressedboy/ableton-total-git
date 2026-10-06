using AbletonGit.Core;
using AbletonGit.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

using var cancellation = new CancellationTokenSource();
Console.CancelKeyPress += (_, e) => { e.Cancel = true; cancellation.Cancel(); };
var verbose = args.Contains("--verbose", StringComparer.Ordinal);
try
{
    if (args.Length == 0 || args is ["--help"] or ["help"])
    {
        Console.WriteLine("Ableton Git Companion\nabletongit doctor|init|analyse|status|history|diff|push [--path <project or Set.als>] [--json] [--verbose]\nabletongit snapshot \"description\" [--push] [--path <project or Set.als>] [--json]\nSave the Set in Live first. Use Collect All and Save for portable Snapshots.");
        return 0;
    }
    var command = args[0]; var path = Environment.CurrentDirectory; string? message = null;
    var push = false; var json = false;
    for (var i = 1; i < args.Length; i++)
    {
        switch (args[i])
        {
            case "--path":
                if (++i == args.Length) throw new CompanionException("--path needs a project folder or Set file.");
                path = args[i]; break;
            case "--push": push = true; break;
            case "--json": json = true; break;
            case "--verbose": break;
            default:
                if (command == "snapshot" && message is null && !args[i].StartsWith("--", StringComparison.Ordinal)) message = args[i];
                else throw new CompanionException("Unrecognised argument: " + args[i]);
                break;
        }
    }
    if (push && command != "snapshot") throw new CompanionException("--push is an option for Snapshot only.");
    using var provider = new ServiceCollection().AddLogging(b => b.AddConsole(o => o.LogToStandardErrorThreshold = LogLevel.Trace)
        .SetMinimumLevel(verbose ? LogLevel.Debug : LogLevel.Warning)).AddCompanion().BuildServiceProvider();
    var service = provider.GetRequiredService<CompanionService>(); var ct = cancellation.Token;
    switch (command)
    {
        case "doctor":
            var checks = await service.DoctorAsync(path, ct);
            Print(checks, string.Join("\n", checks.Select(c => c.Level + " " + c.Message)), json);
            return checks.Any(c => c.Level == "FAIL") ? 1 : 0;
        case "init":
            var init = await service.InitAsync(path, ct);
            Print(init, string.Join("\n", init.Changes) + "\n" + Summary(init.Analysis.Model), json); break;
        case "analyse":
            var analysis = await service.AnalyseAsync(path, ct);
            Print(analysis, Summary(analysis.Model) + "\nGenerated .abletongit/project.json and tracks, clips, devices, scenes, routing reports." +
                $"\n{analysis.ChangedFiles.Count} metadata file(s) updated.", json); break;
        case "status":
            var status = await service.StatusAsync(path, ct);
            Print(status, $"Ableton Project: {status.Project}\nSet: {status.Set}\nBranch: {status.Repository.Branch ?? "Run Init"}\nWorking changes: {status.Repository.Changes.Count} files; {status.ChangedAudio} audio ({status.NewAudio} new); {status.ChangedSets} ALS\nAudio: {status.LfsAudio} LFS-managed; {status.UnmanagedAudio} unmanaged\n{Tracking(status.Repository)}\nLast Snapshot: {status.Repository.LastSnapshot?.Message ?? "None"}" +
                (verbose ? "\n" + string.Join("\n", status.Repository.Changes.Select(c => c.State + " " + c.Path)) : "") + "\n" + string.Join("\n", status.Warnings), json); break;
        case "history":
            var history = await service.HistoryAsync(path, ct);
            Print(history, history.Count == 0 ? "No Snapshots yet." : string.Join("\n", history.Select(h => h.Hash[..7] + "  " + h.Message)), json); break;
        case "diff":
            var diff = await service.DiffAsync(path, ct); Print(diff, diff.ToText(), json); break;
        case "snapshot":
            if (message is null) throw new CompanionException("Supply a musical description: abletongit snapshot \"Added dub bass variation\".");
            var snapshot = await service.SnapshotAsync(path, message, push, ct,
                json ? null : (diff, files) => Console.WriteLine(diff.ToText() + $"\nSnapshot files: {files.Count}"));
            Print(snapshot, (snapshot.Created ? $"Snapshot saved: {snapshot.Hash}\n{Tracking(snapshot.Repository)}" +
                (snapshot.Pushed ? "\nPushed." : "") + (snapshot.PushError is null ? "" : "\n" + snapshot.PushError) : snapshot.Message) +
                "\n" + string.Join("\n", snapshot.Warnings), json);
            return snapshot.PushError is null ? 0 : 1;
        case "push":
            await service.PushAsync(path, ct); Print(new { pushed = true }, "Snapshots pushed.", json); break;
        default: throw new CompanionException("Unknown command. Run abletongit --help.");
    }
    return 0;
}
catch (OperationCanceledException) { Console.Error.WriteLine("Operation cancelled. Check Status before retrying; files prepared by Git may remain staged."); return 130; }
catch (Exception ex) when (ex is CompanionException or IOException or UnauthorizedAccessException)
{ Console.Error.WriteLine(verbose ? ex.ToString() : ex.Message); return 1; }

static void Print<T>(T data, string text, bool json) => Console.WriteLine(json ? ModelJson.Serialize(data).TrimEnd() : text);
static string Summary(ProjectModel m) => $"Project: {m.Project.Name}\nTracks: {m.Tracks.Count}\nScenes: {m.Scenes.Count}\nAudio clips: {m.Clips.Count(c => c.Type == "AudioClip")}\nMIDI clips: {m.Clips.Count(c => c.Type == "MidiClip")}\nDevices: {m.Devices.Count}\n" + string.Join("\n", m.Warnings);
static string Tracking(RepositoryState s) => s.Upstream is null ? "Remote tracking is not configured; unpushed count is unknown." : $"Snapshots: {s.Ahead} ahead, {s.Behind} behind {s.Upstream} (last known remote state).";
