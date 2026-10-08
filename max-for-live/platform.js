"use strict";
const path = require("path");
const os = require("os");

function normalizeLibraryPath(value, platform = process.platform, home = os.homedir()) {
    let result = String(value ?? "").trim();
    if (result.length >= 2 && ((result.startsWith('"') && result.endsWith('"')) ||
        (result.startsWith("'") && result.endsWith("'")))) result = result.slice(1, -1).trim();
    if (platform === "win32") return result.replace(/\\/g, "/");
    if (result === "~") return home;
    if (result.startsWith("~/")) return path.posix.join(home, result.slice(2));
    return result;
}

function preferencesFile(platform = process.platform, env = process.env, home = os.homedir()) {
    if (platform === "win32") return path.win32.join(env.LOCALAPPDATA || path.win32.join(home, "AppData", "Local"), "AbletonGit", "max-for-live.json");
    return path.posix.join(home, "Library", "Application Support", "AbletonGit", "max-for-live.json");
}

function companionExecutable(directory, platform = process.platform) {
    if (!["win32", "darwin"].includes(platform)) throw new Error("The Max for Live companion supports Windows and macOS.");
    return path.join(directory, "companion", "AbletonGit.Api" + (platform === "win32" ? ".exe" : ""));
}

function gitEnvironment(platform = process.platform, env = process.env) {
    if (platform !== "darwin") return { ...env };
    // GUI-launched Live does not necessarily inherit the interactive shell's PATH.
    const directories = ["/opt/homebrew/bin", "/usr/local/bin", ...(env.PATH || "").split(":"), "/usr/bin", "/bin", "/usr/sbin", "/sbin"];
    return { ...env, PATH: [...new Set(directories.filter(Boolean))].join(":") };
}

function shellQuote(value) { return "'" + String(value).replace(/'/g, "'\"'\"'") + "'"; }

function gitStatusLaunch(root, platform = process.platform, env = process.env) {
    const options = { cwd: root, shell: false, stdio: "ignore", windowsHide: true, env: gitEnvironment(platform, env) };
    if (platform === "win32") {
        const file = path.win32.join(env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
        const script = "$ErrorActionPreference = 'Stop'; Start-Process -FilePath (Join-Path $env:SystemRoot 'System32\\WindowsPowerShell\\v1.0\\powershell.exe') -WorkingDirectory (Get-Location).Path -ArgumentList @('-NoLogo', '-NoProfile', '-NoExit', '-Command', 'git status') -WindowStyle Normal";
        return { file, args: ["-NoLogo", "-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64")], options, label: "PowerShell" };
    }
    if (platform === "darwin") {
        const command = "cd -- " + shellQuote(root) + " && PATH=" + shellQuote(options.env.PATH) + " git status";
        // Pass shell text as argv, never interpolate it into AppleScript source.
        return { file: "/usr/bin/osascript", args: ["-e", "on run argv", "-e", 'tell application "Terminal"', "-e", "activate", "-e", "do script (item 1 of argv)", "-e", "end tell", "-e", "end run", command], options, label: "Terminal" };
    }
    throw new Error("Git status supports Windows and macOS.");
}

function saveLiveSetLaunch(directory, platform = process.platform, env = process.env, nodePid = process.pid) {
    const options = { shell: false, windowsHide: true, stdio: ["ignore", "ignore", "pipe"] };
    if (platform === "win32") return {
        file: path.win32.join(env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
        args: ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", path.join(directory, "save-live-set.ps1"), "-DeviceNodePid", String(nodePid)], options
    };
    if (platform === "darwin") return { file: "/usr/bin/osascript", args: [path.join(directory, "save-live-set.applescript")], options };
    throw new Error("Save Live Set supports Windows and macOS.");
}

function watchLiveSetLaunch(directory, platform = process.platform, env = process.env, nodePid = process.pid) {
    const launch = saveLiveSetLaunch(directory, platform, env, nodePid);
    if (platform === "win32") launch.args.push("-Watch");
    else launch.args = [path.join(directory, "watch-live-set.applescript")];
    launch.options.stdio = ["ignore", "pipe", "pipe"];
    return launch;
}
module.exports = { normalizeLibraryPath, preferencesFile, companionExecutable, gitEnvironment, gitStatusLaunch, saveLiveSetLaunch, watchLiveSetLaunch };
