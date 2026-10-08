using System.Text.RegularExpressions;

namespace AbletonGit.Infrastructure;

public static class GitHubRemote
{
    public static string? CloneUrl(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return null;
        input = input.Trim();
        var browser = BrowserUrl(input);
        if (browser is null) throw new AbletonGit.Core.CompanionException("Enter a GitHub repository URL such as https://github.com/owner/repo, or leave it blank for local-only history.");
        var ssh = input.StartsWith("git@github.com:", StringComparison.OrdinalIgnoreCase);
        if (!ssh && Uri.TryCreate(input, UriKind.Absolute, out var uri))
        {
            ssh = uri.Scheme == "ssh";
            if (uri.UserInfo.Length > 0 && (!ssh || uri.UserInfo != "git"))
                throw new AbletonGit.Core.CompanionException("Use a repository URL without credentials. Configure authentication through Git.");
        }
        return ssh ? "git@github.com:" + browser["https://github.com/".Length..] + ".git" : browser + ".git";
    }
    // Return only a canonical public-site URL, never credentials or Git transport syntax.
    public static string? BrowserUrl(string? remote)
    {
        if (string.IsNullOrWhiteSpace(remote)) return null;
        remote = remote.Trim();
        string path;
        if (remote.StartsWith("git@github.com:", StringComparison.OrdinalIgnoreCase))
            path = remote["git@github.com:".Length..];
        else
        {
            if (!Uri.TryCreate(remote, UriKind.Absolute, out var uri) ||
                !uri.Host.Equals("github.com", StringComparison.OrdinalIgnoreCase) ||
                uri.Query.Length != 0 || uri.Fragment.Length != 0 ||
                !(uri.Scheme == "https" && uri.IsDefaultPort || uri.Scheme == "http" && uri.IsDefaultPort ||
                  uri.Scheme == "ssh" && (uri.Port == -1 || uri.Port == 22))) return null;
            path = uri.AbsolutePath.TrimStart('/');
        }
        path = path.TrimEnd('/');
        if (path.EndsWith(".git", StringComparison.OrdinalIgnoreCase)) path = path[..^4];
        if (!Regex.IsMatch(path, @"\A[A-Za-z0-9][A-Za-z0-9-]*/[A-Za-z0-9_.-]+\z") ||
            path.Split('/')[1] is "." or "..") return null;
        return "https://github.com/" + path;
    }
}
