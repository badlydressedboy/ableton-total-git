"use strict";
// Reproducible source patch, compiled/saved as an Audio Effect device by Max itself.
const fs = require("fs");
const path = require("path");
const boxes = [], lines = [];
function box(id, maxclass, text, rect, visible = false, extra = {}) {
    const value = { id, maxclass, patching_rect: rect, ...extra };
    if (text !== null) value.text = text;
    if (visible) { value.presentation = 1; value.presentation_rect = rect; }
    boxes.push({ box: value });
    return id;
}
function wire(from, outlet, to, inlet = 0) { lines.push({ patchline: { source: [from, outlet], destination: [to, inlet] } }); }
function obj(id, text, x, y) { return box(id, "newobj", text, [x, y, 250, 22]); }
function label(id, text, x, y, width) { return box(id, "comment", text, [x, y, width, 20], true); }
function button(id, caption, command, x, y, width, fields = false) {
    const guarded = ["snapshot", "push", "init"].includes(id);
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
    wire(guarded ? "mutations" : "active", 0, id);
}
label("title", "ABLETON GIT   •   Save in Live before Snapshot", 8, 2, 750);
label("librarylabel", "Library folder", 8, 29, 86);
box("library", "textedit", "", [98, 25, 465, 25], true, { numinlets: 1, numoutlets: 4, parameter_enable: 0, keymode: 1, outputmode: 1, valuemode: 0 });
box("description", "textedit", "", [98, 94, 465, 25], true, { numinlets: 1, numoutlets: 4, parameter_enable: 0, keymode: 1 });
label("descriptionlabel", "Description", 8, 98, 86);
label("projectlabel", "Project", 8, 64, 86);
box("project", "umenu", null, [98, 61, 305, 25], true, { items: ["Choose project..."], parameter_enable: 0, numinlets: 1, numoutlets: 3 });
box("scope", "umenu", null, [414, 61, 149, 25], true, { items: ["Current project", ",", "All projects"], parameter_enable: 0, numinlets: 1, numoutlets: 3 });
label("warning", "Select the project you want to Snapshot. Save in Live first.", 8, 122, 500);
label("details", "", 520, 122, 368);
label("status", "Enter library folder, then Start companion.", 8, 145, 880);
obj("node", "node.script device.js @autostart 1 @defer 1", 8, 500);
box("scriptstart", "message", "script start", [280, 500, 95, 22]); wire("scriptstart", 0, "node");
obj("runtimeconsole", "print AbletonGit-runtime", 380, 500); wire("node", 1, "runtimeconsole");
obj("route", "route status warning busy projectclear projectitem projectselect detail mutations", 8, 550);
wire("node", 0, "route");
for (const [outlet, target] of [[0, "status"], [1, "warning"], [6, "details"]]) {
    obj("set" + outlet, "prepend set", 8 + outlet * 100, 585);
    wire("route", outlet, "set" + outlet); wire("set" + outlet, 0, target);
}
obj("notbusy", "== 0", 220, 630); obj("active", "prepend active", 220, 660);
wire("route", 2, "notbusy"); wire("notbusy", 0, "active");
obj("mutations", "prepend active", 740, 660); wire("route", 7, "mutations");
obj("ignore", "prepend sendbox ignoreclick", 460, 660); wire("route", 2, "ignore");
for (const id of ["library", "description", "project", "scope"]) wire("ignore", 0, id);
box("clear", "message", "clear", [320, 585, 60, 22]); wire("route", 3, "clear"); wire("clear", 0, "project");
obj("append", "prepend append", 390, 585); wire("route", 4, "append"); wire("append", 0, "project");
obj("select", "prepend set", 560, 585); wire("route", 5, "select"); wire("select", 0, "project");
for (const id of ["library", "description"]) {
    obj(id + "route", "route text", 10, id === "library" ? 720 : 770);
    obj(id + "prefix", "prepend " + id, 270, id === "library" ? 720 : 770);
    wire(id, 0, id + "route"); wire(id + "route", 0, id + "prefix"); wire(id + "prefix", 0, "node");
}
for (const id of ["project", "scope"]) {
    obj(id + "prefix", "prepend " + id, 520, id === "project" ? 720 : 770);
    wire(id, 0, id + "prefix"); wire(id + "prefix", 0, "node");
}
button("start", "Start companion", "start", 574, 25, 132, true);
button("init", "Initialise library", "init", 717, 25, 132);
button("stop", "Stop", "stop", 860, 25, 50);
button("refresh", "Refresh projects", "refresh", 574, 61, 132);
button("snapshot", "Snapshot", "snapshot", 574, 94, 132, true);
button("push", "Push", "push", 717, 94, 132);
label("pushlabel", "Push uploads all committed projects", 717, 61, 197);
obj("audioin", "plugin~", 10, 850); obj("audioout", "plugout~", 10, 900);
wire("audioin", 0, "audioout", 0); wire("audioin", 1, "audioout", 1);
obj("defaults", "loadbang", 300, 850);
box("defaultscope", "message", "set 0", [300, 900, 70, 22]); wire("defaults", 0, "defaultscope"); wire("defaultscope", 0, "scope");
const patch = { patcher: { fileversion: 1, appversion: { major: 8, minor: 6, revision: 5, architecture: "x64", modernui: 1 },
    classnamespace: "box", rect: [0, 0, 930, 950], openinpresentation: 1, devicewidth: 930,
    default_fontsize: 12, default_fontface: 0, default_fontname: "Arial", boxes, lines,
    dependency_cache: [{ name: "device.js", bootpath: ".", type: "TEXT", implicit: 1 }, { name: "client.js", bootpath: ".", type: "TEXT", implicit: 1 }] } };
fs.writeFileSync(path.join(__dirname, "Ableton Git.maxpat"), JSON.stringify(patch, null, 2) + "\n");
