"use strict";
const { spawn } = require("child_process");
const { watchLiveSetLaunch } = require("./platform");

function titleState(title) {
    const match = typeof title === "string" && title.match(/^(.*?)\s[-–]\sAbleton Live(?:\s.*)?$/i);
    if (!match) return { known: false, modified: false };
    return { known: true, modified: /(?:\*|\(unsaved\))\s*$/i.test(match[1]) };
}

class LiveSaveState {
    constructor(directory, onState, onError, launch = spawn) {
        this.directory = directory; this.onState = onState; this.onError = onError; this.launch = launch;
        this.child = null; this.signature = null;
        this.nextStart = 0;
    }
    publish(state) {
        const signature = JSON.stringify(state);
        if (signature !== this.signature) { this.signature = signature; this.onState(state); }
    }
    start() {
        if (this.child || Date.now() < this.nextStart) return;
        this.publish({ known: false, modified: false });
        const launch = watchLiveSetLaunch(this.directory);
        const child = this.child = this.launch(launch.file, launch.args, launch.options);
        let buffer = "", errorText = "";
        child.stdout.on("data", data => {
            if (this.child !== child) return;
            buffer += data.toString();
            if (buffer.length > 16384) { this.stop(); this.onError(new Error("Invalid Live window state response.")); return; }
            let end;
            while ((end = buffer.indexOf("\n")) >= 0) {
                const line = buffer.slice(0, end).trim(); buffer = buffer.slice(end + 1);
                if (!line) continue;
                try {
                    const value = JSON.parse(line);
                    const state = typeof value.modified === "boolean" ? { known: true, modified: value.modified } : titleState(value.title);
                    if (value.available !== true) state.known = false;
                    if (!state.known) state.modified = false;
                    this.publish(state);
                } catch { this.publish({ known: false, modified: false }); }
            }
        });
        child.stderr.on("data", data => { errorText = (errorText + data.toString()).slice(-2048); });
        const ended = error => {
            if (this.child !== child) return;
            this.child = null; this.publish({ known: false, modified: false });
            this.nextStart = Date.now() + 30000;
            if (error || errorText) this.onError(error || new Error(errorText.trim()));
        };
        child.once("error", ended); child.once("exit", () => ended());
    }
    stop() {
        const child = this.child; this.child = null;
        this.nextStart = 0;
        if (child) child.kill();
        this.publish({ known: false, modified: false });
    }
}
module.exports = { titleState, LiveSaveState };
