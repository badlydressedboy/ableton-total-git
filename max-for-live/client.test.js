"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { Client, normalizeLibraryPath, watchLibrary } = require("./client");
const { spawnSync } = require("node:child_process");
const { createRequire } = require("node:module");
const os = require("node:os");
const zlib = require("node:zlib");
const { Preferences } = require("./preferences");
test("visibility probe reports drawing on the Task and goes hidden when drawing stops", () => {
    const vm = require("node:vm");
    const events = [];
    let tick, redraws = 0, cancelled = 0;
    const context = vm.createContext({
        mgraphics: { init() {}, redraw() { redraws++; } },
        Task: function (callback) { tick = callback; this.cancel = () => cancelled++; this.repeat = () => {}; },
        outlet: (...values) => events.push(values)
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, "visibility.js"), "utf8"), context);
    context.start(); tick();
    assert.deepEqual(events.at(-1), [0, "visible", 0]);
    context.paint();
    assert.equal(events.length, 1, "paint never sends Node messages on the drawing stack");
    tick(); assert.deepEqual(events.at(-1), [0, "visible", 1]);
    tick(); assert.deepEqual(events.at(-1), [0, "visible", 0]);
    context.paint(); tick(); assert.deepEqual(events.at(-1), [0, "visible", 1]);
    context.notifydeleted(); assert.equal(cancelled, 2); assert(redraws > 0);
});
test("Save button restores the cursor on completion without a mouse move and guards clicks", () => {
    const vm = require("node:vm");
    const cursors = [], events = [];
    const context = vm.createContext({
        mgraphics: { init() {}, redraw() {} }, box: { rect: [0, 0, 130, 25] },
        setcursor: value => cursors.push(value), outlet: (...values) => events.push(values)
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, "save-button.js"), "utf8"), context);
    context.onclick(10, 10); context.ondrag(10, 10, 0);
    assert.equal(events.length, 0, "Save starts disabled until unsaved changes are known");
    context.modified(1);
    context.onclick(10, 10); context.ondrag(10, 10, 0);
    assert.deepEqual(events, [[1, "bang"]]);
    context.active(0);
    context.onclick(10, 10); context.ondrag(10, 10, 0);
    assert.equal(events.length, 1, "disabled button cannot request another Save");
    cursors.length = 0;
    context.active(1);
    assert.deepEqual(cursors, [1], "completion restores the arrow without any mouse callback");
    cursors.length = 0;
    context.resetcursor();
    assert.deepEqual(cursors, [0, 1], "Save completion invalidates the cached cursor before restoring arrow");
    context.onclick(10, 10); context.ondrag(140, 10, 0);
    assert.equal(events.length, 1, "release outside cancels the click");
    context.onclick(10, 10); context.ondrag(10, 10, 0); context.ondrag(10, 10, 0);
    assert.equal(events.length, 2, "each released click requests Save only once");
    context.modified(0);
    context.active(1);
    context.onclick(10, 10); context.ondrag(10, 10, 0);
    assert.equal(events.length, 2, "an idle clean Set still cannot be saved");
});

test("hiding during state refresh prevents the following file scan", async () => {
    let visible = true, finish;
    const calls = [];
    const client = new Client(() => {}, async (_method, endpoint) => {
        calls.push(endpoint);
        return new Promise(resolve => { finish = resolve; });
    }, 17831, true);
    client.scanAllowed = () => visible;
    client.token = "test"; client.toolsReady = true; client.all = true;
    const refresh = client.refreshState();
    visible = false; finish({ initialized: true }); await refresh;
    await client.refreshState(); await client.refresh();
    assert.deepEqual(calls, ["/api/ui-state"]);
});

