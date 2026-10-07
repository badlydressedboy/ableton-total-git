"use strict";
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
require("./build-patch");
const root = path.resolve(__dirname, "..");
const destination = path.join(root, "artifacts", "max-for-live");
fs.mkdirSync(destination, { recursive: true });
const published = spawnSync("dotnet", ["publish", "src/AbletonGit.Api", "-c", "Release", "--no-restore", "-o", path.join(destination, "companion")],
    { cwd: root, stdio: "inherit", shell: false, windowsHide: true });
if (published.error) throw published.error;
if (published.status !== 0) process.exit(published.status || 1);
for (const name of ["Ableton Git.maxpat", "device.js", "client.js", "preferences.js"]) fs.copyFileSync(path.join(__dirname, name), path.join(destination, name));
fs.copyFileSync(path.join(destination, "Ableton Git.maxpat"), path.join(destination, "AbletonGit-FULL-53-objects.maxpat"));
fs.copyFileSync(path.join(root, "docs", "max-for-live.md"), path.join(destination, "README.md"));
console.log("M4L source and companion package: " + destination);
