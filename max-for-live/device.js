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
    if (kind === "busy" && Number(values[0]) === 0 && pendingLibrary !== null) {
        const next = pendingLibrary; pendingLibrary = null;
        queueMicrotask(() => changeLibrary(next));
    }
}, undefined, 17831, true);
const preferences = new Preferences();
let library = "";
try { library = preferences.loadLibrary(); }
catch { max.post("Ableton Git: Unable to read the saved library folder. Enter it again and Start companion to save it."); }
let child = null;
let libraryWatcher = null;
let pendingLibrary = null;
let automaticStart = true;
let stopping = false;
let nextStart = 0;
function stopWatching() { if (libraryWatcher) libraryWatcher.close(); libraryWatcher = null; }
function validLibrary(value) {
    try { return Boolean(value && path.isAbsolute(value) && fs.statSync(value).isDirectory()); }
    catch { return false; }
}

function sameLibrary(value) {
    if (!library || !value) return library === value;
    const current = path.resolve(library), next = path.resolve(value);
    return process.platform === "win32" ? current.toLowerCase() === next.toLowerCase() : current === next;
}
async function shutdownCompanion() {
    stopping = true;
    try {
        stopWatching();
        const owned = child;
        if (owned && owned.exitCode === null) {
            await new Promise((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error("The previous companion has not closed. Remove the device before retrying.")), 5000);
                owned.once("exit", () => { clearTimeout(timer); resolve(); });
                owned.kill();
            });
        }
        child = null; client.disconnect(); client.project = null;
    } finally { stopping = false; }
}
function changeLibrary(value) {
    if (sameLibrary(value)) {
        pendingLibrary = null;
        return !child && !client.busy && validLibrary(value) ? startCompanion() : Promise.resolve(true);
    }
    if (client.busy) {
        pendingLibrary = value;
        return Promise.resolve(false);
    }
    if (!child) {
        library = value;
        return validLibrary(value) ? startCompanion() : Promise.resolve(false);
    }
    return client.run(async () => {
        // Validate before stopping the current companion; a bad entry keeps it running.
        if (!validLibrary(value))
            throw new Error("Enter a valid full library folder. The current companion is still running.");
        await shutdownCompanion();
        library = value;
        await launchCompanion();
    });
}
max.addHandler("library", (...parts) => changeLibrary(normalizeLibraryPath(parts.join(" "))));
max.addHandler("description", (...parts) => client.setDescription(parts.join(" ")));
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
    await client.checkTools(); await client.refresh(); await client.refreshState(); client.emit("status", "Ready. Library and changed files refreshed.");
}));
async function launchCompanion() {
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
    owned.on("exit", () => {
        if (child !== owned) return;
        stopWatching(); child = null; client.disconnect();
        nextStart = Date.now() + 1000;
        client.emit("status", automaticStart && !stopping ? "Companion exited. Restarting automatically..." : "Companion stopped.");
    });
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
    } catch (error) {
        nextStart = Date.now() + 30000;
        stopWatching(); child = null; owned.kill(); client.disconnect(); throw error;
    }
}
function startCompanion() {
    automaticStart = true;
    return client.run(launchCompanion).then(started => {
        if (!started && !child) nextStart = Date.now() + 30000;
        return started;
    });
}
max.addHandler("start", startCompanion);
max.addHandler("stop", () => client.run(async () => {
    // Compatibility with older patches and orderly test cleanup; no visible Stop control.
    automaticStart = false;
    await shutdownCompanion();
    client.emit("status", "Companion stopped.");
}, false));
// Saved Sets and external Git actions are reflected without repeatedly rebuilding the project menu.
const stateTimer = setInterval(() => {
    if (automaticStart && !child && !client.busy && Date.now() >= nextStart && validLibrary(library)) {
        startCompanion();
        return;
    }
    if (!client.busy && client.token && client.toolsReady) client.refreshState().catch(error => {
        client.emit("detail", "Preview unavailable; use Refresh library."); client.emit("console", error.message);
    });
}, 5000);
stateTimer.unref();
process.on("exit", () => { automaticStart = false; clearInterval(stateTimer); stopWatching(); if (child) child.kill(); });
client.emit("libraryrestore", library);
client.emit("descriptionclear");
client.emit("status", library ? "Saved library folder loaded. Starting companion..." : "Enter library folder and press Enter to start.");
module.exports.startup = library ? startCompanion() : Promise.resolve(false);
