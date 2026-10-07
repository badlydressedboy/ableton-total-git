"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const zlib = require("zlib");
const { normalizeLibraryPath, preferencesFile, companionExecutable, gitEnvironment, gitStatusLaunch } = require("./platform");
const { archive } = require("./package-archive");

test("platform paths preserve POSIX names and retain Windows settings compatibility", () => {
    assert.equal(normalizeLibraryPath('"C:\\Music\\Sets"', "win32"), "C:/Music/Sets");
    assert.equal(normalizeLibraryPath('/Users/me/Music\\sets', "darwin"), '/Users/me/Music\\sets');
    assert.equal(normalizeLibraryPath('"~/Music/Sets"', "darwin", "/Users/me"), "/Users/me/Music/Sets");
    assert.equal(preferencesFile("win32", { LOCALAPPDATA: "C:\\Local" }), "C:\\Local\\AbletonGit\\max-for-live.json");
    assert.equal(preferencesFile("darwin", {}, "/Users/me"), "/Users/me/Library/Application Support/AbletonGit/max-for-live.json");
    assert(companionExecutable(__dirname, "darwin").endsWith("AbletonGit.Api"));
    assert(companionExecutable(__dirname, "win32").endsWith("AbletonGit.Api.exe"));
    assert.throws(() => companionExecutable(__dirname, "linux"), /Windows and macOS/);
});

test("macOS GUI environment discovers both Homebrew locations without losing custom PATH", () => {
    const env = { PATH: "/custom/bin:/usr/bin", OTHER: "keep" };
    const configured = gitEnvironment("darwin", env);
    assert.equal(configured.PATH, "/opt/homebrew/bin:/usr/local/bin:/custom/bin:/usr/bin:/bin:/usr/sbin:/sbin");
    assert.equal(configured.OTHER, "keep"); assert.equal(env.PATH, "/custom/bin:/usr/bin");
    assert.deepEqual(gitEnvironment("win32", env), env);
});

test("macOS Terminal launch keeps hostile folder text out of AppleScript and quotes shell arguments", () => {
    const root = "/Users/me/Music ' $(touch nope); Sets";
    const launch = gitStatusLaunch(root, "darwin", { PATH: "/custom ' $(bad)" });
    assert.equal(launch.file, "/usr/bin/osascript"); assert.equal(launch.options.shell, false);
    assert.equal(launch.options.cwd, root);
    assert(!launch.args.slice(0, -1).some(arg => arg.includes(root)));
    const command = launch.args.at(-1);
    assert(command.startsWith("cd -- '/Users/me/Music '\"'\"' $(touch nope); Sets' && PATH='"));
    assert(command.endsWith("' git status"));
});

test("package ZIP round trips contents and marks the macOS companion executable", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "AbletonGit-zip-"));
    try {
        const folder = path.join(root, "package"); fs.mkdirSync(path.join(folder, "companion"), { recursive: true });
        fs.writeFileSync(path.join(folder, "companion", "AbletonGit.Api"), "executable contents");
        fs.writeFileSync(path.join(folder, "device.js"), "text contents");
        const filename = path.join(root, "package.zip"); archive(folder, filename);
        const zip = fs.readFileSync(filename); let offset = 0, files = 0;
        while (zip.readUInt32LE(offset) === 0x04034b50) {
            const size = zip.readUInt32LE(offset + 18), length = zip.readUInt16LE(offset + 26);
            const name = zip.subarray(offset + 30, offset + 30 + length).toString();
            const bytes = zlib.inflateRawSync(zip.subarray(offset + 30 + length, offset + 30 + length + size));
            assert.deepEqual(bytes, fs.readFileSync(path.join(folder, name)));
            offset += 30 + length + size; files++;
        }
        assert.equal(files, 2);
        assert.equal(zip.readUInt32LE(offset), 0x02014b50);
        assert.equal(zip.readUInt32LE(offset + 38) >>> 16, 0o100755);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
