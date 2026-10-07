using System.Security.Cryptography;
using AbletonGit.Api;

var path = Environment.CurrentDirectory;
var port = 17831;
var all = false;
for (var i = 0; i < args.Length; i++)
{
    if (args[i] == "--all") all = true;
    else if (args[i] == "--path" && i + 1 < args.Length) path = args[++i];
    else if (args[i] == "--port" && i + 1 < args.Length && int.TryParse(args[++i], out var value) && value is > 0 and <= 65535) port = value;
    else { Console.Error.WriteLine("Usage: AbletonGit.Api [--all] [--path <project or Set.als>] [--port <1-65535>]"); return; }
}
var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
var app = ApiHost.Create(path, token, port, all);
Console.WriteLine($"Local API: http://127.0.0.1:{port}\nUse X-AbletonGit-Token: {token}\nToken is ephemeral; share only with your local client.");
await app.RunAsync();