test("Live modification watcher distinguishes dirty Sets from Git changes and fails closed", () => {
    const { titleState, LiveSaveState } = require("./live-save-state");
    const { EventEmitter } = require("node:events");
    assert.deepEqual(titleState("Song - Ableton Live 12 Suite"), { known: true, modified: false });
    assert.deepEqual(titleState("Song (unsaved) - Ableton Live 12 Suite"), { known: true, modified: true });
    assert.deepEqual(titleState("Song* - Ableton Live 12 Suite"), { known: true, modified: true });
    assert.deepEqual(titleState("An unsaved idea - Ableton Live 12 Suite"), { known: true, modified: false });
    assert.deepEqual(titleState("Max Console"), { known: false, modified: false });
    const states = [], errors = [], children = [];
    const watcher = new LiveSaveState(__dirname, state => states.push(state), error => errors.push(error), () => {
        const child = new EventEmitter(); child.stdout = new EventEmitter(); child.stderr = new EventEmitter(); child.kill = () => { child.killed = true; };
        children.push(child); return child;
    });
    watcher.start(); watcher.start(); assert.equal(children.length, 1);
    const child = children[0];
    child.stdout.emit("data", '{"available":true,"title":"Song (un');
    child.stdout.emit("data", 'saved) - Ableton Live 12 Suite"}\n');
    assert.deepEqual(states.at(-1), { known: true, modified: true });
    child.stdout.emit("data", '{"available":true,"modified":false}\n');
    assert.deepEqual(states.at(-1), { known: true, modified: false }, "saving externally clears dirty state");
    child.stdout.emit("data", '{"available":false,"modified":true}\n');
    assert.deepEqual(states.at(-1), { known: false, modified: false });
    watcher.stop(); assert(child.killed);
    child.stdout.emit("data", '{"available":true,"modified":true}\n');
    assert.deepEqual(states.at(-1), { known: false, modified: false }, "closed watcher cannot enable Save");
    assert.equal(errors.length, 0);
});
test("library watcher queues saves behind operations, ignores metadata, and stops cleanly", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "AbletonGit-watch-"));
    fs.mkdirSync(path.join(root, "Project")); fs.mkdirSync(path.join(root, ".abletongit"));
    let ready = false, scans = 0;
    const errors = [];
    const watcher = watchLibrary(root, async () => { scans++; }, error => errors.push(error), () => ready, 30);
    const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
    try {
        fs.writeFileSync(path.join(root, ".abletongit", "library.json"), "{}");
        fs.writeFileSync(path.join(root, "Project", "Set.asd"), "cache");
        await pause(100); assert.equal(scans, 0);
        fs.writeFileSync(path.join(root, "Project", "Set.als"), "saved");
        fs.writeFileSync(path.join(root, "Project", "Set.als"), "saved again");
        await pause(100); assert.equal(scans, 0, "no scan during an operation");
        ready = true;
        const deadline = Date.now() + 2000;
        while (!scans && Date.now() < deadline) await pause(20);
        assert.equal(scans, 1, "save events are coalesced into one scan");
        watcher.close();
        fs.writeFileSync(path.join(root, "Project", "Set.als"), "after stop");
        await pause(100); assert.equal(scans, 1); assert.deepEqual(errors, []);
    } finally { watcher.close(); fs.rmSync(root, { recursive: true, force: true }); }
});
function testPreferences(root) { return { Preferences: class extends Preferences { constructor() { super(path.join(root, "device-preferences.json")); } } }; }
async function unusedPort() {
    const server = http.createServer();
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;
    await new Promise(resolve => server.close(resolve));
    return port;
}
const readyState = { initialized: true, canInitialize: false, canPush: false };
test("initialization dialog defers writes, accepts an optional remote and ignores stale replies", async () => {
    const events = [], writes = [];
    let state = { initialized: false, canInitialize: true, canPush: false };
    const client = new Client((...event) => events.push(event), async (method, endpoint, body) => {
        if (endpoint === "/api/ui-state") return state;
        if (endpoint === "/api/init") { writes.push(body); state = readyState; return {}; }
        return { count: 0, files: [] };
    }, 17831, true);
    client.token = "test"; client.toolsReady = true; client.all = true;
    await client.requestInitialization();
    assert.deepEqual(lastEvent(events, "initdialog"), ["initdialog"]);
    assert.equal(writes.length, 0, "opening or cancelling a dialog makes no writes");
    assert.equal(client.busy, false, "Cancel cannot leave controls locked");
    await client.confirmInitialization("  https://github.com/team/library  ");
    assert.deepEqual(writes, [{ remoteUrl: "https://github.com/team/library" }]);
    assert.equal(await client.confirmInitialization("https://github.com/other/repo"), false, "reply consumed once");
    state = { initialized: false, canInitialize: true, canPush: false };
    await client.requestInitialization(); await client.confirmInitialization("");
    assert.deepEqual(writes.at(-1), { remoteUrl: null });
    state = { initialized: false, canInitialize: true, canPush: false };
    await client.requestInitialization(); client.disconnect();
    client.token = "different-library"; client.toolsReady = true;
    assert.equal(await client.confirmInitialization("https://github.com/team/old"), false, "stale dialog cannot initialise a different library");
    assert.equal(writes.length, 2);
});
test("Repo link is conditional, opens only on click, and clears on disconnect or changed remote", async () => {
    const events = [];
    let state = { ...readyState, repository: { gitHubUrl: "https://github.com/musician/library" } };
    const client = new Client((...event) => events.push(event), async (_method, endpoint) =>
        endpoint === "/api/ui-state" ? state : { count: 0, files: [] }, 17831, true);
    assert.equal(client.openRepository(), false);
    client.token = "test"; client.toolsReady = true; client.all = true;
    await client.refreshState();
    assert.deepEqual(lastEvent(events, "repovisible"), ["repovisible", 1]);
    assert.equal(events.filter(e => e[0] === "repourl").length, 0, "polling never opens browser");
    assert.equal(client.openRepository(), true);
    assert.deepEqual(lastEvent(events, "repourl"), ["repourl", "https://github.com/musician/library"]);
    for (const next of [
        { ...state, initialized: false },
        { ...readyState, repository: { gitHubUrl: null } },
        { ...readyState, repository: { gitHubUrl: "https://github.com.evil.test/musician/library" } }
    ]) {
        state = next; await client.refreshState();
        assert.deepEqual(lastEvent(events, "repovisible"), ["repovisible", 0]);
        assert.equal(client.openRepository(), false);
    }
    state = { ...readyState, repository: { gitHubUrl: "https://github.com/other/repo" } };
    await client.refreshState(); client.openRepository();
    assert.deepEqual(lastEvent(events, "repourl"), ["repourl", "https://github.com/other/repo"]);
    client.disconnect();
    assert.deepEqual(lastEvent(events, "repovisible"), ["repovisible", 0]);
    assert.equal(client.openRepository(), false);
});
const changedPreview = { count: 1, files: [{ state: " M", path: "Dub/Set.als" }] };
function lastEvent(events, kind) { return events.filter(e => e[0] === kind).at(-1); }

