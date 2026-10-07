"use strict";
const max = require("max-api");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { Client } = require("./client");
const client = new Client((...message) => max.outlet(...message));
let library = "";
let child = null;

max.addHandler("library", (...parts) => { if (!client.busy) library = parts.join(" "); });
max.addHandler("description", (...parts) => { if (!client.busy) client.message = parts.join(" "); });
max.addHandler("project", index => client.select(Number(index)));
max.addHandler("scope", index => client.selectScope(Number(index)));
max.addHandler("snapshot", () => client.snapshot());
max.addHandler("push", () => client.push());
max.addHandler("init", () => client.init());
max.addHandler("refresh", () => client.run(async () => {
    if (!client.token) throw new Error("Start the companion first.");
    await client.checkTools(); await client.refresh(); client.emit("status", "Ready. Projects refreshed; Git and Git LFS are callable.");
}));
max.addHandler("start", () => client.run(async () => {
    if (child) throw new Error("Companion already started. Use Refresh.");
    const root = path.resolve(library);
    if (!library || !path.isAbsolute(library) || !fs.statSync(root).isDirectory())
        throw new Error("Enter the full path to your Ableton projects library folder.");
    const executable = path.join(__dirname, "companion", "AbletonGit.Api.exe");
    if (!fs.existsSync(executable)) throw new Error("Missing companion folder. Use the published M4L package.");
    client.emit("status", "Starting companion...");
    child = spawn(executable, ["--all", "--path", root], { cwd: path.dirname(executable), shell: false, windowsHide: true });
    const owned = child;
    owned.on("exit", () => { if (child === owned) { child = null; client.disconnect(); client.emit("status", "Companion stopped."); } });
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
        client.emit("status", "Ready. Git and Git LFS are callable. Choose a project; initialise once if needed.");
    } catch (error) { child = null; owned.kill(); client.disconnect(); throw error; }
}));
max.addHandler("stop", () => client.run(async () => {
    if (child) child.kill();
    child = null; client.disconnect(); client.project = null;
    client.emit("status", "Companion stopped.");
}));
process.on("exit", () => { if (child && !client.busy) child.kill(); });
client.selectScope(0);
client.emit("status", "Enter library folder, then Start companion.");
