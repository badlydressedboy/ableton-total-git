using System.Globalization;
using System.Text;
using AbletonGit.Core;

namespace AbletonGit.Infrastructure;

public sealed class MetadataWriter
{
    public static IReadOnlyDictionary<string, string> Render(ProjectModel model)
    {
        string TrackName(int order) => model.Tracks.First(t => t.Order == order).Name;
        var tracks = new StringBuilder("# Tracks\n\n");
        foreach (var t in model.Tracks)
        {
            tracks.Append($"## {E(t.Name)}\n\nType: {E(t.Type)} · Order: {t.Order}\n\nClips:\n");
            foreach (var c in model.Clips.Where(c => c.TrackOrder == t.Order)) tracks.Append($"- {E(c.Name)} ({c.Location})\n");
            tracks.Append("\nDevices:\n");
            foreach (var d in model.Devices.Where(d => d.TrackOrder == t.Order)) tracks.Append($"- {E(d.Name)}{(d.Chain.Length > 0 ? $" — {E(d.Chain)}" : "")}\n");
            tracks.Append('\n');
        }
        var clips = new StringBuilder("# Clips\n\n| Track | Clip | Type | Location | Scene | Position (beats) | Length (beats) | Sample |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n");
        foreach (var c in model.Clips) clips.Append($"| {E(TrackName(c.TrackOrder))} | {E(c.Name)} | {c.Type} | {c.Location} | {E(c.SceneOrder is { } n ? model.Scenes.FirstOrDefault(s => s.Order == n)?.Name ?? n.ToString(CultureInfo.InvariantCulture) : "")} | {N(c.Position)} | {N(c.Length)} | {E(c.Sample)} |\n");
        var devices = new StringBuilder("# Devices\n\n");
        foreach (var t in model.Tracks)
        {
            devices.Append($"## {E(t.Name)}\n\n");
            foreach (var d in model.Devices.Where(d => d.TrackOrder == t.Order))
            {
                devices.Append($"- {E(d.Name)} ({E(d.Category)}, {E(d.Type)}){(d.Chain.Length > 0 ? $" — {E(d.Chain)}" : "")}\n");
                foreach (var m in d.Macros) devices.Append($"  - Macro: {E(m.Name)} = {E(m.Value)}; targets: {E(string.Join(", ", m.Targets))}\n");
            }
            devices.Append('\n');
        }
        var scenes = new StringBuilder("# Scenes\n\n");
        foreach (var s in model.Scenes)
        {
            scenes.Append($"## {s.Order + 1}. {E(s.Name)}\n\n");
            foreach (var c in model.Clips.Where(c => c.SceneOrder == s.Order)) scenes.Append($"- {E(TrackName(c.TrackOrder))}: {E(c.Name)}\n");
            scenes.Append('\n');
        }
        var routing = new StringBuilder("# Routing\n\n| Track | Kind | Destination | Ableton target |\n| --- | --- | --- | --- |\n");
        foreach (var r in model.Routing) routing.Append($"| {E(TrackName(r.TrackOrder))} | {E(r.Kind)} | {E(r.Display)} | {E(r.Target)} |\n");
        return new SortedDictionary<string, string>(StringComparer.Ordinal)
        { ["project.json"] = ModelJson.Serialize(model), ["tracks.md"] = tracks.ToString(), ["clips.md"] = clips.ToString(),
            ["devices.md"] = devices.ToString(), ["scenes.md"] = scenes.ToString(), ["routing.md"] = routing.ToString() };
    }
    public async Task<IReadOnlyList<string>> WriteAsync(string root, ProjectModel model, CancellationToken ct, string metadataDirectory = ".abletongit")
    {
        return await ApplyAsync(root, Render(model).ToDictionary(p => (OperatingSystem.IsWindows() ? metadataDirectory.Replace('\\', '/') : metadataDirectory) + "/" + p.Key, p => (string?)p.Value, StringComparer.Ordinal), ct);
    }
    public async Task<IReadOnlyList<string>> ApplyAsync(string root, IReadOnlyDictionary<string, string?> generated, CancellationToken ct)
    {
        var changed = new List<string>();
        foreach (var (relative, value) in generated)
        {
            ct.ThrowIfCancellationRequested();
            var path = Path.Combine(root, relative);
            ProjectDiscovery.EnsureSafePath(root, path);
            if (value is null)
            {
                if (File.Exists(path)) { File.Delete(path); changed.Add(relative); }
                continue;
            }
            if (File.Exists(path) && await File.ReadAllTextAsync(path, ct) == value) continue;
            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            var temp = path + ".tmp";
            ProjectDiscovery.EnsureSafePath(root, temp);
            try
            {
                await File.WriteAllTextAsync(temp, value, new UTF8Encoding(false), ct);
                File.Move(temp, path, true);
            }
            finally { if (File.Exists(temp)) File.Delete(temp); }
            changed.Add(relative);
        }
        return changed;
    }
    private static string E(string? text) => (text ?? "").Replace("\\", "\\\\").Replace("|", "\\|").Replace("\r", " ").Replace("\n", " ")
        .Replace("<", "&lt;").Replace(">", "&gt;").Replace("*", "\\*").Replace("[", "\\[").Replace("]", "\\]").Replace("`", "\\`");
    private static string N(double? number) => number?.ToString("G", CultureInfo.InvariantCulture) ?? "";
}
