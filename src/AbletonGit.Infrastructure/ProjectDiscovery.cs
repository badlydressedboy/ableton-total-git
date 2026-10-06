using AbletonGit.Core;

namespace AbletonGit.Infrastructure;

public static class ProjectDiscovery
{
    private static readonly HashSet<string> Excluded = new(StringComparer.OrdinalIgnoreCase)
        { ".git", ".abletongit", "Backup", "Samples", "Ableton Project Info" };
    public static ProjectLocation Discover(string path)
    {
        path = Path.GetFullPath(path);
        string? selected = null;
        if (File.Exists(path))
        {
            if (!path.EndsWith(".als", StringComparison.OrdinalIgnoreCase)) throw new CompanionException("Choose an Ableton .als Set or project folder.");
            selected = path;
        }
        else if (!Directory.Exists(path)) throw new CompanionException("The project path does not exist.");
        var start = new DirectoryInfo(selected is null ? path : Path.GetDirectoryName(path)!);
        DirectoryInfo? fallback = null;
        DirectoryInfo? root = null;
        for (var dir = start; dir is not null; dir = dir.Parent)
        {
            if (Directory.Exists(Path.Combine(dir.FullName, "Ableton Project Info")) || Directory.Exists(Path.Combine(dir.FullName, ".abletongit")))
            { root = dir; break; }
            if (dir.EnumerateFiles().Any(f => f.Extension.Equals(".als", StringComparison.OrdinalIgnoreCase))) fallback ??= dir;
            // Avoid discovering a different project above a repository boundary.
            if (Directory.Exists(Path.Combine(dir.FullName, ".git")) || File.Exists(Path.Combine(dir.FullName, ".git"))) break;
        }
        root ??= fallback;
        if (root is null) throw new CompanionException("No Ableton Project detected. Choose its folder or an .als file with --path.");
        EnsureSafePath(root.FullName, root.FullName);
        var sets = EnumerateFiles(root.FullName).Where(p => p.EndsWith(".als", StringComparison.OrdinalIgnoreCase))
            .OrderBy(p => Relative(root.FullName, p), StringComparer.Ordinal).ToList();
        if (selected is not null && !sets.Contains(selected, StringComparer.OrdinalIgnoreCase))
            throw new CompanionException("The selected Set is outside the project or in an excluded folder such as Backup.");
        if (sets.Count == 0) throw new CompanionException("No .als Sets found in this project.");
        if (selected is null && sets.Count > 1)
            throw new CompanionException("Several Sets were found. Select one using --path \"path/to/Set.als\":\n" + string.Join("\n", sets.Select(p => Relative(root.FullName, p))));
        return new(root.FullName, selected ?? sets[0], sets);
    }
    public static IEnumerable<string> EnumerateFiles(string root, bool includeMedia = false)
    {
        var stack = new Stack<string>(); stack.Push(root);
        while (stack.Count > 0)
        {
            var dir = stack.Pop();
            foreach (var file in Directory.EnumerateFiles(dir).Order(StringComparer.Ordinal))
                if ((File.GetAttributes(file) & FileAttributes.ReparsePoint) == 0) yield return file;
            foreach (var child in Directory.EnumerateDirectories(dir).OrderDescending(StringComparer.Ordinal))
            {
                var name = Path.GetFileName(child);
                if (Excluded.Contains(name) && !(includeMedia && (name.Equals("Samples", StringComparison.OrdinalIgnoreCase) || name.Equals("Ableton Project Info", StringComparison.OrdinalIgnoreCase)))) continue;
                if ((File.GetAttributes(child) & FileAttributes.ReparsePoint) == 0) stack.Push(child);
            }
        }
    }
    public static string Relative(string root, string path) => Path.GetRelativePath(root, path).Replace('\\', '/');
    public static bool IsAudio(string path) => new[] { ".wav", ".aif", ".aiff", ".flac" }.Contains(Path.GetExtension(path), StringComparer.OrdinalIgnoreCase);
    public static bool IsWithin(string root, string path)
    {
        var relative = Path.GetRelativePath(Path.GetFullPath(root), Path.GetFullPath(path));
        return !Path.IsPathRooted(relative) && relative != ".." && !relative.StartsWith(".." + Path.DirectorySeparatorChar, StringComparison.Ordinal);
    }
    public static void EnsureSafePath(string root, string path)
    {
        if (!IsWithin(root, path)) throw new CompanionException("The requested file is outside the project.");
        for (var current = Path.GetFullPath(path); current is not null; current = Path.GetDirectoryName(current))
        {
            if ((File.Exists(current) || Directory.Exists(current)) && (File.GetAttributes(current) & FileAttributes.ReparsePoint) != 0)
                throw new CompanionException("Project files and metadata must not use symbolic links or junctions.");
            if (current == Path.GetPathRoot(current)) break;
        }
    }
}
