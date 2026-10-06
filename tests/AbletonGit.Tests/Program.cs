using System.IO.Compression;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Xml.Linq;
using AbletonGit.Api;
using AbletonGit.Core;
using AbletonGit.Infrastructure;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

if (args is ["--process-child", var behavior])
{
    Console.WriteLine("child stdout"); Console.Error.WriteLine("child stderr");
    if (behavior == "wait") await Task.Delay(TimeSpan.FromSeconds(20));
    return 42;
}

// Dependency-free executable test suite. Every failure produces a nonzero exit code.
var tests = new List<(string Name, Func<Task> Run)>();
void Test(string name, Func<Task> run) => tests.Add((name, run));
var runner = new ProcessRunner(NullLogger<ProcessRunner>.Instance);
var git = new GitRepository(runner);
var reader = new AlsReader();
CompanionService Service(IProcessRunner? process = null) => new(new GitRepository(process ?? runner), reader, new(), NullLogger<CompanionService>.Instance);

Test("ALS extraction, session membership, racks, macros, routing and master", async () =>
{
    using var p = new Fixture(); var m = await reader.ReadAsync(p.Location);
    Check(m.LiveSet.Tempo == 128 && m.LiveSet.Creator == "Ableton Live 12.3", "Live version / tempo");
    Check(m.Tracks.Count == 3 && m.Tracks[0].Name == "Bass" && m.Tracks[1].Type == "ReturnTrack", "tracks");
    Check(m.Scenes.Single().Name == "Dub Breakdown", "scenes");
    Check(m.Clips.Count == 2 && m.Clips[0].SceneOrder == 0 && m.Clips[0].Length == 8, "session audio");
    Check(m.Clips[1].Location == "Arrangement" && m.Clips[1].Position == 16, "arrangement MIDI");
    Check(m.Devices.Count == 4 && m.Devices.Any(d => d.Name == "Echo" && d.ParentId == "10" && d.Chain.Contains("Dub")), "rack chain");
    Check(m.Devices[0].Macros.Single().Targets.Single() == "99", "macro mapping");
    Check(m.Routing.Single().Display == "Master", "routing");
    Check(m.Dependencies.Single().State == "local", "local sample");
});
Test("Live 11 MasterTrack and unknown XML/device tags", async () =>
{
    using var p = new Fixture();
    var xml = Fixture.Xml().Replace("MainTrack", "MasterTrack").Replace("<Echo Id=\"11\" />", "<UnreleasedSynth Id=\"11\"><FutureValue Value=\"x\" /></UnreleasedSynth>");
    await p.Save(xml); var m = await reader.ReadAsync(p.Location);
    Check(m.Tracks.Last().Type == "MasterTrack" && m.LiveSet.Tempo == 128, "master variation");
    Check(m.Devices.Any(d => d.Type == "UnreleasedSynth" && d.Category == "Unknown"), "unknown device preserved");
});
foreach (var (name, text, gzip) in new[]
{
    ("invalid gzip", "not gzip", false), ("malformed XML", "<Ableton><LiveSet>", true),
    ("missing LiveSet", "<Ableton><Future /></Ableton>", true),
    ("DTD disabled", "<!DOCTYPE Ableton [<!ENTITY x SYSTEM 'file:///secret'>]><Ableton>&x;</Ableton>", true)
}) Test(name, async () => { using var p = new Fixture(); await p.Save(text, gzip); await Throws<CompanionException>(() => reader.ReadAsync(p.Location)); });
Test("corrupt compressed payload", async () =>
{
    using var p = new Fixture(); await File.WriteAllBytesAsync(p.Set, [0x1f, 0x8b, 1, 2, 3, 4]);
    await Throws<CompanionException>(() => reader.ReadAsync(p.Location));
});
Test("external/missing media, no absolute path leaks", async () =>
{
    using var p = new Fixture();
    await p.Save(Fixture.Xml().Replace("<RelativePath Value=\"Samples/Imported/bass.wav\" />", "<Path Value=\"C:/Private Music/Library/bass.wav\" />"));
    var m = await reader.ReadAsync(p.Location);
    Check(m.Dependencies.Single().State == "external" && !ModelJson.Serialize(m).Contains("Private Music"), "redacted external path");
    await p.Save(Fixture.Xml().Replace("bass.wav", "missing.wav"));
    Check((await reader.ReadAsync(p.Location)).Dependencies.Single().State == "missing", "missing sample");
});
Test("discovery from folder, ALS, nested samples with Unicode and spaces", () =>
{
    using var p = new Fixture();
    foreach (var path in new[] { p.Root, p.Set, Path.Combine(p.Root, "Samples", "Imported") }) Check(ProjectDiscovery.Discover(path).Root == p.Root, path);
    return Task.CompletedTask;
});
Test("multiple Sets require explicit selection; backups excluded", async () =>
{
    using var p = new Fixture(); var other = Path.Combine(p.Root, "Other.als"); File.Copy(p.Set, other);
    await Throws<CompanionException>(() => Task.FromResult(ProjectDiscovery.Discover(p.Root)));
    Check(ProjectDiscovery.Discover(other).SetPath == other, "explicit selection");
    Directory.CreateDirectory(Path.Combine(p.Root, "Backup")); File.Copy(p.Set, Path.Combine(p.Root, "Backup", "Old.als"));
    Check(ProjectDiscovery.Discover(p.Set).Sets.Count == 2, "backup exclusion");
});
Test("deterministic metadata, stable order, ALS remains byte-identical", async () =>
{
    using var p = new Fixture(); var bytes = await File.ReadAllBytesAsync(p.Set);
    var s = Service(); var first = await s.AnalyseAsync(p.Root, default);
    var contents = MetadataWriter.Render(first.Model); var second = await s.AnalyseAsync(p.Root, default);
    Check(second.ChangedFiles.Count == 0 && contents.SequenceEqual(MetadataWriter.Render(second.Model)), "determinism");
    var afterBytes = await File.ReadAllBytesAsync(p.Set);
    Check(bytes.SequenceEqual(afterBytes), "ALS read-only");
    Check(!contents["project.json"].Contains(p.Root) && contents.Count == 6, "portable reports");
});
Test("schema round-trip and rejection", async () =>
{
    using var p = new Fixture(); var m = await reader.ReadAsync(p.Location);
    Check(ModelJson.Serialize(ModelJson.Read(ModelJson.Serialize(m))) == ModelJson.Serialize(m), "round trip");
    await Throws<CompanionException>(() => Task.FromResult(ModelJson.Read("{\"schemaVersion\":999}")));
});
foreach (var category in new[] { "Track", "Clip", "Device", "Scene" })
    foreach (var kind in new[] { "added", "removed" }) Test($"semantic {category} {kind}", async () =>
    {
        using var p = new Fixture(); var m = await reader.ReadAsync(p.Location);
        var less = category switch
        {
            "Track" => m with { Tracks = m.Tracks.Take(2).ToList(), Devices = m.Devices.Where(d => d.TrackOrder != 2).ToList() },
            "Clip" => m with { Clips = m.Clips.Take(1).ToList() },
            "Device" => m with { Devices = m.Devices.Take(3).ToList() },
            _ => m with { Scenes = [] }
        };
        var d = kind == "added" ? SemanticDiff.Compare(less, m) : SemanticDiff.Compare(m, less);
        Check(d.Changes.Any(c => c.Category == category && c.Kind == kind), d.ToText());
    });