test("library paths accept both slash styles, quotes, spaces, Unicode and UNC", () => {
    const expected = "G:/My Drive/Music/Ableton/Projects/Live Sets";
    for (const input of [expected, String.raw`G:\My Drive\Music\Ableton\Projects\Live Sets`,
        String.raw`  "G:\My Drive\Music/Ableton\Projects/Live Sets"  `])
        assert.equal(normalizeLibraryPath(input, "win32"), expected);
    assert.equal(normalizeLibraryPath(String.raw`'C:\Music  Library\音 Project'`, "win32"), "C:/Music  Library/音 Project");
    assert.equal(normalizeLibraryPath(String.raw`\\server\Music Share\音 Project`, "win32"), "//server/Music Share/音 Project");
    assert.equal(normalizeLibraryPath("  "), "");
    assert.equal(normalizeLibraryPath("relative\\folder", "win32"), "relative/folder");
});
test("library preference survives reloads, normalises paths and repairs malformed storage", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "AbletonGit-preferences-"));
    try {
        const filename = path.join(root, "settings", "preferences.json"), preferences = new Preferences(filename);
        assert.equal(preferences.loadLibrary(), "");
        preferences.saveLibrary(String.raw`"G:\My Drive\Music\音 Library"`);
        assert.equal(new Preferences(filename).loadLibrary(), normalizeLibraryPath(String.raw`"G:\My Drive\Music\音 Library"`));
        preferences.saveLibrary(String.raw`\\server\Music Share\Projects`);
        assert.equal(new Preferences(filename).loadLibrary(), normalizeLibraryPath(String.raw`\\server\Music Share\Projects`));
        fs.writeFileSync(filename, "broken JSON"); assert.throws(() => preferences.loadLibrary());
        preferences.saveLibrary("C:/New Library"); assert.equal(preferences.loadLibrary(), "C:/New Library");
        assert.deepEqual(fs.readdirSync(path.dirname(filename)), ["preferences.json"]);
        assert.deepEqual(JSON.parse(fs.readFileSync(filename)), { library: "C:/New Library" });
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("project selection is explicit; scope sends only intended API fields", async () => {
    const requests = [], events = [];
    const client = new Client((...e) => events.push(e), async (...args) => {
        requests.push(args);
        if (args[1] === "/api/ui-state") return readyState;
        if (args[1].startsWith("/api/preview")) return changedPreview;
        return args[0] === "GET" ? { all: true, projects: [{ path: "Dub 音", name: "Dub 音" }] } :
            { created: true, hash: "abcdef0123456789", warnings: [] };
    });
    client.token = "A".repeat(64); client.toolsReady = true; client.message = "Bass variation";
    await client.refresh();
    assert.equal(await client.snapshot(), false);
    assert.equal(requests.length, 1);
    await client.select(1); await client.snapshot();
    assert.deepEqual(requests.filter(r => r[0] === "POST")[0], ["POST", "/api/snapshot", { message: "Bass variation", push: false, scope: "project", project: "Dub 音" }]);
    client.message = "Library variation"; await client.selectScope(1); await client.snapshot();
    assert.deepEqual(requests.filter(r => r[0] === "POST")[1][2], { message: "Library variation", push: false, scope: "all" });
    assert(events.some(e => e[0] === "warning" && e[1].includes("All projects")));
});
test("busy blocks repeated clicks and scope changes; failure unlocks controls", async () => {
    let finish, calls = 0;
    const client = new Client(() => {}, (method, endpoint) => {
        if (method === "GET") return Promise.resolve(endpoint === "/api/ui-state" ? readyState : changedPreview);
        calls++; return new Promise(resolve => { finish = resolve; });
    });
    client.token = "token"; client.toolsReady = true; client.message = "Description"; client.project = "Dub";
    const pending = client.snapshot();
    assert.equal(await client.snapshot(), false); assert.equal(await client.push(), false);
    client.selectScope(1); client.select(0); assert.equal(client.scope, "project"); assert.equal(client.project, "Dub");
    finish({ created: false, message: "No changes", warnings: [] }); await pending;
    assert.equal(calls, 1); assert.equal(client.busy, false);
    client.transport = async () => { throw new Error("Remote unavailable"); };
    assert.equal(await client.push(), false); assert.equal(client.busy, false);
});
test("removed project is cleared and single mode rejects all scope", async () => {
    const client = new Client(() => {}, async () => ({ all: false, projects: [] }));
    client.token = "token"; client.toolsReady = true; client.project = "Removed"; client.message = "Description";
    await client.refresh(); assert.equal(client.project, null);
    client.selectScope(1); assert.equal(await client.snapshot(), false);
});
test("real loopback transport uses token and reports structured server errors", async () => {
    const server = http.createServer((request, response) => {
        assert.equal(request.headers["x-abletongit-token"], "A".repeat(64));
        assert.equal(request.headers.origin, undefined);
        response.writeHead(400, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: "Run Init first." }));
    });
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    try {
        const events = [], client = new Client((...e) => events.push(e), undefined, server.address().port);
        client.token = "A".repeat(64); client.toolsReady = true; client.project = "Dub"; client.message = "Saved";
        assert.equal(await client.snapshot(), false);
        assert(events.some(e => e[0] === "status" && e[1] === "Run Init first."));
    } finally { await new Promise(resolve => server.close(resolve)); }
});
test("patch wires every action to Node, passes audio through and has no project selectors", () => {
    const patch = JSON.parse(fs.readFileSync(path.join(__dirname, "Ableton Total Git.maxpat"))).patcher;
    const ids = new Set(patch.boxes.map(b => b.box.id));
    for (const { patchline: line } of patch.lines) assert(ids.has(line.source[0]) && ids.has(line.destination[0]));
    for (const id of ["savelive", "init", "refresh", "push"])
        assert(patch.lines.some(l => l.patchline.source[0] === id + "cmd" && l.patchline.destination[0] === "node"));
    assert.equal(patch.lines.filter(l => l.patchline.source[0] === "audioin" && l.patchline.destination[0] === "audioout").length, 2);
    assert(!patch.boxes.some(({ box }) => ["project", "scope", "defaultscope"].includes(box.id)), "whole-library UI has no project selectors");
    assert(patch.lines.some(l => l.patchline.source[0] === "set6" && l.patchline.destination[0] === "details"));
    assert(!patch.lines.some(l => l.patchline.source[0] === "set6" && ["status", "warning"].includes(l.patchline.destination[0])));
    assert.equal(patch.boxes.find(b => b.box.id === "library").box.outputmode, 1, "path transported as one literal symbol");
    assert(patch.lines.some(l => l.patchline.source[0] === "node" && l.patchline.source[1] === 1 && l.patchline.destination[0] === "runtimeconsole"));
    assert(patch.lines.some(l => l.patchline.source[0] === "scriptstart" && l.patchline.destination[0] === "node"));
    assert.equal(patch.boxes.find(b => b.box.id === "visibilityprobe").box.filename, "visibility.js");
    assert(patch.lines.some(l => l.patchline.source[0] === "visibilityprobe" && l.patchline.destination[0] === "node"));
    assert(patch.lines.some(l => l.patchline.source[0] === "route" && l.patchline.source[1] === 19 && l.patchline.destination[0] === "visibilityprobe"));
    assert.equal(patch.boxes.find(b => b.box.id === "deviceready").box.text, "live.thisdevice");
    assert.equal(patch.boxes.find(b => b.box.id === "node").box.text, "node.script device.js @autostart 0 @defer 1");
    for (const [from, to] of [["deviceready", "startonce"], ["startonce", "startdefer"], ["startdefer", "scriptstart"]])
        assert(patch.lines.some(l => l.patchline.source[0] === from && l.patchline.destination[0] === to), from + " reaches " + to);
    assert(!patch.boxes.some(b => b.box.id === "snapshot"), "one combined Push button");
    for (const id of ["push", "init"]) {
        assert.equal(patch.boxes.find(b => b.box.id === id).box.active, 0);
        assert(patch.lines.some(l => l.patchline.source[0] === id + "active" && l.patchline.destination[0] === id));
        assert(!patch.lines.some(l => l.patchline.source[0] === "active" && l.patchline.destination[0] === id));
    }
    const list = patch.boxes.find(b => b.box.id === "filelist").box;
    assert.equal(list.maxclass, "jsui"); assert.equal(list.filename, "file-list.js");
    assert.equal(list.border, 0);
    assert(patch.lines.some(l => l.patchline.source[0] === "libraryrestore" && l.patchline.destination[0] === "library"));
    assert.equal(patch.devicewidth, 930);
    for (const { box } of patch.boxes.filter(b => b.box.presentation === 1)) {
        assert(box.presentation_rect[0] + box.presentation_rect[2] <= patch.devicewidth, box.id + " fits device width");
        assert(box.presentation_rect[1] + box.presentation_rect[3] <= 169, box.id + " fits Live device height");
    }
    assert(patch.lines.some(l => l.patchline.source[0] === "descriptionclear" && l.patchline.destination[0] === "description"));
    assert(!patch.boxes.some(({ box }) => box.id === "stop"), "companion lifecycle is automatic");
    assert(!patch.boxes.some(({ box }) => box.id === "start"), "folder input starts the companion automatically");
    assert.equal(patch.boxes.find(({box}) => box.id === "init").box.text, "Initialise repo");
    assert.equal(patch.boxes.find(({box}) => box.id === "savelive").box.filename, "save-button.js");
    assert(patch.lines.some(({patchline}) => patchline.source[0] === "route" && patchline.source[1] === 23 && patchline.destination[0] === "savefinisheddefer"));
    assert(patch.lines.some(({patchline}) => patchline.source[0] === "savecursorreset" && patchline.destination[0] === "savelive"));
});
test("startup preflight gates writes, reports failures and supports recovery", async () => {
    const requests = [], events = []; let available = false;
    const client = new Client((...e) => events.push(e), async (method, endpoint) => {
        requests.push([method, endpoint]);
        return { ready: available, checks: [{ level: available ? "PASS" : "FAIL", message: "Install Git LFS and restart Live." }] };
    });
    client.token = "token"; client.message = "Saved"; client.project = "Dub";
    assert.equal(await client.snapshot(), false);
    assert.equal(await client.push(), false); assert.equal(await client.init(), false);
    assert.equal(requests.length, 0); assert.equal(lastEvent(events, "mutations")[1], 0);
    assert.equal(await client.run(() => client.checkTools()), false);
    assert(events.some(e => e[0] === "status" && e[1].includes("Install Git LFS")));
    assert.equal(client.toolsReady, false); assert.equal(lastEvent(events, "mutations")[1], 0);
    available = true;
    assert.equal(await client.run(() => client.checkTools()), true);
    assert.equal(client.toolsReady, true); assert.deepEqual(lastEvent(events, "mutations"), ["mutations", 1]);
    client.transport = async () => { throw new Error("Companion disconnected"); };
    assert.equal(await client.run(() => client.checkTools()), false);
    assert.equal(client.toolsReady, false); assert.deepEqual(lastEvent(events, "mutations"), ["mutations", 0]);
    client.toolsReady = true; client.disconnect();
    assert.equal(client.token, null); assert.equal(client.toolsReady, false);
    assert(requests.every(r => r[0] === "GET" && r[1] === "/api/tools"));
});
const packagePath = process.env.ABLETON_GIT_TEST_PACKAGE || path.resolve(__dirname, "../artifacts/max-for-live");
test("background reads keep Refresh and available actions stable while a manual action locks them", async () => {
    const events = []; let finish, slow = false;
    const client = new Client((...e) => events.push(e), async (method, endpoint) => {
        if (endpoint === "/api/ui-state") return { ...readyState, canPush: true };
        if (slow) return new Promise(resolve => { finish = resolve; });
        return changedPreview;
    });
    client.token = "token"; client.toolsReady = true; client.project = "Dub";
    await client.refreshState(); events.length = 0; slow = true;
    const pending = client.refreshState();
    while (!finish) await new Promise(resolve => setImmediate(resolve));
    assert(!events.some(e => e[0].endsWith("enabled")), "polling sends no enable/disable transitions");
    finish(changedPreview); await pending;
    assert(!events.some(e => e[0].endsWith("enabled")), "unchanged poll stays stable");
    let unlock; const action = client.run(() => new Promise(resolve => { unlock = resolve; }));
    assert.deepEqual(lastEvent(events, "refreshenabled"), ["refreshenabled", 0]);
    unlock(); await action;
    assert.deepEqual(lastEvent(events, "refreshenabled"), ["refreshenabled", 1]);
});
test("each button reflects lifecycle, initialisation, busy state and pending pushes", async () => {
    const events = [], requests = []; let pendingFiles = true, state = { initialized: false, canInitialize: true, canPush: false };
    const client = new Client((...e) => events.push(e), async (method, endpoint) => {
        requests.push([method, endpoint]);
        if (endpoint === "/api/ui-state") return state;
        if (endpoint.startsWith("/api/preview")) return pendingFiles ? changedPreview : { files: [], count: 0 };
        if (endpoint === "/api/init") { state = readyState; return {}; }
        if (endpoint === "/api/snapshot") { pendingFiles = false; return { created: true, hash: "abcdef0123456789", warnings: [] }; }
        if (endpoint === "/api/push") { state = readyState; return {}; }
        throw new Error("Unexpected request " + endpoint);
    });
    assert.deepEqual(lastEvent(events, "stopenabled"), ["stopenabled", 0]);
    assert.deepEqual(lastEvent(events, "startenabled"), ["startenabled", 1]);
    client.setRunning(true); client.token = "token"; client.toolsReady = true; client.project = "Dub";
    await client.refreshState();
    assert.deepEqual(lastEvent(events, "initenabled"), ["initenabled", 1]);
    assert.deepEqual(lastEvent(events, "stopenabled"), ["stopenabled", 1]);
    assert.deepEqual(lastEvent(events, "startenabled"), ["startenabled", 0]);
    assert.deepEqual(lastEvent(events, "pushenabled"), ["pushenabled", 0]);
    await client.init();
    assert.deepEqual(lastEvent(events, "initenabled"), ["initenabled", 0]);
    assert.deepEqual(lastEvent(events, "snapshotenabled"), ["snapshotenabled", 1]);
    assert.deepEqual(lastEvent(events, "pushenabled"), ["pushenabled", 1]);
    assert.equal(await client.push(), true);
    assert(!requests.some(r => r[0] === "POST" && r[1] === "/api/push"));
    state = { ...readyState, canPush: true }; await client.refreshState();
    assert.deepEqual(lastEvent(events, "pushenabled"), ["pushenabled", 1]);
    let finish; const pending = client.run(() => new Promise(resolve => { finish = resolve; }));
    for (const kind of ["startenabled", "stopenabled", "initenabled", "snapshotenabled", "pushenabled", "refreshenabled"])
        assert.deepEqual(lastEvent(events, kind), [kind, 0]);
    finish(); await pending;
    await client.push(); assert.deepEqual(lastEvent(events, "pushenabled"), ["pushenabled", 0]);
    client.disconnect();
    for (const kind of ["stopenabled", "initenabled", "snapshotenabled", "pushenabled", "refreshenabled"])
        assert.deepEqual(lastEvent(events, kind), [kind, 0]);
});
test("description returns to Raw Creativity after a created commit; failures preserve edits", async () => {
    const events = []; let outcome = "created", committed = false;
    const client = new Client((...e) => events.push(e), async (method, endpoint) => {
        if (endpoint === "/api/ui-state") return { ...readyState, canPush: committed };
        if (endpoint.startsWith("/api/preview")) return committed ? { files: [], count: 0 } : changedPreview;
        if (outcome === "error") throw new Error("Commit failed");
        committed = outcome === "created";
        return { created: committed, hash: "abcdef0123456789", message: "No changes", warnings: [] };
    });
    client.token = "token"; client.toolsReady = true; client.project = "Dub"; client.message = "Description";
    await client.snapshot(); assert.equal(client.message, "Raw Creativity");
    assert.equal(events.filter(e => e[0] === "descriptionclear").length, 1);
    assert.deepEqual(lastEvent(events, "filesummary"), ["filesummary", "0 files will be committed."]);
    assert.deepEqual(lastEvent(events, "snapshotenabled"), ["snapshotenabled", 0]);
    assert.deepEqual(lastEvent(events, "pushenabled"), ["pushenabled", 1]);
    outcome = "noop"; client.message = "Keep for next commit"; await client.snapshot();
    assert.equal(client.message, "Keep for next commit");
    outcome = "error"; assert.equal(await client.snapshot(), false);
    assert.equal(client.message, "Keep for next commit");
    assert.equal(events.filter(e => e[0] === "descriptionclear").length, 1);
});
test("combined Push commits selected files before pushing and retries a failed push without another commit", async () => {
    const events = [], writes = [];
    let pending = true, ahead = false, failPush = true;
    const client = new Client((...e) => events.push(e), async (method, endpoint, body) => {
        if (endpoint === "/api/ui-state") return { ...readyState, canPush: ahead };
        if (endpoint.startsWith("/api/preview")) return pending ? changedPreview : { files: [], count: 0 };
        writes.push([endpoint, body]);
        if (endpoint === "/api/snapshot") { pending = false; ahead = true; return { created: true, hash: "abcdef0123456789", warnings: [] }; }
        if (failPush) throw new Error("Remote unavailable");
        ahead = false; return {};
    });
    client.token = "token"; client.toolsReady = true; client.project = "Dub"; client.setDescription("New arrangement");
    assert.equal(await client.push(), false);
    assert.deepEqual(writes.map(w => w[0]), ["/api/snapshot", "/api/push"]);
    assert.deepEqual(writes[0][1], { message: "New arrangement", scope: "project", project: "Dub", push: false });
    assert.equal(client.message, "Raw Creativity");
    assert(lastEvent(events, "status")[1].includes("Snapshot saved locally; push failed"));
    assert.deepEqual(lastEvent(events, "pushenabled"), ["pushenabled", 1]);
    failPush = false; client.setDescription("a");
    assert.equal(await client.push(), true, "pushing an existing commit does not require another description");
    assert.deepEqual(writes.map(w => w[0]), ["/api/snapshot", "/api/push", "/api/push"]);
    assert.deepEqual(lastEvent(events, "pushenabled"), ["pushenabled", 0]);
});
test("combined Push preserves a local all-projects commit without a remote and blocks short descriptions", async () => {
    const events = [], writes = []; let pending = true;
    const client = new Client((...e) => events.push(e), async (method, endpoint, body) => {
        if (endpoint === "/api/ui-state") return readyState;
        if (endpoint.startsWith("/api/preview")) return pending ? changedPreview : { files: [], count: 0 };
        writes.push([endpoint, body]); pending = false;
        return { created: true, hash: "abcdef0123456789", warnings: [] };
    });
    client.token = "token"; client.toolsReady = true; client.all = true; client.scope = "all";
    client.setDescription("abc"); await client.refreshState();
    assert.deepEqual(lastEvent(events, "pushenabled"), ["pushenabled", 0]);
    assert.equal(await client.push(), false); assert.equal(writes.length, 0);
    client.setDescription("Raw Creativity");
    assert.equal(await client.push(), true);
    assert.deepEqual(writes, [["/api/snapshot", { message: "Raw Creativity", scope: "all", push: false }]]);
    assert.equal(lastEvent(events, "status")[1], "Snapshot saved locally. No remote push available.");
});
test("Snapshot requires four trimmed description characters in controls and direct requests", async () => {
    const events = [], requests = [];
    const client = new Client((...e) => events.push(e), async (...args) => { requests.push(args); throw new Error("unexpected request"); });
    client.token = "token"; client.toolsReady = true; client.project = "Dub";
    client.repositoryState = readyState; client.preview = changedPreview;
    assert.equal(client.message, "Raw Creativity");
    for (const value of ["", "   ", "abc", "  abc  "]) {
        client.setDescription(value);
        assert.deepEqual(lastEvent(events, "snapshotenabled"), ["snapshotenabled", 0]);
        assert.equal(await client.snapshot(), false);
    }
    assert.equal(requests.length, 0, "invalid descriptions cannot send a snapshot request");
    client.setDescription("abcd");
    assert.deepEqual(lastEvent(events, "snapshotenabled"), ["snapshotenabled", 1]);
});
test("file list retains more than ten files and stale preview cannot overwrite new scope", async () => {
    const events = [], files = Array.from({ length: 23 }, (_, i) => ({ state: "??", path: `Dub/Audio ${i},; 音.wav` }));
    let finish;
    const client = new Client((...e) => events.push(e), async (method, endpoint) => {
        if (endpoint === "/api/ui-state") return readyState;
        if (endpoint.includes("scope=project")) return new Promise(resolve => { finish = resolve; });
        return { count: files.length, files };
    });
    client.token = "token"; client.toolsReady = true; client.project = "Dub"; client.all = true;
    const pending = client.refreshState();
    while (!finish) await new Promise(resolve => setImmediate(resolve));
    const changed = client.selectScope(1);
    finish({ count: 1, files: [{ state: " M", path: "old-scope.als" }] });
    await pending; await changed;
    assert.deepEqual(lastEvent(events, "filelist").slice(0, 5), ["filelist", "set", 1, 22, files[22].path]);
    assert.deepEqual(lastEvent(events, "filesummary"), ["filesummary", "23 files will be committed."]);
    assert(!events.some(e => e[0] === "filelist" && e.includes("old-scope.als")));
    const writes = events.filter(e => e[0] === "filelist").length;
    await client.refreshState(); assert.equal(events.filter(e => e[0] === "filelist").length, writes, "unchanged refresh keeps scroll position");
});
test("large warning lists go to console and leave Snapshot status readable", async () => {
    const events = [], warnings = Array.from({ length: 120 }, (_, i) => `Project ${i}: ` + "Very long warning with external samples. ".repeat(50));
    const client = new Client((...e) => events.push(e), async (method, endpoint) => method === "POST" ?
        { created: true, hash: "abcdef0123456789", warnings } : endpoint === "/api/ui-state" ? readyState : changedPreview);
    client.token = "token"; client.toolsReady = true; client.message = "Saved"; client.project = "Dub";
    await client.snapshot();
    assert.deepEqual(events.filter(e => e[0] === "detail"), [["detail", "120 warnings; see Max Console."]]);
    assert.deepEqual(events.filter(e => e[0] === "console").map(e => e[1]), warnings);
    assert.deepEqual(events.filter(e => e[0] === "status").at(-1), ["status", "Snapshot saved: abcdef012345"]);
});
test("device startup with no Git on PATH reports repair guidance and keeps writes disabled", {
    skip: !fs.existsSync(path.join(packagePath, "companion/AbletonGit.Api" + (process.platform === "win32" ? ".exe" : "")))
}, async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "AbletonGit-missing-tools-"));
    const testPort = await unusedPort();
    const handlers = new Map(), events = [];
    const mock = { addHandler: (name, handler) => handlers.set(name, handler), outlet: (...args) => events.push(args), post: text => events.push(["console", text]) };
    const filename = path.join(packagePath, "device.js"), localRequire = createRequire(filename);
    const processes = require("node:child_process");
    const packaged = localRequire("./client");
    const load = new Function("require", "__dirname", "module", "exports", fs.readFileSync(filename, "utf8"));
    load(name => name === "max-api" ? mock : name === "child_process" ? {
        spawn: (executable, args, options) => processes.spawn(executable, [...args, "--port", String(testPort)], { ...options, env: { ...process.env, PATH: "" } })
    } : name === "./client" ? { ...packaged, Client: class extends packaged.Client { constructor(emit, transport, _port, libraryOnly) { super(emit, transport, testPort, libraryOnly); } } } : name === "./preferences" ? testPreferences(root) : localRequire(name), packagePath, { exports: {} }, {});
    try {
        assert.equal(await handlers.get("library")(root), false, "folder entry automatically checks the missing tools");
        assert.equal(await handlers.get("start")(), false);
        assert(!events.some(e => e[0] === "status" && e[1].startsWith("Ready.")));
        assert(events.some(e => e[0] === "console" && e[1].includes("Install Git") && e[1].includes("PATH")), JSON.stringify(events));
        assert(!events.some(e => e[0] === "mutations" && e[1] === 1));
        assert.equal(await handlers.get("snapshot")(), false);
        assert.equal(await handlers.get("push")(), false);
        assert(!fs.existsSync(path.join(root, ".git")));
    } finally {
        await handlers.get("stop")();
        await new Promise(resolve => setTimeout(resolve, 200));
        fs.rmSync(root, { recursive: true, force: true });
    }
});
test("Save Live Set works without a companion, prevents duplicate requests and reports helper failures", async () => {
    const { EventEmitter } = require("node:events");
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "AbletonGit-save-"));
    const handlers = new Map(), launches = [], events = [];
    const filename = path.join(__dirname, "device.js"), localRequire = createRequire(filename);
    const load = new Function("require", "__dirname", "module", "exports", fs.readFileSync(filename, "utf8"));
    load(name => name === "max-api" ? { addHandler: (name, handler) => handlers.set(name, handler), outlet: (...args) => events.push(args), post() {} } :
        name === "child_process" ? { spawn: (...args) => { const child = new EventEmitter(); child.stderr = new EventEmitter(); child.kill = () => {}; launches.push({args,child}); return child; } } :
        name === "./preferences" ? testPreferences(root) : name === "./live-save-state" ? {
            LiveSaveState: class { constructor(_directory, callback) { this.callback = callback; } start() { this.callback({ known: true, modified: true }); } stop() { this.callback({ known: false, modified: false }); } }
        } : localRequire(name), __dirname, { exports: {} }, {});
    try {
        assert.equal(await handlers.get("savelive")(), false, "unknown modification state blocks Save");
        assert.equal(launches.length, 0);
        await handlers.get("visible")(1);
        const first = handlers.get("savelive")();
        assert.equal(await handlers.get("savelive")(), false);
        assert(!events.some(event => event[0] === "savefinished"), "blocked duplicate must not signal completion during Save");
        assert.equal(launches.length, 1, "one Save helper despite repeated click");
        launches[0].child.stderr.emit("data", Buffer.from("Could not focus Live")); launches[0].child.emit("exit", 1);
        assert.equal(await first, false); assert.equal(lastEvent(events,"status")[1], "Could not focus Live");
        assert.equal(events.filter(event => event[0] === "savefinished").length, 1, "failed Save still restores the cursor");
        const second = handlers.get("savelive")(); launches[1].child.emit("exit", 0);
        assert.equal(await second, true); assert(lastEvent(events,"status")[1].startsWith("Save requested"));
        assert(!events.some(event => event[0] === "busy"), "Save never starts the device's busy UI");
        assert.equal(events.filter(event => event[0] === "savefinished").length, 2, "successful Save signals cursor reset after helper exit");
        assert(launches.every(x => x.args[2].shell === false && x.args[2].windowsHide === true));
        await handlers.get("visible")(0);
        assert.equal(await handlers.get("savelive")(), false, "hidden/unknown state blocks Save");
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("Git status opens a visible persistent PowerShell with the library as a literal working folder", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "AbletonGit-shell-"));
    const library = path.join(root, "Music $() ; ' space"); fs.mkdirSync(library);
    const handlers = new Map(), launches = [];
    const filename = path.join(packagePath, "device.js"), localRequire = createRequire(filename);
    const load = new Function("require", "__dirname", "module", "exports", fs.readFileSync(filename, "utf8"));
    const mock = { addHandler: (name, handler) => handlers.set(name, handler), outlet: () => {}, post: () => {} };
    load(name => name === "max-api" ? mock : name === "child_process" ? {
        spawn: (...args) => { launches.push(args); return { once(event, handler) { if (event === "exit") queueMicrotask(() => handler(0)); } }; }
    } : name === "./preferences" ? testPreferences(root) : name === "./platform" ? { ...localRequire(name), companionExecutable: () => path.join(root, "missing-api") } : localRequire(name), packagePath, { exports: {} }, {});
    try {
        await handlers.get("library")(library);
        assert.equal(await handlers.get("gitstatus")(), true);
        const [executable, args, options] = launches[0];
        if (process.platform === "win32") {
        assert.equal(path.basename(executable).toLowerCase(), "powershell.exe");
        assert.deepEqual(args.slice(0, 4), ["-NoLogo", "-NoProfile", "-NonInteractive", "-EncodedCommand"]);
        const launch = Buffer.from(args[4], "base64").toString("utf16le");
        assert(launch.includes("Start-Process") && launch.includes("'-NoExit'") && launch.includes("'git status'"));
        assert(launch.includes("-WindowStyle Normal")); assert(!launch.includes(library));
        } else { assert.equal(executable, "/usr/bin/osascript"); assert(args.includes("do script (item 1 of argv)")); }
        assert.equal(options.cwd, library); assert.equal(options.shell, false);
        assert.equal(options.windowsHide, true, "only the short-lived launcher is hidden");
        handlers.get("library")(path.join(root, "missing"));
        assert.equal(await handlers.get("gitstatus")(), false);
        assert.equal(launches.length, 1, "invalid folders do not open a terminal");
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
test("published device launches companion, initialises and Snapshots a real library without a shell", {
    skip: !fs.existsSync(path.join(packagePath, "companion/AbletonGit.Api" + (process.platform === "win32" ? ".exe" : "")))
}, async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "AbletonGit-device-"));
    const nextRoot = fs.mkdtempSync(path.join(os.tmpdir(), "AbletonGit-restart-"));
    let activeClient;
    const ownedChildren = [];
    const testPort = await unusedPort();
    const project = path.join(root, "Dub Project 音");
    fs.mkdirSync(path.join(project, "Ableton Project Info"), { recursive: true });
    fs.writeFileSync(path.join(project, "Dub.als"), zlib.gzipSync('<Ableton Creator="Ableton Live 12.3" MajorVersion="5" MinorVersion="12.0_0"><LiveSet><Tracks/><Scenes/></LiveSet></Ableton>'));
    const handlers = new Map(), events = [];
    const mock = { addHandler: (name, handler) => handlers.set(name, handler), outlet: (...args) => events.push(args), post: text => events.push(["console", text]) };
    const filename = path.join(packagePath, "device.js"), localRequire = createRequire(filename);
    const processes = require("node:child_process"), packaged = localRequire("./client");
    const load = new Function("require", "__dirname", "module", "exports", fs.readFileSync(filename, "utf8"));
    load(name => name === "max-api" ? mock : name === "child_process" ? {
        spawn: (executable, args, options) => { const owned = processes.spawn(executable, [...args, "--port", String(testPort)], options); ownedChildren.push(owned); return owned; }
    } : name === "./client" ? { ...packaged, Client: class extends packaged.Client { constructor(emit, transport, _port, libraryOnly) { super(emit, transport, testPort, libraryOnly); activeClient = this; } } } : name === "./preferences" ? testPreferences(root) : localRequire(name), packagePath, { exports: {} }, {});
    try {
        assert.equal(await handlers.get("library")('"' + root + '"'), true, "first folder submission auto-starts without clicking Start");
        assert(events.some(e => e[0] === "status" && e[1].startsWith("Companion running.")), JSON.stringify(events));
        assert.equal(activeClient.preview, null, "hidden startup does not scan files");
        assert.equal(activeClient.projects.length, 0, "hidden startup does not enumerate projects");
        await handlers.get("visible")(1);
        await handlers.get("init")();
        for (const [key, value] of [["user.name", "Device Test"], ["user.email", "device@example.invalid"], ["commit.gpgsign", "false"]]) {
            const result = spawnSync("git", ["-C", root, "config", key, value], { shell: false }); assert.equal(result.status, 0);
        }
        assert(!handlers.has("project") && !handlers.has("scope")); handlers.get("description")("Saved through device");
        await handlers.get("snapshot")();
        assert(events.some(e => e[0] === "status" && e[1].startsWith("Snapshot saved:")), JSON.stringify(events));
        const log = spawnSync("git", ["-C", root, "log", "-1", "--format=%s"], { encoding: "utf8", shell: false });
        assert.equal(log.stdout.trim(), "Saved through device");
        assert(!JSON.stringify(events).includes("X-AbletonGit-Token"));
        await handlers.get("stop")();
        assert.equal(new Preferences(path.join(root, "device-preferences.json")).loadLibrary(), normalizeLibraryPath(root));
        events.length = 0;
        const reloaded = { exports: {} };
        load(name => name === "max-api" ? mock : name === "child_process" ? {
            spawn: (executable, args, options) => { const owned = processes.spawn(executable, [...args, "--port", String(testPort)], options); ownedChildren.push(owned); return owned; }
        } : name === "./client" ? { ...packaged, Client: class extends packaged.Client { constructor(emit, transport, _port, libraryOnly) { super(emit, transport, testPort, libraryOnly); activeClient = this; } } } : name === "./preferences" ? testPreferences(root) : localRequire(name), packagePath, reloaded, {});
        assert.deepEqual(lastEvent(events, "libraryrestore"), ["libraryrestore", normalizeLibraryPath(root)]);
        assert.equal(await reloaded.exports.startup, true, "reloaded device auto-starts with remembered path without clicking Start");
        assert.equal(activeClient.preview, null, "reload remains scan-free until visible");
        await handlers.get("visible")(1);
        assert.deepEqual(lastEvent(events, "stopenabled"), ["stopenabled", 1]);
        assert.equal(lastEvent(events, "scopeselect"), undefined, "no scope control to restore");
        assert.deepEqual(lastEvent(events, "filesummary"), ["filesummary", "0 files will be committed."], "startup finishes the All projects scan without a Refresh click");
        await handlers.get("visible")(0);
        const hiddenCalls = [];
        const actualTransport = activeClient.transport;
        activeClient.transport = (...args) => { hiddenCalls.push(args[1]); return actualTransport(...args); };
        fs.copyFileSync(path.join(project, "Dub.als"), path.join(project, "Changed while hidden.als"));
        await activeClient.refresh(); await activeClient.refreshState();
        await new Promise(resolve => setTimeout(resolve, 5500));
        assert.deepEqual(hiddenCalls, [], "hidden device sends no project/state/preview scans from saves or polling");
        await handlers.get("visible")(1);
        assert(hiddenCalls.some(endpoint => endpoint.startsWith("/api/preview")), "showing the device scans immediately");
        assert(activeClient.preview.files.some(file => file.path.endsWith("Changed while hidden.als")));
        activeClient.transport = actualTransport;

        const oldToken = activeClient.token;
        assert.equal(await handlers.get("library")(path.join(root, "missing")), false, "invalid folder keeps the old companion running");
        assert.equal(activeClient.token, oldToken);
        let finish;
        const operation = activeClient.run(() => new Promise(resolve => { finish = resolve; }));
        assert.equal(await handlers.get("library")(nextRoot), false, "folder change queued behind operation");
        assert.equal(new Preferences(path.join(root, "device-preferences.json")).loadLibrary(), normalizeLibraryPath(root));
        assert.equal(activeClient.token, oldToken, "no restart during the operation");
        finish(); await operation;
        const deadline = Date.now() + 10000;
        while ((activeClient.busy || activeClient.token === oldToken || !activeClient.toolsReady) && Date.now() < deadline)
            await new Promise(resolve => setTimeout(resolve, 25));
        assert(activeClient.toolsReady && !activeClient.busy && activeClient.token !== oldToken, "restart completes with a fresh API token");
        assert.equal(new Preferences(path.join(root, "device-preferences.json")).loadLibrary(), normalizeLibraryPath(nextRoot));
        assert.deepEqual(lastEvent(events, "filesummary"), ["filesummary", "Initialise the library to preview files."]);

        const beforeRecovery = activeClient.token;
        const closed = new Promise(resolve => ownedChildren.at(-1).once("exit", resolve));
        ownedChildren.at(-1).kill(); await closed;
        const recoveryDeadline = Date.now() + 15000;
        while ((!activeClient.toolsReady || activeClient.busy || activeClient.token === beforeRecovery) && Date.now() < recoveryDeadline)
            await new Promise(resolve => setTimeout(resolve, 25));
        assert(activeClient.toolsReady && !activeClient.busy && activeClient.token && activeClient.token !== beforeRecovery, "unexpected companion exit recovers automatically without clicking Start");
    } finally {
        await handlers.get("stop")();
        await new Promise(resolve => setTimeout(resolve, 200));
        fs.rmSync(root, { recursive: true, force: true });
        fs.rmSync(nextRoot, { recursive: true, force: true });
    }
});

