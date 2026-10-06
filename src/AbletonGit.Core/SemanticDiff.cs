namespace AbletonGit.Core;

public static class SemanticDiff
{
    public static ProjectDiff Compare(ProjectModel? previous, ProjectModel current)
    {
        var changes = new List<Change>();
        string TrackName(int order) => current.Tracks.FirstOrDefault(t => t.Order == order)?.Name
            ?? previous?.Tracks.FirstOrDefault(t => t.Order == order)?.Name ?? "Set";
        if (previous is not null)
        {
            if (previous.LiveSet.Path != current.LiveSet.Path)
                changes.Add(new("changed", "Set", "Project", "Selected Set", previous.LiveSet.Path, current.LiveSet.Path));
            if (previous.LiveSet.Tempo != current.LiveSet.Tempo)
                changes.Add(new("changed", "Tempo", "Set", "Tempo", F(previous.LiveSet.Tempo), F(current.LiveSet.Tempo)));
        }
        // Keys are comparison aids only; fallback ordinal keys are never persisted as Ableton IDs.
        string TrackKey(Track t) => t.Type is "MasterTrack" or "MainTrack" ? "main" : t.Id is not null ? $"{t.Type}/{t.Id}" : $"{t.Type}/order:{t.Order}";
        string Owner(int order, ProjectModel model) => TrackKey(model.Tracks.First(t => t.Order == order));
        CompareItems(previous?.Tracks ?? [], current.Tracks, TrackKey, TrackKey, "Track", t => t.Name,
            t => ModelJson.Serialize(t with { Id = null }), t => t.Name);
        CompareItems(previous?.Scenes ?? [], current.Scenes, s => s.Id ?? $"order:{s.Order}", s => s.Id ?? $"order:{s.Order}",
            "Scene", _ => "Scenes", s => ModelJson.Serialize(s with { Id = null }), s => s.Name);
        CompareItems(previous?.Clips ?? [], current.Clips,
            c => $"{Owner(c.TrackOrder, previous!)}/{c.Type}/{c.Location}/{c.Id ?? $"order:{c.Order}"}",
            c => $"{Owner(c.TrackOrder, current)}/{c.Type}/{c.Location}/{c.Id ?? $"order:{c.Order}"}",
            "Clip", c => TrackName(c.TrackOrder), c => ModelJson.Serialize(c with { TrackOrder = 0, Order = 0 }), c => c.Name);
        CompareItems(previous?.Devices ?? [], current.Devices,
            d => $"{Owner(d.TrackOrder, previous!)}/{d.ParentId}/{d.ChainId ?? d.Chain}/{d.Id ?? $"order:{d.Order}"}",
            d => $"{Owner(d.TrackOrder, current)}/{d.ParentId}/{d.ChainId ?? d.Chain}/{d.Id ?? $"order:{d.Order}"}",
            "Device", d => TrackName(d.TrackOrder), d => ModelJson.Serialize(d with { TrackOrder = 0 }), d => $"{d.Name} [{d.Chain}]");
        CompareItems(previous?.Routing ?? [], current.Routing,
            r => $"{Owner(r.TrackOrder, previous!)}/{r.Kind}", r => $"{Owner(r.TrackOrder, current)}/{r.Kind}",
            "Routing", r => TrackName(r.TrackOrder), r => $"{r.Target} ({r.Display})", r => r.Kind);
        CompareItems(previous?.Project.Media ?? [], current.Project.Media, p => p, p => p, "Audio", _ => "Project", p => p, p => p);
        return new(changes);

        void CompareItems<T>(IReadOnlyList<T> before, IReadOnlyList<T> after, Func<T, string> oldKey,
            Func<T, string> newKey, string category, Func<T, string> context, Func<T, string> content, Func<T, string> label)
        {
            // Queues preserve duplicate IDs instead of throwing or silently losing entities.
            var remaining = before.GroupBy(oldKey).ToDictionary(g => g.Key, g => new Queue<T>(g), StringComparer.Ordinal);
            foreach (var item in after)
            {
                if (!remaining.TryGetValue(newKey(item), out var matches) || matches.Count == 0)
                    changes.Add(new("added", category, context(item), label(item)));
                else
                {
                    var old = matches.Dequeue();
                    if (content(old) != content(item))
                    {
                        var details = Details(old, item).ToList();
                        if (details.Count == 0)
                            changes.Add(new("changed", category, context(item), label(item),
                                category == "Routing" ? content(old) : label(old), category == "Routing" ? content(item) : label(item)));
                        else foreach (var detail in details)
                            changes.Add(new("changed", category, context(item), $"{label(item)} · {detail.Field}", detail.Before, detail.After));
                    }
                }
            }
            foreach (var item in before)
                if (remaining.TryGetValue(oldKey(item), out var matches) && matches.Count > 0 && EqualityComparer<T>.Default.Equals(matches.Peek(), item))
                { matches.Dequeue(); changes.Add(new("removed", category, OldContext(item), label(item))); }
            string OldContext(T item)
            {
                int? order = item switch { Clip c => c.TrackOrder, Device d => d.TrackOrder, Routing r => r.TrackOrder, _ => null };
                return order is { } n ? previous?.Tracks.FirstOrDefault(t => t.Order == n)?.Name ?? context(item) : context(item);
            }
        }
    }
    private static IEnumerable<(string Field, string? Before, string? After)> Details<T>(T before, T after)
    {
        var pairs = new List<(string, string?, string?)>();
        switch (before, after)
        {
            case (Track a, Track b):
                pairs.AddRange([( "Name", a.Name, b.Name), ("Order", F(a.Order), F(b.Order)), ("Type", a.Type, b.Type), ("Group", a.GroupId, b.GroupId)]); break;
            case (Scene a, Scene b):
                pairs.AddRange([("Name", a.Name, b.Name), ("Order", F(a.Order), F(b.Order))]); break;
            case (Clip a, Clip b):
                pairs.AddRange([("Name", a.Name, b.Name), ("Position (beats)", F(a.Position), F(b.Position)), ("Length (beats)", F(a.Length), F(b.Length)),
                    ("Scene position", F(a.SceneOrder), F(b.SceneOrder)), ("Sample", a.Sample, b.Sample),
                    ("Loop start", F(a.LoopStart), F(b.LoopStart)), ("Loop end", F(a.LoopEnd), F(b.LoopEnd))]); break;
            case (Device a, Device b):
                pairs.AddRange([("Name", a.Name, b.Name), ("Order", F(a.Order), F(b.Order)), ("Type", a.Type, b.Type), ("Chain", a.Chain, b.Chain)]);
                if (ModelJson.Serialize(a.Macros) != ModelJson.Serialize(b.Macros))
                    pairs.Add(("Macros", string.Join("; ", a.Macros.Select(m => $"{m.Name}={m.Value} → {string.Join(',', m.Targets)}")),
                        string.Join("; ", b.Macros.Select(m => $"{m.Name}={m.Value} → {string.Join(',', m.Targets)}"))));
                break;
        }
        return pairs.Where(p => p.Item2 != p.Item3);
    }
    private static string? F(double? value) => value?.ToString(System.Globalization.CultureInfo.InvariantCulture);
}
