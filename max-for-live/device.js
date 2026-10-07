"use strict";
const max = require("max-api");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { Client, normalizeLibraryPath, watchLibrary } = require("./client");
const { Preferences } = require("./preferences");
const { companionExecutable, gitEnvironment, gitStatusLaunch } = require("./platform");
const client = new Client((kind, ...values) => {
    if (kind === "console") { max.post("Ableton Git: " + values.join(" ")); return; }
    if (["status", "warning", "detail"].includes(kind)) {
        const full = String(values[0] ?? "");
        const line = full.replace(/\s+/g, " ").trim();
        const limit = kind === "status" ? 75 : kind === "warning" ? 50 : 30;
        if (line.length > limit) {
            max.post("Ableton Git: " + full);
            values[0] = line.slice(0, limit - 21) + "... See Max Console.";
        } else values[0] = line;
    }
    max.outlet(kind, ...values);
});
const preferences = new Preferences();
let library = "";
try { library = preferences.loadLibrary(); }
catch { max.post("Ableton Git: Unable to read the saved library folder. Enter it again and Start companion to save it."); }
let child = null;
let libraryWatcher = null;
function stopWatching() { if (libraryWatcher) libraryWatcher.close(); libraryWatcher = null; }

max.addHandler("library", (...parts) => { if (!client.busy) library = normalizeLibraryPath(parts.join(" ")); });
max.addHandler("description", (...parts) => client.setDescription(parts.join(" ")));
max.addHandler("project", index => client.select(Number(index)));
max.addHandler("scope", index => client.selectScope(Number(index)));
max.addHandler("snapshot", () => client.snapshot());
max.addHandler("push", () => client.push());
max.addHandler("init", () => client.init());
max.addHandler("gitstatus", () => client.run(async () => {
    const root = path.resolve(library);
    if (!library || !path.isAbsolute(library) || !fs.statSync(root).isDirectory())
        throw new Error("Enter a valid library folder before opening Git status.");
    const launch = gitStatusLaunch(root);
    const launcher = spawn(launch.file, launch.args, launch.options);
    await new Promise((resolve, reject) => {
        launcher.once("error", reject);
        launcher.once("exit", code => code === 0 ? resolve() : reject(new Error("Unable to open " + launch.label + ". Check system automation permissions.")));
    });
    client.emit("status", "Opened " + launch.label + " with Git status for the library.");
}, false));
max.addHandler("refresh", () => client.run(async () => {
    if (!client.token) throw new Error("Start the companion first.");
    await client.checkTools(); await client.refresh(); await client.refreshState(); client.emit("status", "Ready. Projects and changed files refreshed.");
}));
function startCompanion() { return client.run(async () => {
    if (child) throw new Error("Companion already started. Use Refresh.");
    const root = path.resolve(library);
    if (!library || !path.isAbsolute(library) || !fs.statSync(root).isDirectory())
        throw new Error("Enter the full path to your Ableton projects library folder.");
    const executable = companionExecutable(__dirname);
    if (!fs.existsSync(executable)) throw new Error("Missing companion folder. Use the published M4L package.");
    try { preferences.saveLibrary(root); }
    catch { max.post("Ableton Git: Unable to save the library folder preference. The companion can still run."); }
    client.emit("status", "Starting companion...");
    child = spawn(executable, ["--all", "--path", root], { cwd: path.dirname(executable), shell: false, windowsHide: true, env: gitEnvironment() });
    const owned = child;
    owned.once("spawn", () => { if (child === owned) client.setRunning(true); });
    owned.on("exit", () => { if (child === owned) { stopWatching(); child = null; client.disconnect(); client.emit("status", "Companion stopped."); } });
    try {
        const token = await new Promise((resolve, reject) => {
            let output = "";
            const timer = setTimeout(() => reject(new Error("Companion startup timed out.")), 15000);
            owned.once("error", error => { clearTimeout(timer); reject(error); });
            owned.once("exit", () => { clearTimeout(timer); reject(new Error("Companion could not start. Check .NET 10 and whether port 17831 is already in use.")); });
            owned.stdout.on("data", chunk => {
                output = (output + chunk.toString()).slice(-8192);
                const match = output.match(/Use X-AbletonGit-Token: ([A-F0-9]{64})/);
                if (match) { clearTimeout(timer); resolve(match[1]); }
            });
            // Drain logs without printing tokens or project paths into the Max console.
            owned.stderr.on("data", () => {});
        });
        client.token = token;
        let failure;
        for (let attempt = 0; attempt < 30; attempt++) {
            try { await client.refresh(); failure = null; break; }
            catch (error) { failure = error; await new Promise(resolve => setTimeout(resolve, 100)); }
        }
        if (failure) throw failure;
        await client.checkTools();
        await client.refreshState();
        const scanError = error => { client.emit("detail", "Auto-scan unavailable; polling continues."); client.emit("console", error.message); };
        try {
            libraryWatcher = watchLibrary(root, async () => {
                if (child !== owned || !client.token || !client.toolsReady) return;
                await client.refresh(); await client.refreshState();
            }, scanError, () => !client.busy && !client.refreshPromise);
        } catch (error) { scanError(error); }
        client.emit("status", "Companion running. File preview is up to date.");
    } catch (error) { stopWatching(); child = null; owned.kill(); client.disconnect(); throw error; }
}); }
max.addHandler("start", startCompanion);
max.addHandler("stop", () => client.run(async () => {
    stopWatching();
    if (child) child.kill();
    child = null; client.disconnect(); client.project = null;
    client.emit("status", "Companion stopped.");
}, false));
// Saved Sets and external Git actions are reflected without repeatedly rebuilding the project menu.
const stateTimer = setInterval(() => {
    if (!client.busy && client.token && client.toolsReady) client.refreshState().catch(error => {
        client.emit("detail", "Preview unavailable; use Refresh projects."); client.emit("console", error.message);
    });
}, 5000);
stateTimer.unref();
process.on("exit", () => { stopWatching(); if (child) child.kill(); });
client.selectScope(1);
client.emit("libraryrestore", library);
client.emit("descriptionclear");
client.emit("status", library ? "Saved library folder loaded. Starting companion..." : "Enter library folder, then Start companion.");
module.exports.startup = library ? startCompanion() : Promise.resolve(false);