test("library-only client previews and commits the whole library despite stale project selection", async () => {
    const requests = [], events = [];
    const files = [{ state: " M", path: "First/Set.als" }, { state: " M", path: "Second/Set.als" }];
    const client = new Client((...event) => events.push(event), async (method, endpoint, body) => {
        requests.push([method, endpoint, body]);
        if (endpoint === "/api/projects") return { all: true, projects: [{ path: "First", name: "First" }] };
        if (endpoint === "/api/ui-state") return { initialized: true, canInitialize: false, canPush: false };
        if (endpoint === "/api/preview?scope=all") return { count: files.length, files };
        if (endpoint === "/api/snapshot") return { created: true, hash: "abcdef0123456789", warnings: [] };
        throw new Error("Unexpected request: " + endpoint);
    }, 17831, true);
    client.token = "token"; client.toolsReady = true;
    await client.refresh(); client.select(1); client.selectScope(0);
    assert.equal(client.scope, "all"); assert.equal(client.project, null);
    assert(!events.some(e => ["projectitem", "projectselect", "scopeselect"].includes(e[0])));
    client.scope = "project"; client.project = "First"; // A stale restored state must never narrow the device's operations.
    await client.refreshState(); assert.equal(client.preview.count, 2);
    assert.equal(await client.push(), true);
    assert.deepEqual(requests.find(r => r[1] === "/api/snapshot")[2], { message: "Raw Creativity", push: false, scope: "all" });
    assert(requests.filter(r => r[1].startsWith("/api/preview")).every(r => r[1] === "/api/preview?scope=all"));
    client.transport = async () => ({ all: false, projects: [] });
    await assert.rejects(client.refresh(), /whole-library companion/);
});

