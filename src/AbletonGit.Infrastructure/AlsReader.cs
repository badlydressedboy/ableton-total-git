using System.Globalization;
using System.IO.Compression;
using System.Xml;
using System.Xml.Linq;
using AbletonGit.Core;

namespace AbletonGit.Infrastructure;

public sealed class AlsReader : ISetReader
{
    public async Task<ProjectModel> ReadAsync(ProjectLocation location, CancellationToken cancellationToken = default)
    {
        ProjectDiscovery.EnsureSafePath(location.Root, location.SetPath);
        XDocument document;
        try
        {
            await using var file = new FileStream(location.SetPath, FileMode.Open, FileAccess.Read, FileShare.Read);
            var magic = new byte[2];
            if (await file.ReadAsync(magic, cancellationToken) != 2 || magic[0] != 0x1f || magic[1] != 0x8b)
                throw new CompanionException("This Set is not a readable gzip ALS file. Save it from Ableton Live and try again.");
            file.Position = 0;
            await using var gzip = new GZipStream(file, CompressionMode.Decompress);
            using var xml = XmlReader.Create(gzip, new XmlReaderSettings
            { Async = true, DtdProcessing = DtdProcessing.Prohibit, XmlResolver = null, MaxCharactersInDocument = 256L * 1024 * 1024 });
            document = await XDocument.LoadAsync(xml, LoadOptions.None, cancellationToken);
        }
        catch (XmlException ex) { throw new CompanionException("Unable to analyse this Set: its XML is malformed or exceeds the reader limit. Save the Set again in Live. Use --verbose for details.", ex); }
        catch (InvalidDataException ex) { throw new CompanionException("Unable to decompress this Ableton Set. It may be damaged or incomplete.", ex); }
        catch (IOException ex) { throw new CompanionException("Unable to read this Ableton Set. Finish saving it in Live and try again.", ex); }
        var ableton = document.Root;
        var live = Child(ableton, "LiveSet");
        if (ableton?.Name.LocalName != "Ableton" || live is null || Child(live, "Tracks") is null)
            throw new CompanionException("This XML does not contain a supported Ableton LiveSet/Tracks structure.");
        var tracks = new List<Track>(); var scenes = new List<Scene>(); var clips = new List<Clip>();
        var devices = new List<Device>(); var routes = new List<Routing>(); var dependencies = new List<Dependency>();
        var warnings = new List<string>();
        var trackElements = Child(live, "Tracks")!.Elements().Where(t => t.Name.LocalName.EndsWith("Track", StringComparison.Ordinal)).ToList();
        trackElements.AddRange(live.Elements().Where(t => t.Name.LocalName is "MasterTrack" or "MainTrack"));
        foreach (var t in trackElements)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var order = tracks.Count;
            var type = t.Name.LocalName;
            tracks.Add(new(Id(t), order, Name(t, type), type, Value(Child(t, "TrackGroupId"))));
            var clipOrder = 0;
            foreach (var c in t.Descendants().Where(x => x.Name.LocalName is "AudioClip" or "MidiClip"))
            {
                var slot = c.Ancestors().FirstOrDefault(x => x.Name.LocalName == "ClipSlot" && x.Parent?.Name.LocalName is "ClipSlotList" or "ClipSlots")
                    ?? c.Ancestors().LastOrDefault(x => x.Name.LocalName == "ClipSlot");
                var slotList = slot?.Parent;
                int? sceneOrder = slot is null ? null : slotList?.Elements().Where(x => x.Name.LocalName == "ClipSlot").ToList().IndexOf(slot);
                var start = Number(c, "CurrentStart"); var end = Number(c, "CurrentEnd");
                var loop = Child(c, "Loop");
                var ls = Number(loop, "LoopStart"); var le = Number(loop, "LoopEnd");
                var sample = c.Descendants().FirstOrDefault(x => x.Name.LocalName == "FileRef");
                clips.Add(new(Id(c), order, clipOrder++, Name(c, "Untitled"), c.Name.LocalName,
                    slot is null ? "Arrangement" : "Session", sceneOrder, AttrNumber(c, "Time") ?? start,
                    start is not null && end is not null ? end - start : ls is not null && le is not null ? le - ls : null,
                    ls, le, sample is null ? null : Reference(sample, location).Name));
            }
            var deviceOrder = 0;
            foreach (var container in t.Descendants().Where(x => x.Name.LocalName == "Devices"))
            {
                foreach (var d in container.Elements())
                {
                    var tag = d.Name.LocalName;
                    var parents = d.Ancestors().Where(x => x.Parent?.Name.LocalName == "Devices").Reverse().ToList();
                    var chainNodes = d.Ancestors().Where(x => x.Name.LocalName is "AudioBranch" or "MidiBranch" or "Chain" or "DrumBranch").Reverse().ToList();
                    var chain = string.Join(" / ", parents.Select(x => DeviceName(x)).Concat(chainNodes.Select(x => Name(x, "Chain"))));
                    var macros = d.Descendants().Where(x => x.Name.LocalName.StartsWith("MacroControls.", StringComparison.Ordinal)
                        && x.Ancestors().FirstOrDefault(a => a.Parent?.Name.LocalName == "Devices") == d)
                        .Select(m => new Macro(Name(m, m.Name.LocalName), Value(Child(m, "Manual")),
                            m.Descendants().Where(x => x.Name.LocalName is "Target" or "Pointee" || x.Name.LocalName.EndsWith("TargetId", StringComparison.Ordinal))
                            .Select(x => (string?)x.Attribute("Id") ?? Value(x)).OfType<string>().ToList())).ToList();
                    devices.Add(new(Id(d), order, deviceOrder++, DeviceName(d), tag, Category(tag), chain,
                        string.Join("/", chainNodes.Select(x => Id(x) ?? Name(x, "Chain"))), parents.LastOrDefault() is { } parent ? Id(parent) : null, macros));
                }
            }
            var dc = Child(t, "DeviceChain");
            if (dc is not null)
                foreach (var r in dc.Elements().Where(x => x.Name.LocalName.EndsWith("Routing", StringComparison.Ordinal)))
                    routes.Add(new(order, r.Name.LocalName, Value(Child(r, "Target")),
                        Value(Child(r, "UpperDisplayString")) ?? Value(Child(r, "LowerDisplayString"))));
        }
        foreach (var s in Child(live, "Scenes")?.Elements().Where(s => s.Name.LocalName == "Scene") ?? [])
            scenes.Add(new(Id(s), scenes.Count, Name(s, "Unnamed scene")));
        foreach (var reference in live.Descendants().Where(x => x.Name.LocalName == "FileRef"))
            dependencies.Add(Reference(reference, location));
        if (dependencies.Any(d => d.State != "local")) warnings.Add("Some media references are external, missing or unresolved. Run File → Collect All and Save in Live for a portable Snapshot.");
        warnings.Add("Analysis covers the saved Set on disk. Save in Live before creating a Snapshot; opaque plugin media cannot be fully checked.");
        if (tracks.Any(t => t.Id is null)) warnings.Add("Some tracks have no Ableton ID; comparisons use type and position for those tracks.");
        var main = trackElements.FirstOrDefault(t => t.Name.LocalName is "MasterTrack" or "MainTrack");
        var tempo = main?.Descendants().FirstOrDefault(x => x.Name.LocalName == "Tempo");
        var media = ProjectDiscovery.EnumerateFiles(location.Root, true).Where(ProjectDiscovery.IsAudio)
            .Select(p => ProjectDiscovery.Relative(location.Root, p)).Order(StringComparer.Ordinal).ToList();
        return new(1, new(Path.GetFileName(location.Root), location.Sets.Select(p => ProjectDiscovery.Relative(location.Root, p)).ToList(), media),
            new(ProjectDiscovery.Relative(location.Root, location.SetPath), (string?)ableton.Attribute("Creator"),
                (string?)ableton.Attribute("MajorVersion"), (string?)ableton.Attribute("MinorVersion"), Number(tempo, "Manual")),
            tracks, scenes, clips, devices, routes,
            dependencies.Distinct().OrderBy(d => d.Name, StringComparer.Ordinal).ThenBy(d => d.State, StringComparer.Ordinal).ToList(), warnings);
    }
    private static XElement? Child(XElement? e, string name) => e?.Elements().FirstOrDefault(x => x.Name.LocalName == name);
    private static string? Id(XElement e) => (string?)e.Attribute("Id");
    private static string? Value(XElement? e) => (string?)e?.Attribute("Value") ?? (e is not null && !e.HasElements && !string.IsNullOrWhiteSpace(e.Value) ? e.Value : null);
    private static string Name(XElement e, string fallback)
    {
        var name = Child(e, "Name");
        return Value(Child(name, "EffectiveName")) ?? Value(Child(name, "UserName")) ?? Value(name) ?? Value(Child(e, "UserName")) ?? fallback;
    }
    private static string DeviceName(XElement e)
    {
        var user = Value(Child(e, "UserName"));
        if (!string.IsNullOrWhiteSpace(user)) return user;
        var plugin = Child(e, "PluginDesc")?.Descendants().FirstOrDefault(x => x.Name.LocalName is "PlugName" or "Name");
        return Value(plugin) ?? (e.Name.LocalName switch
        { "AudioEffectGroupDevice" => "Audio Effect Rack", "InstrumentGroupDevice" => "Instrument Rack", "MidiEffectGroupDevice" => "MIDI Effect Rack",
            "DrumGroupDevice" => "Drum Rack", "Eq8" => "EQ Eight", "AutoFilter" => "Auto Filter", _ => e.Name.LocalName });
    }
    private static string Category(string tag) => tag switch
    {
        "AudioEffectGroupDevice" or "InstrumentGroupDevice" or "MidiEffectGroupDevice" or "DrumGroupDevice" => "Rack",
        "PluginDevice" or "AuPluginDevice" or "Vst3PluginDevice" => "Plugin",
        "OriginalSimpler" or "MultiSampler" or "Operator" or "UltraAnalog" or "Wavetable" or "InstrumentImpulse" => "Instrument",
        "MidiArpeggiator" or "MidiChord" or "MidiPitcher" or "MidiRandom" or "MidiScale" or "MidiVelocity" => "MIDI effect",
        "Eq8" or "Echo" or "Saturator" or "AutoFilter" or "Compressor2" or "Reverb" or "Limiter" or "StereoGain" or "DrumBuss" => "Audio effect",
        _ => "Unknown"
    };
    private static double? Parse(string? s) => double.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out var n) && double.IsFinite(n) ? n : null;
    private static double? Number(XElement? e, string child) => Parse(Value(Child(e, child)) ?? (string?)e?.Attribute(child));
    private static double? AttrNumber(XElement e, string attr) => Parse((string?)e.Attribute(attr));
    private static Dependency Reference(XElement reference, ProjectLocation location)
    {
        var relative = Value(Child(reference, "RelativePath"));
        var name = Value(Child(reference, "Name"));
        if (string.IsNullOrWhiteSpace(relative))
        {
            var parts = reference.Descendants().Where(x => x.Name.LocalName == "RelativePathElement")
                .Select(x => (string?)x.Attribute("Dir") ?? Value(x)).OfType<string>();
            var dir = string.Join("/", parts);
            if (dir.Length > 0) relative = dir.TrimEnd('/') + "/" + name;
        }
        var absolute = Value(Child(reference, "Path"));
        var candidate = relative ?? absolute;
        if (!string.IsNullOrWhiteSpace(candidate))
        {
            try
            {
                var full = Path.GetFullPath(candidate.Replace('/', Path.DirectorySeparatorChar), location.Root);
                if (ProjectDiscovery.IsWithin(location.Root, full))
                    return new(ProjectDiscovery.Relative(location.Root, full), File.Exists(full) ? "local" : "missing");
                return new(name ?? Path.GetFileName(candidate.Replace('\\', '/')), "external");
            }
            catch (Exception ex) when (ex is ArgumentException or NotSupportedException) { }
        }
        return new(name ?? "Unknown media", "unresolved");
    }
}
