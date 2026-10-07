"use strict";
const http = require("http");

// Fixed loopback transport. The device never passes commands to a shell or Git.
class Client {
    constructor(emit, transport) {
        this.emit = emit;
        this.transport = transport || this.http.bind(this);
        this.token = null;
        this.toolsReady = false;
        this.busy = false;
        this.projects = [];
        this.project = null;
        this.all = false;
        this.scope = "project";
        this.message = "";
        this.updateControls();
    }
    updateControls() { this.emit("mutations", this.token && this.toolsReady && !this.busy ? 1 : 0); }
    disconnect() { this.token = null; this.toolsReady = false; this.updateControls(); }
    requireTools() {
        if (!this.token) throw new Error("Start the companion first.");
        if (!this.toolsReady) throw new Error("Git and Git LFS must pass the startup check. Use Refresh projects to check again.");
    }
    async checkTools() {
        this.toolsReady = false; this.updateControls();
        this.emit("status", "Checking Git and Git LFS...");
        const result = await this.transport("GET", "/api/tools");
        if (result.ready !== true) throw new Error(result.checks.filter(c => c.level !== "PASS").map(c => c.message).join(" | ") || "Git/Git LFS check failed.");
        this.toolsReady = true; this.updateControls();
    }
    http(method, endpoint, body) {
        return new Promise((resolve, reject) => {
            const payload = body === undefined ? null : JSON.stringify(body);
            const request = http.request({ hostname: "127.0.0.1", port: 17831, path: endpoint, method,
                headers: { "X-AbletonGit-Token": this.token,
                    ...(payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}) }
            }, response => {
                let data = "";
                response.setEncoding("utf8");
                response.on("data", chunk => { data += chunk; if (data.length > 8 * 1024 * 1024) response.destroy(new Error("Response too large.")); });
                response.on("error", reject);
                response.on("end", () => {
                    try {
                        const result = JSON.parse(data);
                        if (response.statusCode >= 400) reject(new Error(result.error || "Companion request failed."));
                        else resolve(result);
                    } catch (error) { reject(error); }
                });
            });
            // A timeout can leave the server completing a commit. Do not automatically retry writes.
            request.setTimeout(15 * 60 * 1000, () => request.destroy(new Error("Connection timed out. Check history before retrying Snapshot.")));
            request.on("error", reject);
            request.end(payload);
        });
    }
    async run(action) {
        if (this.busy) return false;
        this.busy = true; this.emit("busy", 1); this.updateControls();
        try { await action(); return true; }
        catch (error) { this.emit("status", error.message); return false; }
        finally { this.busy = false; this.emit("busy", 0); this.updateControls(); }
    }
    async refresh() {
        const result = await this.transport("GET", "/api/projects");
        this.all = result.all;
        this.projects = result.projects;
        if (!this.projects.some(p => p.path === this.project)) this.project = null;
        this.emit("projectclear");
        this.emit("projectitem", "Choose project...");
        this.projects.forEach(p => this.emit("projectitem", p.name));
        this.emit("projectselect", this.project === null ? 0 : this.projects.findIndex(p => p.path === this.project) + 1);
    }
    select(index) { if (!this.busy) this.project = this.projects[index - 1]?.path || null; }
    selectScope(index) {
        if (this.busy) return;
        this.scope = index === 1 ? "all" : "project";
        this.emit("warning", this.scope === "all" ? "All projects: includes saved changes throughout the library." : "Select the project you want to Snapshot. Save in Live first.");
    }
    snapshot() {
        return this.run(async () => {
            this.requireTools();
            if (!this.message.trim()) throw new Error("Enter a Snapshot description.");
            if (this.scope === "all" && !this.all) throw new Error("All projects requires a library companion.");
            if (this.scope === "project" && !this.project) throw new Error("Choose the project you want to Snapshot.");
            this.emit("status", "Creating Snapshot...");
            const body = { message: this.message, push: false, scope: this.scope };
            if (this.scope === "project") body.project = this.project;
            const result = await this.transport("POST", "/api/snapshot", body);
            this.emit("status", result.created ? "Snapshot saved: " + result.hash.slice(0, 12) : result.message);
            this.emit("detail", (result.warnings || []).join(" | ") || "Local Snapshot complete. Push uploads the repository's committed history.");
        });
    }
    push() {
        return this.run(async () => {
            this.requireTools();
            this.emit("status", "Pushing repository history...");
            await this.transport("POST", "/api/push");
            this.emit("status", "Push complete.");
        });
    }
    init() {
        return this.run(async () => {
            this.requireTools();
            this.emit("status", "Initialising library and Git LFS...");
            await this.transport("POST", "/api/init");
            this.emit("status", "Library initialised. Choose a project and Snapshot.");
        });
    }
}
module.exports = { Client };
