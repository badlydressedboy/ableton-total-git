"use strict";
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
require("./build-patch");
const { buildDevice } = require("./build-device");
buildDevice(path.join(__dirname, "device-template.amxd"), path.join(__dirname, "Ableton Total Git.maxpat"), path.join(__dirname, "Ableton Total Git.amxd"));
const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
let runtime = null, output = null;
for (let index = 0; index < args.length; index += 2) {
    if (!args[index + 1] || !["--runtime", "--output"].includes(args[index]))
        throw new Error("Usage: node max-for-live/package.js [--runtime win-x64|win-arm64|osx-x64|osx-arm64] [--output folder]");
    if (args[index] === "--runtime") runtime = args[index + 1];
    else output = args[index + 1];
}
if (runtime && !["win-x64", "win-arm64", "osx-x64", "osx-arm64"].includes(runtime)) throw new Error("Unsupported runtime: " + runtime);
const destination = output ? path.resolve(output) : path.join(root, "artifacts", "max-for-live" + (runtime ? "-" + runtime : ""));
fs.mkdirSync(destination, { recursive: true });
const publishArgs = ["publish", "src/AbletonGit.Api", "-c", "Release", "-o", path.join(destination, "companion")];
if (runtime) publishArgs.push("--runtime", runtime, "--self-contained", "true", "--source", "https://api.nuget.org/v3/index.json",
    "-p:RestoreConfigFile=" + path.join(root, "NuGet.Config"), "-p:RestorePackagesPath=" + path.join(root, "artifacts", "nuget"));
else publishArgs.push("--no-restore");
const published = spawnSync("dotnet", publishArgs,
    { cwd: root, stdio: "inherit", shell: false, windowsHide: true });
if (published.error) throw published.error;
if (published.status !== 0) process.exit(published.status || 1);
for (const name of ["Ableton Total Git.amxd", "Ableton Total Git.maxpat", "device.js", "client.js", "preferences.js", "platform.js", "visibility.js", "file-list.js", "repo-link.js", "save-button.js", "live-save-state.js", "watch-live-set.applescript", "save-live-set.ps1", "save-live-set.windows.cs", "save-live-set.applescript"]) fs.copyFileSync(path.join(__dirname, name), path.join(destination, name));
fs.copyFileSync(path.join(destination, "Ableton Total Git.maxpat"), path.join(destination, "AbletonGit-FULL-53-objects.maxpat"));
fs.copyFileSync(path.join(root, "docs", "max-for-live.md"), path.join(destination, "README.md"));
fs.copyFileSync(path.join(root, "LICENSE"), path.join(destination, "LICENSE"));
console.log("M4L source and companion package: " + destination);
if (runtime) {
    const { archive } = require("./package-archive");
    archive(destination, destination + ".zip");
    console.log("Archive: " + destination + ".zip");
}
