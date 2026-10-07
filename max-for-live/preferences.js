"use strict";
const fs = require("fs");
const path = require("path");
const os = require("os");
const { normalizeLibraryPath } = require("./client");

class Preferences {
    constructor(filename = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "AbletonGit", "max-for-live.json")) {
        this.filename = filename;
    }
    loadLibrary() {
        try {
            const data = JSON.parse(fs.readFileSync(this.filename, "utf8"));
            return typeof data.library === "string" ? normalizeLibraryPath(data.library) : "";
        } catch (error) { if (error.code === "ENOENT") return ""; throw error; }
    }
    saveLibrary(library) {
        fs.mkdirSync(path.dirname(this.filename), { recursive: true });
        const temporary = this.filename + "." + process.pid + ".tmp";
        try {
            fs.writeFileSync(temporary, JSON.stringify({ library: normalizeLibraryPath(library) }, null, 2) + "\n", "utf8");
            fs.renameSync(temporary, this.filename);
        } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
    }
}
module.exports = { Preferences };