Test("semantic routing, rename, tempo and unchanged model", async () =>
{
    using var p = new Fixture(); var m = await reader.ReadAsync(p.Location);
    Check(SemanticDiff.Compare(m, m).Changes.Count == 0, "unchanged");
    var next = m with { Routing = [m.Routing[0] with { Target = "track:2", Display = "Bass Bus" }],
        Tracks = m.Tracks.Select(t => t.Order == 0 ? t with { Name = "Dub Bass" } : t).ToList(), LiveSet = m.LiveSet with { Tempo = 130 } };
    var d = SemanticDiff.Compare(m, next);
    Check(d.Changes.Any(c => c.Category == "Routing" && c.Before!.Contains("Master") && c.After!.Contains("Bass Bus")), d.ToText());
    Check(d.Changes.Any(c => c.Category == "Track" && c.Kind == "changed") && !d.Changes.Any(c => c.Kind == "added"), "rename uses ID");
    Check(d.Changes.Any(c => c.Category == "Tempo"), "tempo");
});
Test("duplicate device IDs retain all changes", async () =>
{
    using var p = new Fixture(); var m = await reader.ReadAsync(p.Location);
    var next = m with { Devices = m.Devices.Concat([m.Devices[0]]).ToList() };
    Check(SemanticDiff.Compare(m, next).Changes.Any(c => c.Category == "Device" && c.Kind == "added"), "duplicate retained");
});
Test("nested clip slots preserve the second scene position", async () =>
{
    using var p = new Fixture();
    var doc = XDocument.Parse(Fixture.Xml());
    var slot = doc.Descendants("ClipSlotList").Single().Elements().Single();
    var duplicate = new XElement(slot); duplicate.SetAttributeValue("Id", "1");
    duplicate.Descendants("AudioClip").Single().SetAttributeValue("Id", "17"); slot.AddAfterSelf(duplicate);
    await p.Save(doc.ToString());
    var m = await reader.ReadAsync(p.Location);
    Check(m.Clips.Where(c => c.Type == "AudioClip").Select(c => c.SceneOrder).SequenceEqual(new int?[] { 0, 1 }), "slot positions");
});
Test("clip length and device macro diffs expose values", async () =>
{
    using var p = new Fixture(); var m = await reader.ReadAsync(p.Location);
    var next = m with { Clips = m.Clips.Select(c => c with { Length = 16 }).ToList(),
        Devices = m.Devices.Select(d => d.Macros.Count > 0 ? d with { Macros = [d.Macros[0] with { Value = "100" }] } : d).ToList() };
    var diff = SemanticDiff.Compare(m, next);
    Check(diff.Changes.Any(c => c.Description.Contains("Length") && c.Before == "8" && c.After == "16"), "musical values");
    Check(diff.Changes.Any(c => c.Description.Contains("Macros") && c.After!.Contains("100")), "macro values");
});
Test("track reorder keeps clip/device identity and main track", async () =>
{
    using var p = new Fixture(); var m = await reader.ReadAsync(p.Location);
    var reordered = m with { Tracks = m.Tracks.Select(t => t with { Order = 2 - t.Order }).Reverse().ToList(),
        Clips = m.Clips.Select(c => c with { TrackOrder = 2 - c.TrackOrder }).ToList(),
        Devices = m.Devices.Select(d => d with { TrackOrder = 2 - d.TrackOrder }).ToList(),
        Routing = m.Routing.Select(r => r with { TrackOrder = 2 - r.TrackOrder }).ToList() };
    var diff = SemanticDiff.Compare(m, reordered);
    Check(diff.Changes.All(c => c.Kind == "changed" && c.Category == "Track"), diff.ToText());
});
Test("process runner captures output, errors and exit status", async () =>
{
    using var p = new Fixture();
    var r = await runner.RunAsync("dotnet", [typeof(Fixture).Assembly.Location, "--process-child", "exit"], p.Root);
    Check(r.ExitCode == 42 && r.Output.Contains("child stdout") && r.Error.Contains("child stderr"), "process result");
});
Test("process runner cancels a running child", async () =>
{
    using var p = new Fixture(); using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(500));
    await Throws<OperationCanceledException>(() => runner.RunAsync("dotnet", [typeof(Fixture).Assembly.Location, "--process-child", "wait"], p.Root, cts.Token));
});
Test("process runner enforces timeout", async () =>
{
    using var p = new Fixture();
    await Throws<CompanionException>(() => runner.RunAsync("dotnet", [typeof(Fixture).Assembly.Location, "--process-child", "wait"], p.Root, timeout: TimeSpan.FromMilliseconds(500)));
});
Test("missing Git and missing Git LFS actionable", async () =>
{
    using var p = new Fixture();
    foreach (var missing in new[] { "git", "lfs" })
    {
        var s = Service(new FaultRunner(runner, missing));
        await Throws<CompanionException>(() => s.InitAsync(p.Root, default));
        Check(!Directory.Exists(Path.Combine(p.Root, ".git")), "failed tool checks do not initialise");
    }
    await Throws<CompanionException>(() => runner.RunAsync("abletongit-nonexistent-executable", [], p.Root));
});
Test("Git init, LFS config, preservation, snapshot, history, no changes, status", async () =>
{
    using var p = new Fixture(); var s = Service();
    await File.WriteAllTextAsync(Path.Combine(p.Root, ".gitignore"), "custom-cache/\n");
    await File.WriteAllTextAsync(Path.Combine(p.Root, ".gitattributes"), "*.txt text\n");
    Check(await git.RootAsync(p.Root, default) is null, "no repo");
    await s.InitAsync(p.Root, default); await p.Identity(runner);
    Check(await git.RootAsync(p.Root, default) == p.Root && await git.LfsConfiguredAsync(p.Root, default), "repo and LFS");
    Check((await File.ReadAllTextAsync(Path.Combine(p.Root, ".gitignore"))).StartsWith("custom-cache/"), "ignore preservation");
    Check((await File.ReadAllTextAsync(Path.Combine(p.Root, ".gitattributes"))).StartsWith("*.txt text"), "attributes preservation");
    var attributes = await File.ReadAllTextAsync(Path.Combine(p.Root, ".gitattributes")); await s.InitAsync(p.Root, default);
    Check(attributes == await File.ReadAllTextAsync(Path.Combine(p.Root, ".gitattributes")), "idempotent init");
    await File.WriteAllTextAsync(Path.Combine(p.Root, "unrelated-secret.txt"), "not part of snapshot");
    var snap = await s.SnapshotAsync(p.Root, "Initial warped stems", false, default);
    Check(snap.Created && snap.Hash?.Length == 40, "snapshot");
    Check((await git.HistoryAsync(p.Root, default)).Single().Message == "Initial warped stems", "history");
    Check(await git.IsLfsAsync(p.Root, "Samples/Imported/bass.wav", default), "LFS rule");
    await git.VerifyStagedAudioAsync(p.Root, ["Samples/Imported/bass.wav"], default);
    var status = await s.StatusAsync(p.Root, default);
    Check(status.LfsAudio == 1 && status.Repository.Changes.Single().Path == "unrelated-secret.txt", "selective staging");
    Check(!(await s.SnapshotAsync(p.Root, "Nothing changed", false, default)).Created, "no changes");
    Check((await s.DiffAsync(p.Root, default)).Changes.Count == 0, "baseline diff");
    var checks = await s.DoctorAsync(p.Root, default); Check(checks.All(c => c.Level != "FAIL"), "doctor");
});
Test("semantic history baseline survives repeated analysis; changed/deleted audio", async () =>
{
    using var p = new Fixture(); var s = Service(); await s.InitAsync(p.Root, default); await p.Identity(runner);
    await s.SnapshotAsync(p.Root, "First", false, default);
    await p.Save(Fixture.Xml().Replace("Bass Clean", "Bass Dub").Replace("Dub Breakdown", "Deep Breakdown"));
    await File.WriteAllBytesAsync(p.Audio, [2, 3, 4]);
    await s.AnalyseAsync(p.Root, default); await s.AnalyseAsync(p.Root, default);
    var diff = await s.DiffAsync(p.Root, default);
    Check(diff.Changes.Any(c => c.Category == "Clip" && c.Kind == "changed") && diff.Changes.Any(c => c.Category == "Audio" && c.Kind == "changed"), diff.ToText());
    await s.SnapshotAsync(p.Root, "Variation", false, default);
    File.Delete(p.Audio);
    Check((await s.DiffAsync(p.Root, default)).Changes.Any(c => c.Category == "Audio" && c.Kind == "removed"), "deleted audio");
    await s.SnapshotAsync(p.Root, "Removed audio", false, default);
    Check((await s.HistoryAsync(p.Root, default)).Count == 3, "three snapshots");
});
Test("uppercase and literal Unicode audio paths use LFS", async () =>
{
    using var p = new Fixture(); var s = Service();
    await File.WriteAllBytesAsync(Path.Combine(p.Root, "Samples", "Imported", "音 [bass].WAV"), [1, 2, 3]);
    await s.InitAsync(p.Root, default); await p.Identity(runner);
    Check((await s.SnapshotAsync(p.Root, "Audio", false, default)).Created, "uppercase snapshot");
    await git.VerifyStagedAudioAsync(p.Root, ["Samples/Imported/音 [bass].WAV"], default);
});
Test("existing staged files are preserved and rejected", async () =>
{
    using var p = new Fixture(); var s = Service(); await s.InitAsync(p.Root, default); await p.Identity(runner);
    await File.WriteAllTextAsync(Path.Combine(p.Root, "private.txt"), "private");
    await git.StageAsync(p.Root, ["private.txt"], default);
    await Throws<CompanionException>(() => s.SnapshotAsync(p.Root, "Should fail", false, default));
    Check(await git.HasStagedAsync(p.Root, default) && (await git.HistoryAsync(p.Root, default)).Count == 0, "index preserved");
});
Test("commit failure retains prepared files and never pushes", async () =>
{
    using var p = new Fixture(); var s = Service(new FaultRunner(runner, "commit"));
    await s.InitAsync(p.Root, default); await p.Identity(runner);
    await Throws<CompanionException>(() => s.SnapshotAsync(p.Root, "Failure", true, default));
    Check(await git.HasStagedAsync(p.Root, default) && (await git.HistoryAsync(p.Root, default)).Count == 0, "no snapshot on failed commit");
});
Test("analysis failure never stages or commits", async () =>
{
    using var p = new Fixture(); var s = Service(); await s.InitAsync(p.Root, default); await p.Identity(runner);
    await p.Save("broken", false);
    await Throws<CompanionException>(() => s.SnapshotAsync(p.Root, "Failure", false, default));
    Check(!await git.HasStagedAsync(p.Root, default), "no stage");
});
Test("snapshot cancellation", async () =>
{
    using var p = new Fixture(); var s = Service(); await s.InitAsync(p.Root, default);
    using var cts = new CancellationTokenSource(); cts.Cancel();
    await Throws<OperationCanceledException>(() => s.SnapshotAsync(p.Root, "Cancelled", false, cts.Token));
    Check(!await git.HasStagedAsync(p.Root, default), "no stage on cancellation");
});
Test("unmanaged audio blocks snapshot", async () =>
{
    using var p = new Fixture(); var s = Service(); await s.InitAsync(p.Root, default); await p.Identity(runner);
    await File.WriteAllTextAsync(Path.Combine(p.Root, "Samples", ".gitattributes"), "*.wav -filter\n");
    await Throws<CompanionException>(() => s.SnapshotAsync(p.Root, "Unsafe audio", false, default));
    Check(!await git.HasStagedAsync(p.Root, default), "no stage on unmanaged audio");
});
Test("conflicting attributes are not overwritten", async () =>
{
    using var p = new Fixture(); var s = Service(); await File.WriteAllTextAsync(Path.Combine(p.Root, ".gitattributes"), "*.wav -filter\n");
    await Throws<CompanionException>(() => s.InitAsync(p.Root, default));
    Check(await File.ReadAllTextAsync(Path.Combine(p.Root, ".gitattributes")) == "*.wav -filter\n", "preserve rule");
});
Test("ancestor repository cannot be modified by Init", async () =>
{
    using var p = new Fixture(); var parent = Path.GetDirectoryName(p.Root)!; await git.InitializeAsync(parent, default);
    await Throws<CompanionException>(() => Service().InitAsync(p.Root, default));
    Check(!Directory.Exists(Path.Combine(p.Root, ".git")), "no nested repo created");
});
Test("project operation lock excludes overlapping writers", async () =>
{
    using var p = new Fixture(); var dir = Path.Combine(p.Root, ".abletongit"); Directory.CreateDirectory(dir);
    using var held = new FileStream(Path.Combine(dir, "operation.lock"), FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None);
    await Throws<CompanionException>(() => Service().AnalyseAsync(p.Root, default));
});
Test("concurrent Save prevents committing inconsistent metadata", async () =>
{
    using var p = new Fixture(); var s = Service(); await s.InitAsync(p.Root, default); await p.Identity(runner);
    await Throws<CompanionException>(() => s.SnapshotAsync(p.Root, "Concurrent save", false, default,
        (_, _) => p.Save(Fixture.Xml().Replace("Bass Clean", "Saved during snapshot")).GetAwaiter().GetResult()));
    Check(!await git.HasStagedAsync(p.Root, default), "no stage of inconsistent metadata");
});
Test("ongoing merge blocks a Snapshot", async () =>
{
    using var p = new Fixture(); var s = Service(); await s.InitAsync(p.Root, default); await p.Identity(runner);
    await File.WriteAllTextAsync(Path.Combine(p.Root, ".git", "MERGE_HEAD"), new string('0', 40));
    await Throws<CompanionException>(() => s.SnapshotAsync(p.Root, "Blocked", false, default));
});
Test("CLI command surface returns parseable structured results", async () =>
{
    using var p = new Fixture();
    var config = new DirectoryInfo(AppContext.BaseDirectory).Parent!.Name;
    var cli = Path.GetFullPath($"../../../../../src/AbletonGit.Cli/bin/{config}/net10.0/abletongit.dll", AppContext.BaseDirectory);
    foreach (var command in new[] { "init", "doctor", "analyse", "status", "diff", "snapshot", "history" })
    {
        if (command == "snapshot") await p.Identity(runner);
        var arguments = new List<string> { cli, command };
        if (command == "snapshot") arguments.Add("CLI Snapshot");
        arguments.AddRange(["--path", p.Root, "--json"]);
        var r = await runner.RunAsync("dotnet", arguments, p.Root);
        Check(r.ExitCode == 0, r.Error); using var parsed = System.Text.Json.JsonDocument.Parse(r.Output);
    }
    var push = await runner.RunAsync("dotnet", [cli, "push", "--path", p.Root], p.Root);
    Check(push.ExitCode == 1 && push.Error.Contains("remote"), "friendly missing remote");
});
Test("literal commit description cannot execute shell commands", async () =>
{
    using var p = new Fixture(); var s = Service(); await s.InitAsync(p.Root, default); await p.Identity(runner);
    var message = "Dub; echo injected > injected.txt & $(whoami)";
    await s.SnapshotAsync(p.Root, message, false, default);
    Check((await git.HistoryAsync(p.Root, default)).Single().Message == message && !File.Exists(Path.Combine(p.Root, "injected.txt")), "literal message");
    await Throws<CompanionException>(() => s.SnapshotAsync(p.Root, "Bad\nmessage", false, default));
});
Test("push errors report saved local snapshot", async () =>
{
    using var p = new Fixture(); var s = Service(); await s.InitAsync(p.Root, default); await p.Identity(runner);
    var result = await s.SnapshotAsync(p.Root, "Saved locally", true, default);
    Check(result.Created && result.PushError is not null && !result.Pushed, "local snapshot survives");
});
Test("push to a local bare remote and ahead/behind", async () =>
{
    using var p = new Fixture(); var s = Service(); await s.InitAsync(p.Root, default); await p.Identity(runner);
    await s.SnapshotAsync(p.Root, "First", false, default);
    var remote = Path.Combine(Path.GetDirectoryName(p.Root)!, "remote.git");
    await p.Git(runner, "init", "--bare", remote); await p.Git(runner, "remote", "add", "origin", remote);
    await p.Git(runner, "push", "--set-upstream", "origin", "main");
    await p.Save(Fixture.Xml().Replace("Bass Clean", "Bass Dub"));
    var result = await s.SnapshotAsync(p.Root, "Second", false, default);
    Check(result.Repository.Ahead == 1 && result.Repository.Behind == 0, "ahead count");
    await s.PushAsync(p.Root, default); Check((await s.StatusAsync(p.Root, default)).Repository.Ahead == 0, "push");
});
Test("HTTP loopback, token, origin, validation, structured endpoints and snapshot", async () =>
{
    using var p = new Fixture(); var s = Service(); await s.InitAsync(p.Root, default); await p.Identity(runner);
    var token = new string('a', 64); await using var app = ApiHost.Create(p.Root, token, 0); await app.StartAsync();
    try
    {
        var addresses = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses;
        Check(addresses.Count == 1 && addresses.Single().StartsWith("http://127.0.0.1:", StringComparison.Ordinal), "loopback only");
        using var client = new HttpClient { BaseAddress = new(addresses.Single()) };
        Check((await client.GetAsync("/api/status")).StatusCode == HttpStatusCode.Unauthorized, "token required");
        client.DefaultRequestHeaders.Add("X-AbletonGit-Token", token);
        foreach (var endpoint in new[] { "status", "project", "history", "diff" }) Check((await client.GetAsync("/api/" + endpoint)).IsSuccessStatusCode, endpoint);
        var origin = new HttpRequestMessage(HttpMethod.Post, "/api/push"); origin.Headers.Add("Origin", "https://hostile.example");
        Check((await client.SendAsync(origin)).StatusCode == HttpStatusCode.Forbidden, "origin blocked");
        var rebound = new HttpRequestMessage(HttpMethod.Get, "/api/status"); rebound.Headers.Host = "hostile.example";
        Check((await client.SendAsync(rebound)).StatusCode == HttpStatusCode.Forbidden, "rebound host blocked");
        Check((await client.PostAsJsonAsync("/api/snapshot", new { message = "" })).StatusCode == HttpStatusCode.BadRequest, "empty description");
        var unknown = await client.PostAsJsonAsync("/api/snapshot", new { message = "Test", command = "git reset --hard" });
        Check(unknown.StatusCode == HttpStatusCode.BadRequest, "arbitrary commands rejected");
        Check((await client.PostAsync("/api/analyse", null)).IsSuccessStatusCode, "analyse endpoint");
        var response = await client.PostAsJsonAsync("/api/snapshot", new { message = "API Snapshot", push = false });
        Check(response.IsSuccessStatusCode && (await response.Content.ReadAsStringAsync()).Contains("\"created\":true"), "snapshot JSON");
        Check((await git.HistoryAsync(p.Root, default)).Single().Message == "API Snapshot", "snapshot endpoint committed");
    }
    finally { await app.StopAsync(); }
});

