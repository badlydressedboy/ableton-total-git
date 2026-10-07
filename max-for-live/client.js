"use strict";
const http = require("http");

function normalizeLibraryPath(value) {
    let result = String(value ?? "").trim();
    if (result.length >= 2 && ((result.startsWith('"') && result.endsWith('"')) ||
        (result.startsWith("'") && result.endsWith("'")))) result = result.slice(1, -1).trim();
    // Windows accepts slash separators; retain the two leading separators in UNC paths.
    return result.replace(/\\/g, "/");
}

// Fixed loopback transport. The device never passes commands to a shell or Git.
class Client {
    constructor(emit, transport, port = 17831) {
        this.emit = emit;
        this.transport = transport || this.http.bind(this);
        this.port = port;
        this.token = null;
        this.toolsReady = false;
        this.busy = false;
        this.projects = [];
        this.project = null;
        this.all = false;
        this.scope = "project";
        this.message = "";
        this.running = false;
        this.repositoryState = null;
        this.preview = null;
        this.previewLoading = false;
        this.refreshPromise = null;
        this.selectionVersion = 0;
        this.updateControls();
    }
    updateControls() {
        const ready = Boolean(this.token && this.toolsReady && !this.busy);
        this.emit("mutations", ready ? 1 : 0);
        this.emit("startenabled", !this.running && !this.busy ? 1 : 0);
        this.emit("stopenabled", this.running && !this.busy ? 1 : 0);
        this.emit("initenabled", ready && !this.previewLoading && this.repositoryState?.canInitialize === true ? 1 : 0);
        this.emit("pushenabled", ready && !this.previewLoading && this.repositoryState?.canPush === true ? 1 : 0);
        this.emit("snapshotenabled", ready && !this.previewLoading && this.repositoryState?.initialized === true && this.preview?.count > 0 ? 1 : 0);
        this.emit("refreshenabled", this.token && !this.busy && !this.previewLoading ? 1 : 0);
    }
    setRunning(value) { this.running = value; this.updateControls(); }
    disconnect() {
        this.token = null; this.toolsReady = false; this.running = false;
        this.repositoryState = null; this.preview = null; this.selectionVersion++;
        this.showPreview([], "Start the companion to preview files."); this.updateControls();
    }
    showPreview(files, summary) {
        const signature = JSON.stringify([files, summary]);
        if (this.previewSignature === signature) return;
        this.previewSignature = signature;
        this.emit("filelist", "clear", "all");
        this.emit("filelist", "rows", Math.max(1, files.length));
        files.forEach((file, row) => {
            this.emit("filelist", "set", 0, row, file.state.trim() === "??" ? "New" : file.state.trim());
            this.emit("filelist", "set", 1, row, file.originalPath ? `${file.originalPath} -> ${file.path}` : file.path);
        });
        this.emit("filesummary", summary);
    }
    refreshState() {
        if (this.refreshPromise) return this.refreshPromise;
        if (!this.token || !this.toolsReady) return Promise.resolve();
        this.previewLoading = true; this.updateControls();
        const token = this.token;
        const pending = (async () => {
            let version;
            do {
                version = this.selectionVersion;
                const scope = this.scope, project = this.project;
                const state = await this.transport("GET", "/api/ui-state");
                if (this.token !== token) return;
                this.repositoryState = state;
                let preview = null;
                let summary = "Choose a project to preview files.";
                if (!state.initialized) summary = state.canInitialize ? "Initialise the library to preview files." : "Choose the repository root for this library.";
                else if (scope === "all" || project) {
                    if (scope === "all" && !this.all) throw new Error("All projects requires a library companion.");
                    preview = await this.transport("GET", "/api/preview?scope=" + scope + (scope === "project" ? "&project=" + encodeURIComponent(project) : ""));
                    summary = `${preview.count} ${preview.count === 1 ? "file" : "files"} will be committed.`;
                }
                if (this.token !== token) return;
                if (version === this.selectionVersion) {
                    this.preview = preview;
                    this.showPreview(preview?.files || [], summary);
                }
            } while (version !== this.selectionVersion);
        })().catch(error => {
            if (this.token === token) {
                this.repositoryState = null; this.preview = null;
                this.showPreview([], "Preview unavailable; use Refresh projects.");
            }
            throw error;
        }).finally(() => {
            if (this.refreshPromise === pending) this.refreshPromise = null;
            this.previewLoading = false; this.updateControls();
        });
        this.refreshPromise = pending;
        return pending;
    }
    async refreshAfterOperation() {
        try { await this.refreshState(); }
        catch (error) { this.emit("detail", "State unavailable; use Refresh projects."); this.emit("console", error.message); }
    }
    invalidatePreview() {
        this.selectionVersion++; this.preview = null;
        this.showPreview([], "Checking files..."); this.updateControls();
        return this.refreshState().catch(error => { this.emit("detail", "Preview unavailable; use Refresh projects."); this.emit("console", error.message); });
    }
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
            const request = http.request({ hostname: "127.0.0.1", port: this.port, path: endpoint, method,
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
        try { if (this.refreshPromise) await this.refreshPromise; await action(); return true; }
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
    select(index) {
        if (this.busy) return;
        this.project = this.projects[index - 1]?.path || null;
        return this.invalidatePreview();
    }
    selectScope(index) {
        if (this.busy) return;
        this.scope = index === 1 ? "all" : "project";
        this.emit("warning", this.scope === "all" ? "All projects: includes saved changes throughout the library." : "Select the project you want to Snapshot. Save in Live first.");
        return this.invalidatePreview();
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
            if (result.created) { this.message = ""; this.emit("descriptionclear"); }
            this.emit("status", result.created ? "Snapshot saved: " + result.hash.slice(0, 12) : result.message);
            const warnings = result.warnings || [];
            this.emit("detail", warnings.length ? `${warnings.length} warnings; see Max Console.` : "No warnings.");
            warnings.forEach(warning => this.emit("console", warning));
            await this.refreshAfterOperation();
        });
    }
    push() {
        return this.run(async () => {
            this.requireTools();
            await this.refreshState();
            if (!this.repositoryState?.canPush) throw new Error("No local commits to push to the configured tracking branch.");
            this.emit("status", "Pushing repository history...");
            await this.transport("POST", "/api/push");
            this.emit("status", "Push complete.");
            await this.refreshAfterOperation();
        });
    }
    init() {
        return this.run(async () => {
            this.requireTools();
            await this.refreshState();
            if (!this.repositoryState?.canInitialize) throw new Error("The library is already initialised, or this folder is not the repository root.");
            this.emit("status", "Initialising library and Git LFS...");
            await this.transport("POST", "/api/init");
            this.emit("status", "Library initialised. Choose a project and Snapshot.");
            await this.refreshAfterOperation();
        });
    }
}
module.exports = { Client, normalizeLibraryPath };
