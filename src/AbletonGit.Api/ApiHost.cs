using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Serialization;
using AbletonGit.Core;
using AbletonGit.Infrastructure;

namespace AbletonGit.Api;

public sealed record SnapshotRequest(string Message, bool Push = false, string? Scope = null, string? Project = null)
{
    public void Validate(bool all)
    {
        if (Scope is not null and not "all" and not "project" || Scope == "project" && all && string.IsNullOrWhiteSpace(Project) ||
            Scope != "project" && Project is not null || !all && (Scope == "all" || Project is not null and not "."))
            throw new CompanionException("Use scope 'project' with a selected project, or scope 'all' for a library.");
    }
}
public static class ApiHost
{
    public static WebApplication Create(string path, string token, int port = 17831, bool all = false)
    {
        if (string.IsNullOrWhiteSpace(token) || token.Length < 32) throw new ArgumentException("A strong local client token is required.", nameof(token));
        path = Path.GetFullPath(path);
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { Args = [] });
        builder.WebHost.ConfigureKestrel(o => { o.Listen(IPAddress.Loopback, port); o.Limits.MaxRequestBodySize = 4096; });
        builder.Services.AddCompanion();
        builder.Services.AddSingleton<ToolCheckService>();
        builder.Services.ConfigureHttpJsonOptions(o => { o.SerializerOptions.UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow; });
        var app = builder.Build();
        app.UseStatusCodePages(async status =>
        {
            if (status.HttpContext.Response.StatusCode >= 400)
                await status.HttpContext.Response.WriteAsJsonAsync(new { error = "Request could not be completed. Check the endpoint and JSON fields." });
        });
        app.Use(async (context, next) =>
        {
            if (context.Request.Host.Host != "127.0.0.1" || context.Request.Headers.ContainsKey("Origin") ||
                context.Request.Headers.ContainsKey("Sec-Fetch-Site"))
            { context.Response.StatusCode = 403; await context.Response.WriteAsJsonAsync(new { error = "Use a direct loopback client." }); return; }
            var supplied = context.Request.Headers["X-AbletonGit-Token"].ToString();
            if (!CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(supplied), Encoding.UTF8.GetBytes(token)))
            { context.Response.StatusCode = 401; await context.Response.WriteAsJsonAsync(new { error = "Local client token required." }); return; }
            try { await next(context); }
            catch (CompanionException ex) { context.Response.StatusCode = 400; await context.Response.WriteAsJsonAsync(new { error = ex.Message }); }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
            {
                app.Logger.LogError(ex, "Project IO failed");
                context.Response.StatusCode = 409; await context.Response.WriteAsJsonAsync(new { error = "Unable to access project files. Check permissions and other running operations." });
            }
        });
        app.MapGet("/api/tools", (ToolCheckService s, CancellationToken ct) =>
            s.CheckAsync(Directory.Exists(path) ? path : Path.GetDirectoryName(path)!, ct));
        if (all)
        {
            app.MapGet("/api/projects", (LibraryService s) => new { all = true, projects = s.Projects(path).Select(p => new { path = p, name = p }) });
            app.MapPost("/api/init", (LibraryService s, CancellationToken ct) => s.InitAsync(path, ct));
            app.MapGet("/api/status", (LibraryService s, CancellationToken ct) => s.StatusAsync(path, ct));
            app.MapGet("/api/project", (LibraryService s, CancellationToken ct) => s.ProjectAsync(path, ct));
            app.MapGet("/api/history", (LibraryService s, CancellationToken ct) => s.HistoryAsync(path, ct));
            app.MapGet("/api/diff", (LibraryService s, CancellationToken ct) => s.DiffAsync(path, ct));
            app.MapPost("/api/analyse", (LibraryService s, CancellationToken ct) => s.AnalyseAsync(path, ct));
            app.MapPost("/api/snapshot", (SnapshotRequest request, LibraryService s, CancellationToken ct) =>
            {
                request.Validate(true);
                return request.Scope == "project" ? s.SnapshotProjectAsync(path, request.Project!, request.Message, request.Push, ct) :
                    s.SnapshotAsync(path, request.Message, request.Push, ct);
            });
            app.MapPost("/api/push", async (LibraryService s, CancellationToken ct) => { await s.PushAsync(path, ct); return Results.Ok(new { pushed = true }); });
            return app;
        }
        app.MapGet("/api/projects", () => new { all = false, projects = new[] { new { path = ".", name = Path.GetFileName(ProjectDiscovery.Discover(path).Root) } } });
        app.MapPost("/api/init", (CompanionService s, CancellationToken ct) => s.InitAsync(path, ct));
        app.MapGet("/api/status", (CompanionService s, CancellationToken ct) => s.StatusAsync(path, ct));
        app.MapGet("/api/project", (CompanionService s, CancellationToken ct) => s.ProjectAsync(path, ct));
        app.MapGet("/api/history", (CompanionService s, CancellationToken ct) => s.HistoryAsync(path, ct));
        app.MapGet("/api/diff", (CompanionService s, CancellationToken ct) => s.DiffAsync(path, ct));
        app.MapPost("/api/analyse", (CompanionService s, CancellationToken ct) => s.AnalyseAsync(path, ct));
        app.MapPost("/api/snapshot", (SnapshotRequest request, CompanionService s, CancellationToken ct) =>
        {
            request.Validate(false);
            return s.SnapshotAsync(path, request.Message, request.Push, ct);
        });
        app.MapPost("/api/push", async (CompanionService s, CancellationToken ct) => { await s.PushAsync(path, ct); return Results.Ok(new { pushed = true }); });
        return app;
    }
}