var failed = 0;
foreach (var (name, run) in tests)
{
    try { await run(); Console.WriteLine("PASS " + name); }
    catch (Exception ex) { failed++; Console.Error.WriteLine("FAIL " + name + "\n" + ex); }
}
Console.WriteLine($"{tests.Count - failed}/{tests.Count} tests passed.");
return failed == 0 ? 0 : 1;

static void Check(bool condition, string detail) { if (!condition) throw new InvalidOperationException(detail); }
static async Task Throws<T>(Func<Task> action) where T : Exception
{
    try { await action(); } catch (T) { return; }
    throw new InvalidOperationException("Expected " + typeof(T).Name);
}

sealed class FaultRunner(IProcessRunner inner, string fault) : IProcessRunner
{
    public Task<ProcessResult> RunAsync(string executable, IReadOnlyList<string> arguments, string directory,
        CancellationToken cancellationToken = default, TimeSpan? timeout = null, string? input = null)
    {
        if (fault == "git" && arguments.Contains("--version") || fault == "lfs" && arguments.SequenceEqual(new[] { "lfs", "version" }) || fault == "commit" && arguments.Contains("commit"))
            return Task.FromResult(new ProcessResult(1, "", "Synthetic " + fault + " failure"));
        return inner.RunAsync(executable, arguments, directory, cancellationToken, timeout, input);
    }
}
sealed class Fixture : IDisposable
{
    private readonly string container = Path.Combine(Path.GetTempPath(), "AbletonGit-tests-" + Guid.NewGuid().ToString("N"));
    public string Root { get; }
    public string Set => Path.Combine(Root, "Dub 音.als");
    public string Audio => Path.Combine(Root, "Samples", "Imported", "bass.wav");
    public ProjectLocation Location => ProjectDiscovery.Discover(Set);
    public Fixture()
    {
        Root = Path.Combine(container, "Project with spaces 音");
        Directory.CreateDirectory(Path.Combine(Root, "Ableton Project Info")); Directory.CreateDirectory(Path.GetDirectoryName(Audio)!);
        File.WriteAllBytes(Audio, [0, 1, 2, 3]); Save(Xml()).GetAwaiter().GetResult();
    }
    public async Task Save(string xml, bool gzip = true)
    {
        await using var stream = File.Create(Set);
        if (gzip) { await using var zipped = new GZipStream(stream, CompressionMode.Compress); await zipped.WriteAsync(Encoding.UTF8.GetBytes(xml)); }
        else await stream.WriteAsync(Encoding.UTF8.GetBytes(xml));
    }
    public async Task Identity(IProcessRunner runner) { await Git(runner, "config", "user.name", "AbletonGit Tests"); await Git(runner, "config", "user.email", "tests@example.invalid"); await Git(runner, "config", "commit.gpgsign", "false"); }
    public async Task Git(IProcessRunner runner, params string[] arguments)
    {
        var r = await runner.RunAsync("git", arguments, Root);
        if (r.ExitCode != 0) throw new InvalidOperationException(r.Error);
    }
    public void Dispose()
    {
        var target = Path.GetFullPath(container);
        if (!ProjectDiscovery.IsWithin(Path.GetTempPath(), target) || !Path.GetFileName(target).StartsWith("AbletonGit-tests-", StringComparison.Ordinal))
            throw new InvalidOperationException("Unsafe test cleanup path");
        foreach (var f in Directory.EnumerateFiles(target, "*", SearchOption.AllDirectories)) File.SetAttributes(f, FileAttributes.Normal);
        Directory.Delete(target, true);
    }
    public static string Xml() => """
        <Ableton MajorVersion="5" MinorVersion="12.0_12300" Creator="Ableton Live 12.3">
          <LiveSet><Tracks>
            <AudioTrack Id="1"><Name><EffectiveName Value="Bass" /></Name><TrackGroupId Value="-1" />
              <DeviceChain>
                <AudioOutputRouting><Target Value="AudioOut/Master" /><UpperDisplayString Value="Master" /></AudioOutputRouting>
                <MainSequencer><ClipSlotList><ClipSlot Id="0"><ClipSlot><Value>
                  <AudioClip Id="7" Time="0"><Name Value="Bass Clean" /><CurrentStart Value="0" /><CurrentEnd Value="8" />
                    <Loop><LoopStart Value="0" /><LoopEnd Value="8" /></Loop>
                    <SampleRef><FileRef><RelativePath Value="Samples/Imported/bass.wav" /><Name Value="bass.wav" /></FileRef></SampleRef>
                  </AudioClip>
                </Value></ClipSlot></ClipSlot></ClipSlotList>
                <ClipTimeable><ArrangerAutomation><Events><MidiClip Id="8" Time="16"><Name Value="Bass Notes" /><CurrentStart Value="0" /><CurrentEnd Value="4" /></MidiClip></Events></ArrangerAutomation></ClipTimeable>
                </MainSequencer>
                <DeviceChain><Devices><AudioEffectGroupDevice Id="10"><MacroControls.0><Name Value="Dub Amount" /><Manual Value="64" /><Targets><Target Id="99" /></Targets></MacroControls.0>
                  <Branches><AudioBranch Id="20"><Name><EffectiveName Value="Dub" /></Name><DeviceChain><Devices><Echo Id="11" /></Devices></DeviceChain></AudioBranch></Branches>
                </AudioEffectGroupDevice></Devices></DeviceChain>
              </DeviceChain>
            </AudioTrack>
            <ReturnTrack Id="2"><Name><EffectiveName Value="Delay" /></Name><DeviceChain><Devices><Reverb Id="12" /></Devices></DeviceChain></ReturnTrack>
          </Tracks>
          <MainTrack><Name><EffectiveName Value="Master" /></Name><DeviceChain><Mixer><Tempo><Manual Value="128" /></Tempo></Mixer><DeviceChain><Devices><Limiter Id="13" /></Devices></DeviceChain></DeviceChain></MainTrack>
          <Scenes><Scene Id="4"><Name Value="Dub Breakdown" /></Scene></Scenes>
          <UnknownFutureElement Value="ignore me" />
          </LiveSet>
        </Ableton>
        """;
}
