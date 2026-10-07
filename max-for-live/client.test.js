"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("./client");
const { spawnSync } = require("node:child_process");
const { createRequire } = require("node:module");
const os = require("node:os");
const zlib = require("node:zlib");

test("project selection is explicit; scope sends only intended API fields", async () => {
    const requests = [], events = [];
    const client = new Client((...e) => events.push(e), async (...args) => {
        requests.push(args);
        return args[0] === "GET" ? { all: true, projects: [{ path: "Dub 音", name: "Dub 音" }] } :
            { created: true, hash: "abcdef0123456789", warnings: [] };
    });
    client.token = "A".repeat(64); client.message = "Bass variation";
    await client.refresh();
    assert.equal(await client.snapshot(), false);
    assert.equal(requests.length, 1);
    client.select(1); await client.snapshot();
    assert.deepEqual(requests[1], ["POST", "/api/snapshot", { message: "Bass variation", push: false, scope: "project", project: "Dub 音" }]);
    client.selectScope(1); await client.snapshot();
    assert.deepEqual(requests[2][2], { message: "Bass variation", push: false, scope: "all" });
    assert(events.some(e => e[0] === "warning" && e[1].includes("All projects")));
});
test("busy blocks repeated clicks and scope changes; failure unlocks controls", async () => {
    let finish, calls = 0;
    const client = new Client(() => {}, () => { calls++; return new Promise(resolve => { finish = resolve; }); });
    client.token = "token"; client.message = "Description"; client.project = "Dub";
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
    client.token = "token"; client.project = "Removed"; client.message = "Description";
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
    await new Promise(resolve => server.listen(17831, "127.0.0.1", resolve));
    try {
        const events = [], client = new Client((...e) => events.push(e));
        client.token = "A".repeat(64); client.project = "Dub"; client.message = "Saved";
        assert.equal(await client.snapshot(), false);
        assert(events.some(e => e[0] === "status" && e[1] === "Run Init first."));
    } finally { await new Promise(resolve => server.close(resolve)); }
});
test("patch wires every action to Node, passes audio through and defaults project scope", () => {
    const patch = JSON.parse(fs.readFileSync(path.join(__dirname, "Ableton Git.maxpat"))).patcher;
    const ids = new Set(patch.boxes.map(b => b.box.id));
    for (const { patchline: line } of patch.lines) assert(ids.has(line.source[0]) && ids.has(line.destination[0]));
    for (const id of ["start", "stop", "init", "refresh", "snapshot", "push"])
        assert(patch.lines.some(l => l.patchline.source[0] === id + "cmd" && l.patchline.destination[0] === "node"));
    assert.equal(patch.lines.filter(l => l.patchline.source[0] === "audioin" && l.patchline.destination[0] === "audioout").length, 2);
    assert.equal(patch.boxes.find(b => b.box.id === "scope").box.items[0], "Current project");
});
const packagePath = path.resolve(__dirname, "../artifacts/max-for-live");
test("published device launches companion, initialises and Snapshots a real library without a shell", {
    skip: !fs.existsSync(path.join(packagePath, "companion/AbletonGit.Api.exe"))
}, async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "AbletonGit-device-"));
    const project = path.join(root, "Dub Project 音");
    fs.mkdirSync(path.join(project, "Ableton Project Info"), { recursive: true });
    fs.writeFileSync(path.join(project, "Dub.als"), zlib.gzipSync('<Ableton Creator="Ableton Live 12.3" MajorVersion="5" MinorVersion="12.0_0"><LiveSet><Tracks/><Scenes/></LiveSet></Ableton>'));
    const handlers = new Map(), events = [];
    const mock = { addHandler: (name, handler) => handlers.set(name, handler), outlet: (...args) => events.push(args) };
    const filename = path.join(packagePath, "device.js"), localRequire = createRequire(filename);
    const load = new Function("require", "__dirname", "module", "exports", fs.readFileSync(filename, "utf8"));
    load(name => name === "max-api" ? mock : localRequire(name), packagePath, { exports: {} }, {});
    try {
        handlers.get("library")(root); await handlers.get("start")();
        assert(events.some(e => e[0] === "status" && e[1].startsWith("Ready.")), JSON.stringify(events));
        await handlers.get("init")();
        for (const [key, value] of [["user.name", "Device Test"], ["user.email", "device@example.invalid"], ["commit.gpgsign", "false"]]) {
            const result = spawnSync("git", ["-C", root, "config", key, value], { shell: false }); assert.equal(result.status, 0);
        }
        handlers.get("project")(1); handlers.get("description")("Saved through device");
        await handlers.get("snapshot")();
        assert(events.some(e => e[0] === "status" && e[1].startsWith("Snapshot saved:")), JSON.stringify(events));
        const log = spawnSync("git", ["-C", root, "log", "-1", "--format=%s"], { encoding: "utf8", shell: false });
        assert.equal(log.stdout.trim(), "Saved through device");
        assert(!JSON.stringify(events).includes("X-AbletonGit-Token"));
    } finally {
        await handlers.get("stop")();
        await new Promise(resolve => setTimeout(resolve, 200));
        fs.rmSync(root, { recursive: true, force: true });
    }
});
