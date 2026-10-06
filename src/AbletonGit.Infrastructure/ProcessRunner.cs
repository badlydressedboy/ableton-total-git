using System.ComponentModel;
using System.Diagnostics;
using System.Text;
using AbletonGit.Core;
using Microsoft.Extensions.Logging;

namespace AbletonGit.Infrastructure;

public sealed class ProcessRunner(ILogger<ProcessRunner> logger) : IProcessRunner
{
    public async Task<ProcessResult> RunAsync(string executable, IReadOnlyList<string> arguments, string directory,
        CancellationToken cancellationToken = default, TimeSpan? timeout = null, string? input = null)
    {
        cancellationToken.ThrowIfCancellationRequested();
        using var timer = new CancellationTokenSource(timeout ?? TimeSpan.FromSeconds(60));
        using var linked = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timer.Token);
        var start = new ProcessStartInfo(executable)
        { WorkingDirectory = directory, UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true,
            RedirectStandardError = true, RedirectStandardInput = true, StandardOutputEncoding = Encoding.UTF8,
            StandardErrorEncoding = Encoding.UTF8, StandardInputEncoding = new UTF8Encoding(false) };
        foreach (var argument in arguments) start.ArgumentList.Add(argument);
        start.Environment["GIT_TERMINAL_PROMPT"] = "0";
        start.Environment["GCM_INTERACTIVE"] = "never";
        // Prevent inherited Git environment variables from redirecting operations outside this project.
        foreach (var key in start.Environment.Keys.Where(k => k.StartsWith("GIT_", StringComparison.Ordinal) && k != "GIT_TERMINAL_PROMPT").ToList())
            start.Environment.Remove(key);
        using var process = new Process { StartInfo = start };
        try { process.Start(); }
        catch (Win32Exception ex) { throw new CompanionException($"Unable to start {executable}. Install it and ensure it is available on PATH.", ex); }
        logger.LogDebug("Started {Executable} in {Directory}", executable, directory);
        var stdout = process.StandardOutput.ReadToEndAsync();
        var stderr = process.StandardError.ReadToEndAsync();
        try
        {
            if (input is not null) await process.StandardInput.WriteAsync(input.AsMemory(), linked.Token);
            process.StandardInput.Close();
            await process.WaitForExitAsync(linked.Token);
            var result = new ProcessResult(process.ExitCode, await stdout, await stderr);
            logger.LogDebug("{Executable} finished with {ExitCode}", executable, result.ExitCode);
            return result;
        }
        catch (OperationCanceledException)
        {
            if (!process.HasExited) process.Kill(entireProcessTree: true);
            await process.WaitForExitAsync(CancellationToken.None);
            await Task.WhenAll(stdout, stderr);
            if (cancellationToken.IsCancellationRequested) throw;
            throw new CompanionException($"{executable} took too long and was stopped. Check repository/network state before retrying.");
        }
    }
}
