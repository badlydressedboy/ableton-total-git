"use strict";
// Reproducible source patch, compiled/saved as an Audio Effect device by Max itself.
const fs = require("fs");
const path = require("path");
const boxes = [], lines = [];
const help = {
    library: ["Library folder", "Full path to the parent Ableton projects library tracked in one Git repository. This folder is remembered and starts automatically next time. Press Enter or Tab to apply a folder edit and start automatically. Changing to another valid folder automatically restarts the running companion and rescans. Folder changes wait for an active operation to finish. Editing is locked while an operation runs."],
    description: ["Commit Comment", "Comment recorded with the next commit. Enter at least four characters after trimming surrounding spaces to commit changed files. The editable default is Raw Creativity and returns after a successful commit. Editing is locked while an operation runs. Uploading existing commits does not require a new comment."],
    start: ["Start companion", "Retry starting the background companion for the library folder and check Git and Git LFS. Valid folder input and saved folders start automatically; unexpected exits are restarted. Disabled while this device already owns a running companion or an operation is active. A valid folder and the companion files are required."],
    init: ["Initialise library", "Create the library Git repository, configure Git LFS and generate project reports. Disabled if the companion is not connected, Git or Git LFS checks fail, an operation is active, repository state is unavailable, or this folder is already initialised or is not the repository root."],
    refresh: ["Refresh library", "Check Git and Git LFS again and refresh the file preview across the whole library. Saved file changes are also scanned automatically. Disabled before the companion connects or while an operation is active."],
    push: ["Push", "Save in Live first. Commit all eligible changed files across the library using Commit Comment, then upload committed history if a tracking remote is configured. Without a remote, the commit stays local. Failed uploads keep the commit for retry. Disabled if the companion is not ready, Git or Git LFS checks fail, an operation runs, state is unavailable, the library needs initialising, changed files lack a four-character comment, or there are neither changes to commit nor commits ready to upload."],
    gitstatus: ["Git status", "Open PowerShell on Windows or Terminal on macOS in the library folder and run git status. The window stays open. Requires a valid folder; the companion can be stopped. Disabled while an operation is active."],
    filelist: ["Files to commit", "Read-only preview of eligible changed files across the whole library, including generated .abletongit reports. The left column shows Git change status. Scroll vertically for more files and horizontally for long names. Preview does not commit files. Save in Live before reviewing or pushing."],
    filesummary: ["File count", "Number of eligible files that the next commit will include across the whole library. Start and initialise the companion library to see the preview. Zero files can still allow Push when existing commits are ready to upload."],
    status: ["Companion status", "Latest startup, operation result or error. Long messages are shortened here and printed in full in the Max Console. Hover over a disabled button for the conditions needed to enable it."],
    details: ["Analysis warnings", "Warnings from analysing saved Sets and media references. Complete warnings are printed in the Max Console. Resolve external or missing media in Live with Collect All and Save when appropriate."]
};
help.librarylabel = help.library;
help.descriptionlabel = help.description;
function box(id, maxclass, text, rect, visible = false, extra = {}) {
    const value = { id, maxclass, patching_rect: rect, ...extra };
    if (text !== null) value.text = text;
    if (visible) {
        value.presentation = 1; value.presentation_rect = rect;
        if (!help[id]) throw new Error("Missing hover help for " + id);
        [value.annotation_name, value.annotation] = help[id];
    }
    boxes.push({ box: value });
    return id;
}
function wire(from, outlet, to, inlet = 0) { lines.push({ patchline: { source: [from, outlet], destination: [to, inlet] } }); }
function obj(id, text, x, y) { return box(id, "newobj", text, [x, y, 250, 22]); }
function label(id, text, x, y, width) { return box(id, "comment", text, [x, y, width, 20], true); }
function button(id, caption, command, x, y, width, fields = false) {
    const guarded = !["start", "gitstatus"].includes(id);
    box(id, "textbutton", caption, [x, y, width, 25], true, { active: guarded ? 0 : 1, mode: 0, parameter_enable: 0, numinlets: 1, numoutlets: 3, outlettype: ["", "", "int"] });
    box(id + "cmd", "message", command, [x, 260 + boxes.length * 6, 100, 22]);
    if (fields) {
        obj(id + "trigger", "t b b b", x, 230);
        wire(id, 1, id + "trigger");
        wire(id + "trigger", 2, "description");
        wire(id + "trigger", 1, "library");
        wire(id + "trigger", 0, id + "cmd");
    } else {
        obj(id + "trigger", "t b", x, 230);
        wire(id, 1, id + "trigger"); wire(id + "trigger", 0, id + "cmd");
    }
    wire(id + "cmd", 0, "node");
    wire(id + "active", 0, id);
}
box("title", "comment", "ABLETON GIT", [8, 200, 90, 20]);
label("librarylabel", "Library folder", 8, 26, 75);
box("library", "textedit", "", [85, 22, 440, 25], true, { numinlets: 1, numoutlets: 4, parameter_enable: 0, keymode: 1, outputmode: 1, valuemode: 0 });
box("description", "textedit", "Raw Creativity", [125, 80, 230, 25], true, { numinlets: 1, numoutlets: 4, parameter_enable: 0, keymode: 1, outputmode: 1 });
label("descriptionlabel", "Commit Comment", 8, 84, 110);
label("details", "", 8, 140, 537);
label("status", "Loading companion script...", 8, 110, 537);
label("filesummary", "Start the companion to preview files.", 555, 0, 365);
box("filelist", "jit.cellblock", null, [555, 22, 365, 140], true, {
    cols: 2, rows: 1, rowheight: 14, colwidth: 75, hscroll: 1, vscroll: 1, readonly: 1,
    selmode: 0, neverdirty: 1, datadirty: 0, fontsize: 11, numinlets: 2, numoutlets: 4,
    bgcolor: [0.12, 0.12, 0.12, 1], fgcolor: [1, 1, 1, 1], textcolor: [1, 1, 1, 1], grid: 0
});
obj("node", "node.script device.js @autostart 0 @defer 1", 8, 500);
obj("deviceready", "live.thisdevice", 8, 450);
obj("startonce", "onebang 1", 280, 450);
obj("startdefer", "deferlow", 550, 450);
wire("deviceready", 0, "startonce"); wire("startonce", 0, "startdefer"); wire("startdefer", 0, "scriptstart");
box("scriptstart", "message", "script start", [280, 500, 95, 22]); wire("scriptstart", 0, "node");
obj("runtimeconsole", "print AbletonGit-runtime", 380, 500); wire("node", 1, "runtimeconsole");
obj("route", "route status warning busy projectclear projectitem projectselect detail mutations startenabled stopenabled initenabled pushenabled snapshotenabled refreshenabled filelist filesummary descriptionclear libraryrestore scopeselect", 8, 550);
wire("node", 0, "route");
for (const [outlet, target] of [[0, "status"], [6, "details"], [15, "filesummary"]]) {
    obj("set" + outlet, "prepend set", 8 + outlet * 100, 585);
    wire("route", outlet, "set" + outlet); wire("set" + outlet, 0, target);
}
obj("notbusy", "== 0", 220, 630); obj("active", "prepend active", 220, 660);
wire("route", 2, "notbusy"); wire("notbusy", 0, "active");
obj("mutations", "prepend active", 740, 660); wire("route", 7, "mutations");
for (const [outlet, id] of [[8, "start"], [10, "init"], [11, "push"], [12, "snapshot"], [13, "refresh"]]) {
    obj(id + "active", "prepend active", 800, 700 + outlet * 30); wire("route", outlet, id + "active");
}
wire("route", 14, "filelist");
box("descriptionclear", "message", "set Raw Creativity", [900, 585, 140, 22]); wire("route", 16, "descriptionclear"); wire("descriptionclear", 0, "description");
obj("descriptionkeys", "deferlow", 270, 810); obj("descriptionbang", "t b", 520, 810);
wire("description", 1, "descriptionkeys"); wire("descriptionkeys", 0, "descriptionbang"); wire("descriptionbang", 0, "description");
obj("libraryrestore", "prepend set", 1000, 585); wire("route", 17, "libraryrestore"); wire("libraryrestore", 0, "library");
obj("ignore", "prepend sendbox ignoreclick", 460, 660); wire("route", 2, "ignore");
for (const id of ["library", "description"]) wire("ignore", 0, id);
for (const id of ["library", "description"]) {
    obj(id + "route", "route text", 10, id === "library" ? 720 : 770);
    obj(id + "prefix", "prepend " + id, 270, id === "library" ? 720 : 770);
    wire(id, 0, id + "route"); wire(id + "route", 0, id + "prefix"); wire(id + "prefix", 0, "node");
}
button("start", "Start companion", "start", 85, 50, 130, true);
button("init", "Initialise library", "init", 225, 50, 130);
button("refresh", "Refresh library", "refresh", 365, 50, 160);
button("push", "Push", "push", 365, 80, 75, true);
obj("gitstatusactive", "prepend active", 1250, 660); wire("notbusy", 0, "gitstatusactive");
button("gitstatus", "Git status", "gitstatus", 450, 80, 75, true);
obj("audioin", "plugin~", 10, 850); obj("audioout", "plugout~", 10, 900);
wire("audioin", 0, "audioout", 0); wire("audioin", 1, "audioout", 1);
obj("defaults", "loadbang", 300, 850);
box("filecolumns", "message", "col 0 width 45, col 1 width 850", [930, 900, 230, 22]); wire("defaults", 0, "filecolumns"); wire("filecolumns", 0, "filelist");
const patch = { patcher: { fileversion: 1, appversion: { major: 8, minor: 6, revision: 5, architecture: "x64", modernui: 1 },
    classnamespace: "box", rect: [0, 0, 930, 1200], openinpresentation: 1, devicewidth: 930,
    default_fontsize: 12, default_fontface: 0, default_fontname: "Arial", boxes, lines,
    dependency_cache: ["device.js", "client.js", "preferences.js", "platform.js"].map(name => ({ name, bootpath: ".", type: "TEXT", implicit: 1 })) } };
fs.writeFileSync(path.join(__dirname, "Ableton Git.maxpat"), JSON.stringify(patch, null, 2) + "\n");