test("closing the device Node process also closes its owned companion", {
    skip: !fs.existsSync(path.join(packagePath, "companion/AbletonGit.Api" + (process.platform === "win32" ? ".exe" : "")))
}, async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "AbletonGit-close-"));
    const port = await unusedPort();
    const filename = path.join(root, "device-preferences.json");
    fs.writeFileSync(filename, JSON.stringify({ library: root }));
    const source = String.raw`
        const fs = require("fs"), path = require("path"), { createRequire } = require("module");
        const [directory, preferences, port] = process.argv.slice(1);
        const filename = path.join(directory, "device.js"), local = createRequire(filename);
        const packaged = local("./client"), saved = local("./preferences"), processes = require("child_process");
        let childPid;
        const load = new Function("require", "__dirname", "module", "exports", fs.readFileSync(filename, "utf8"));
        const device = { exports: {} };
        load(name => name === "max-api" ? { addHandler() {}, outlet() {}, post() {} } :
            name === "./preferences" ? { Preferences: class extends saved.Preferences { constructor() { super(preferences); } } } :
            name === "./client" ? { ...packaged, Client: class extends packaged.Client { constructor(emit, transport, _port, libraryOnly) { super(emit, transport, Number(port), libraryOnly); } } } :
            name === "child_process" ? { spawn(executable, args, options) { const child = processes.spawn(executable, [...args, "--port", port], options); childPid = child.pid; return child; } } : local(name),
            directory, device, {});
        process.on("message", () => process.exit(0));
        device.exports.startup.then(ok => process.send({ ok, pid: childPid }));
    `;
    const { spawn } = require("node:child_process");
    const worker = spawn(process.execPath, ["-e", source, packagePath, filename, String(port)], { stdio: ["ignore", "ignore", "ignore", "ipc"], shell: false, windowsHide: true });
    let companionPid;
    try {
        const ready = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error("Device worker startup timed out")), 20000);
            worker.once("message", value => { clearTimeout(timer); resolve(value); });
            worker.once("error", error => { clearTimeout(timer); reject(error); });
            worker.once("exit", code => { clearTimeout(timer); reject(new Error("Device worker exited: " + code)); });
        });
        companionPid = ready.pid; assert.equal(ready.ok, true); assert(companionPid);
        const exited = new Promise(resolve => worker.once("exit", resolve));
        worker.send("close"); await exited;
        const deadline = Date.now() + 5000;
        let alive = true;
        while (alive && Date.now() < deadline) {
            try { process.kill(companionPid, 0); await new Promise(resolve => setTimeout(resolve, 25)); }
            catch (error) { if (error.code !== "ESRCH") throw error; alive = false; }
        }
        assert.equal(alive, false, "owned companion exits with the device Node process");
    } finally {
        if (worker.exitCode === null) worker.kill();
        if (companionPid) { try { process.kill(companionPid); } catch {} }
        fs.rmSync(root, { recursive: true, force: true });
    }
});
