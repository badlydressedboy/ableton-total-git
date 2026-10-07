using AbletonGit.Core;

namespace AbletonGit.Infrastructure;

public sealed record ToolCheckResult(bool Ready, IReadOnlyList<Diagnostic> Checks);

// Check the executable environment used by the companion, without needing a Git repository or readable Set.
public sealed class ToolCheckService(IGitRepository git)
{
    public async Task<ToolCheckResult> CheckAsync(string directory, CancellationToken ct)
    {
        var checks = await Task.WhenAll(Check(false), Check(true));
        return new(checks.All(c => c.Level == "PASS"), checks);

        async Task<Diagnostic> Check(bool lfs)
        {
            var name = lfs ? "Git LFS" : "Git";
            var repair = $"Install {(lfs ? "Git LFS" : "Git for Windows")} and ensure it is on PATH. Restart Live and the companion after installation/PATH changes.";
            try
            {
                var version = await git.VersionAsync(lfs, directory, ct);
                return version.ExitCode == 0 ? new("PASS", name + " is callable: " + version.Output.Trim()) :
                    new("FAIL", name + " version check failed. " + repair);
            }
            catch (CompanionException) { return new("FAIL", name + " could not be called. " + repair); }
        }
    }
}
