"use strict";
const http = require("http");
const fs = require("fs");
const DEFAULT_DESCRIPTION = "Raw Creativity";

// Live may save by replacing a file, producing several rename/change events.
function watchLibrary(root, onChange, onError, ready = () => true, delay = 750) {
    let timer, closed = false, scanning = false, dirty = false;
    function schedule(wait = delay) {
        clearTimeout(timer);
        timer = setTimeout(scan, wait); timer.unref();
    }
    async function scan() {
        if (closed || !dirty) return;
        if (scanning || !ready()) { schedule(100); return; }
        dirty = false; scanning = true;
        try { await onChange(); } catch (error) { onError(error); }
        finally { scanning = false; if (!closed && dirty) schedule(); }
    }
    const watcher = fs.watch(root, { recursive: true, persistent: false }, (_event, filename) => {
        if (closed) return;
        const parts = String(filename || "").replace(/\\/g, "/").toLowerCase().split("/");
        if (parts.some(part => [".git", ".abletongit", "backup"].includes(part)) || /\.(asd|tmp)$/.test(parts.at(-1))) return;
        dirty = true; schedule();
    });
    watcher.on("error", error => { watcher.close(); clearTimeout(timer); closed = true; onError(error); });
    return { close() { closed = true; clearTimeout(timer); watcher.close(); } };
}

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
        this.message = DEFAULT_DESCRIPTION;
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
        const hasChanges = this.preview?.count > 0;
        const canCommit = this.repositoryState?.initialized === true && hasChanges && this.validDescription();
        const states = {
            mutations: ready,
            startenabled: !this.running && !this.busy,
            stopenabled: this.running && !this.busy,
            initenabled: ready && this.repositoryState?.canInitialize === true,
            pushenabled: ready && (hasChanges ? canCommit : this.repositoryState?.canPush === true),
            snapshotenabled: ready && this.repositoryState?.initialized === true && this.preview?.count > 0 && this.validDescription(),
            refreshenabled: this.token && !this.busy
        };
        // Idle polling retains the last known state. Explicit actions wait for any pending read.
        this.controlValues ||= {};
        for (const [kind, enabled] of Object.entries(states)) {
            const value = enabled ? 1 : 0;
            if (this.controlValues[kind] !== value) { this.controlValues[kind] = value; this.emit(kind, value); }
        }
    }
    setRunning(value) { this.running = value; this.updateControls(); }
    validDescription() { return Array.from(this.message.trim()).length >= 4; }
    setDescription(value) {
        if (this.busy) return;
        this.message = String(value); this.updateControls();
    }
    disconnect() {
        this.token = null; this.toolsReady = false; this.running = false;
        this.repositoryState = null; this.preview = null; this.selectionVersion++;
        this.showPreview([], "Start the companion to preview files."); this.updateControls();
    }
    showPreview(files, summary) {
        const signature = JSON.stringify([files, summary]);
        if (this.previewSignature === signature) return;
        this.previewSignature = signature;
        this.emit("filelist", "bgcolor", 0.12, 0.12, 0.12, 1);
        this.emit("filelist", "fgcolor", 1, 1, 1, 1);
        this.emit("filelist", "textcolor", 1, 1, 1, 1);
        this.emit("filelist", "clear", "all");
        this.emit("filelist", "rows", Math.max(1, files.length));
        const paths = files.map(file => file.originalPath ? `${file.originalPath} -> ${file.path}` : file.path);
        this.emit("filelist", "col", 1, "width", Math.max(850, ...paths.map(value => value.length * 7)));
        files.forEach((file, row) => {
            this.emit("filelist", "set", 0, row, file.state.trim() === "??" ? "New" : file.state.trim());
            this.emit("filelist", "set", 1, row, paths[row]);
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
        this.showPreview([], this.token ? "Checking files..." : "Start the companion to preview files."); this.updateControls();
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
    async run(action, waitForRefresh = true) {
        if (this.busy) return false;
        this.busy = true; this.emit("busy", 1); this.updateControls();
        try {
            if (waitForRefresh && this.refreshPromise) { try { await this.refreshPromise; } catch { /* The action checks its own prerequisites. */ } }
            await action(); return true;
        }
        catch (error) { this.emit("status", error.message); return false; }
        finally { this.busy = false; this.emit("busy", 0); this.updateControls(); }
    }
    async refresh() {
        this.previewSignature = null; // A manual Refresh also repaints a newly loaded/reconnected Max list.
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
        this.emit("scopeselect", this.scope === "all" ? 1 : 0);
        this.emit("warning", this.scope === "all" ? "All projects: includes saved changes throughout the library." : "Select the project you want to Snapshot. Save in Live first.");
        return this.invalidatePreview();
    }
    snapshot() {
        return this.run(() => this.createSnapshot());
    }
    async createSnapshot() {
            this.requireTools();
            if (!this.validDescription()) throw new Error("Enter a Snapshot description with at least 4 characters.");
            if (this.scope === "all" && !this.all) throw new Error("All projects requires a library companion.");
            if (this.scope === "project" && !this.project) throw new Error("Choose the project you want to Snapshot.");
            this.emit("status", "Creating Snapshot...");
            const body = { message: this.message, push: false, scope: this.scope };
            if (this.scope === "project") body.project = this.project;
            const result = await this.transport("POST", "/api/snapshot", body);
            if (result.created) { this.message = DEFAULT_DESCRIPTION; this.emit("descriptionclear"); }
            this.emit("status", result.created ? "Snapshot saved: " + result.hash.slice(0, 12) : result.message);
            const warnings = result.warnings || [];
            this.emit("detail", warnings.length ? `${warnings.length} warnings; see Max Console.` : "No warnings.");
            warnings.forEach(warning => this.emit("console", warning));
            await this.refreshAfterOperation();
            return result;
    }
    push() {
        return this.run(async () => {
            this.requireTools();
            await this.refreshState();
            let committed = false;
            if (this.preview?.count > 0) committed = (await this.createSnapshot()).created;
            if (!this.repositoryState?.canPush) {
                this.emit("status", committed ? "Snapshot saved locally. No remote push available." : "Nothing to push to the configured tracking branch.");
                return;
            }
            this.emit("status", "Pushing repository history...");
            try { await this.transport("POST", "/api/push"); }
            catch (error) {
                await this.refreshAfterOperation();
                throw new Error((committed ? "Snapshot saved locally; push failed: " : "Push failed; local commits retained: ") + error.message);
            }
            this.emit("status", committed ? "Snapshot committed and pushed." : "Push complete.");
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
module.exports = { Client, normalizeLibraryPath, DEFAULT_DESCRIPTION, watchLibrary };
