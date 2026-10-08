"use strict";
// Reproducible source patch, compiled/saved as an Audio Effect device by Max itself.
const fs = require("fs");
const path = require("path");
const boxes = [], lines = [];
const help = {
    repo: ["Repo", "Open the library's GitHub repository in your browser. Shown only for an initialised library with a recognised github.com remote. Uses the current branch's remote, otherwise origin or the first remote, and its push URL. Private repositories may require signing in."],
    library: ["Library folder", "Full path to the parent Ableton projects library tracked in one Git repository. This folder is remembered and starts automatically next time. Press Enter or Tab to apply a folder edit and start automatically. Changing to another valid folder automatically restarts the running companion and rescans. Folder changes wait for an active operation to finish. Editing is locked while an operation runs."],
    description: ["Commit Comment", "Comment recorded with the next commit. Click the default Raw Creativity text to select it all for easy replacement. Custom comments retain normal cursor behavior. Enter at least four characters after trimming surrounding spaces to commit changed files. Raw Creativity returns after a successful commit. Editing is locked while an operation runs. Uploading existing commits does not require a new comment."],
    savelive: ["Save Live Set", "Request Live's File > Save Live Set command on Windows, or Cmd+S on macOS. Unsaved Sets open Live's Save As dialog. Saved file changes are scanned automatically while this device is visible. Saving does not commit or push. Available without a running companion when the current Set has unsaved modifications. Disabled for clean Sets, unknown window state, or an active operation. Close open Live dialogs before saving. macOS requires Automation and Accessibility permission. If multiple Live instances cannot be identified safely, close the other instance or save from Live."],
    init: ["Initialise repo", "Create the library Git repository, configure Git LFS and generate project reports. A dialog asks for an optional existing GitHub repository URL: leave blank for local-only history or Cancel to do nothing. A supplied URL connects origin and enables automatic branch tracking on the first Push; existing conflicting remotes are preserved. Disabled if the companion is not connected, Git or Git LFS checks fail, an operation is active, repository state is unavailable, or this folder is already initialised or is not the repository root."],
    refresh: ["Refresh library", "Check Git and Git LFS again and refresh the file preview across the whole library. Saved file changes are also scanned automatically. Disabled before the companion connects or while an operation is active."],
    push: ["Push", "Save in Live first. Commit all eligible changed files across the library using Commit Comment, then upload committed history if a tracking remote is configured. Without a remote, the commit stays local. Failed uploads keep the commit for retry. Disabled if the companion is not ready, Git or Git LFS checks fail, an operation runs, state is unavailable, the library needs initialising, changed files lack a four-character comment, or there are neither changes to commit nor commits ready to upload."],
    gitstatus: ["Git status", "Open PowerShell on Windows or Terminal on macOS in the library folder and run git status. The window stays open. Requires a valid folder; the companion can be stopped. Disabled while an operation is active."],
    filelist: ["Files to commit", "Read-only preview of eligible changed files across the whole library, including generated .abletongit reports. The left column shows Git change status. Drag the slim scrollbars, click their tracks, or drag the list to scroll vertically and horizontally. Scrollbars appear only when needed. Preview does not commit files. Save in Live before reviewing or pushing."],
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
    const guarded = !["savelive", "gitstatus"].includes(id);
    if (id === "savelive")
        box(id, "jsui", null, [x, y, width, 25], true, { filename: "save-button.js", border: 0, parameter_enable: 0, numinlets: 1, numoutlets: 2 });
    else box(id, "textbutton", caption, [x, y, width, 25], true, { active: guarded ? 0 : 1, mode: 0, parameter_enable: 0, numinlets: 1, numoutlets: 3, outlettype: ["", "", "int"] });
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
box("title", "comment", "ABLETON TOTAL GIT", [8, 200, 150, 20]);
label("librarylabel", "Library folder", 8, 26, 75);
const inputStyle = { fontsize: 12, lines: 1, wordwrap: 0, autoscroll: 1, border: 5, rounded: 5,
    bgcolor: [0.24, 0.24, 0.24, 1], bordercolor: [0.24, 0.24, 0.24, 1], textcolor: [0.94, 0.94, 0.94, 1] };
box("library", "textedit", "", [85, 22, 440, 25], true, { ...inputStyle, numinlets: 1, numoutlets: 4, parameter_enable: 0, keymode: 1, outputmode: 1, valuemode: 0 });
box("description", "textedit", "Raw Creativity", [125, 80, 230, 25], true, { ...inputStyle, numinlets: 1, numoutlets: 4, parameter_enable: 0, keymode: 1, outputmode: 1 });
label("descriptionlabel", "Commit Comment", 8, 84, 110);
label("details", "", 65, 134, 480);
box("repo", "jsui", null, [8, 134, 45, 20], true, {
    filename: "repo-link.js", hidden: 1, border: 0, parameter_enable: 0,
    numinlets: 1, numoutlets: 1, outlettype: [""]
});
obj("repoclick", "t b", 1090, 1220); wire("repo", 0, "repoclick");
box("repocommand", "message", "repo", [1090, 1250, 60, 22]);
wire("repoclick", 0, "repocommand"); wire("repocommand", 0, "node");
label("status", "Loading companion script...", 8, 110, 537);
label("filesummary", "Waiting for the companion to preview files.", 555, 0, 365);
box("filelist", "jsui", null, [555, 22, 365, 140], true, {
    filename: "file-list.js", border: 0, parameter_enable: 0, numinlets: 1, numoutlets: 0
});
obj("node", "node.script device.js @autostart 0 @defer 1", 8, 500);
obj("deviceready", "live.thisdevice", 8, 450);
obj("startonce", "onebang 1", 280, 450);
obj("startdefer", "deferlow", 550, 450);
wire("deviceready", 0, "startonce"); wire("startonce", 0, "startdefer"); wire("startdefer", 0, "scriptstart");
// Live persists its own Device.name independently of the patch/file title.
// Resolve only this device after Live is ready, then bind its ID before writing.
obj("namedefer", "deferlow", 8, 1140);
obj("namepath", "live.path this_device", 280, 1140);
obj("nameid", "route id", 550, 1140);
obj("namevalid", "sel 0", 820, 1140);
obj("namebind", "t b i", 8, 1180);
obj("nameprefix", "prepend id", 280, 1180);
obj("nameobject", "live.object", 550, 1180);
obj("namewrite", "deferlow", 820, 1180);
box("devicename", "message", 'set name "Ableton Total Git"', [1090, 1180, 190, 22]);
wire("startonce", 0, "namedefer"); wire("namedefer", 0, "namepath");
wire("namepath", 0, "nameid"); wire("nameid", 0, "namevalid");
wire("namevalid", 1, "namebind"); wire("namebind", 1, "nameprefix");
wire("nameprefix", 0, "nameobject", 1);
wire("namebind", 0, "namewrite"); wire("namewrite", 0, "devicename");
wire("devicename", 0, "nameobject");
box("scriptstart", "message", "script start", [280, 500, 95, 22]); wire("scriptstart", 0, "node");
box("visibilityprobe", "jsui", null, [0, 0, 930, 1], false, {
    filename: "visibility.js", presentation: 1, presentation_rect: [0, 0, 930, 1],
    border: 0, ignoreclick: 1, parameter_enable: 0, numinlets: 1, numoutlets: 1,
    annotation_name: "Device visibility", annotation: "Background file scanning pauses while this device is hidden and resumes when it is shown."
});
wire("visibilityprobe", 0, "node");
obj("runtimeconsole", "print AbletonGit-runtime", 380, 500); wire("node", 1, "runtimeconsole");
obj("route", "route status warning busy projectclear projectitem projectselect detail mutations startenabled stopenabled initenabled pushenabled snapshotenabled refreshenabled filelist filesummary descriptionclear libraryrestore scopeselect visibilityrequest repovisible repourl initdialog savefinished livemodified", 8, 550);
obj("livemodified", "prepend modified", 1250, 1370); wire("route", 24, "livemodified"); wire("livemodified", 0, "savelive");
obj("savefinisheddefer", "deferlow", 1250, 1290); wire("route", 23, "savefinisheddefer");
box("savecursorreset", "message", "resetcursor", [1250, 1330, 95, 22]);
wire("savefinisheddefer", 0, "savecursorreset"); wire("savecursorreset", 0, "savelive");
obj("initdialogtrigger", "t b b", 8, 1290); wire("route", 22, "initdialogtrigger");
box("initdialogclear", "message", "clearsymbol", [280, 1290, 85, 22]);
obj("initdialog", 'dialog "Optional existing GitHub repository URL. Leave blank for local only. Cancel makes no changes."', 550, 1290);
wire("initdialogtrigger", 1, "initdialogclear"); wire("initdialogclear", 0, "initdialog");
wire("initdialogtrigger", 0, "initdialog");
obj("initdialogvalue", "route symbol", 8, 1330); obj("initdialogconfirm", "prepend initconfirm", 280, 1330);
wire("initdialog", 0, "initdialogvalue"); wire("initdialogvalue", 0, "initdialogconfirm"); wire("initdialogconfirm", 0, "node");
obj("repohidden", "== 0", 8, 1220); obj("repohide", "prepend hidden", 280, 1220);
wire("route", 20, "repohidden"); wire("repohidden", 0, "repohide"); wire("repohide", 0, "repo");
obj("repoenabled", "prepend enabled", 280, 1250);
wire("route", 20, "repoenabled"); wire("repoenabled", 0, "repo");
box("repobrowser", "message", "; max launchbrowser $1", [550, 1220, 190, 22]);
wire("route", 21, "repobrowser");
wire("route", 19, "visibilityprobe");
wire("node", 0, "route");
for (const [outlet, target] of [[0, "status"], [6, "details"], [15, "filesummary"]]) {
    obj("set" + outlet, "prepend set", 8 + outlet * 100, 585);
    wire("route", outlet, "set" + outlet); wire("set" + outlet, 0, target);
}
obj("notbusy", "== 0", 220, 630); obj("active", "prepend active", 220, 660);
wire("route", 2, "notbusy"); wire("notbusy", 0, "active");
obj("mutations", "prepend active", 740, 660); wire("route", 7, "mutations");
for (const [outlet, id] of [[10, "init"], [11, "push"], [12, "snapshot"], [13, "refresh"]]) {
    obj(id + "active", "prepend active", 800, 700 + outlet * 30); wire("route", outlet, id + "active");
}
wire("route", 14, "filelist");
box("descriptionclear", "message", "set Raw Creativity", [900, 585, 140, 22]); wire("route", 16, "descriptionclear"); wire("descriptionclear", 0, "description");
obj("descriptionkeys", "deferlow", 270, 810); obj("descriptionbang", "t b", 520, 810);
wire("description", 1, "descriptionkeys"); wire("descriptionkeys", 0, "descriptionbang"); wire("descriptionbang", 0, "description");
// Wait for mouse release before selecting, so textedit's native caret placement
// cannot overwrite the selection. Poll only during this click, then stop.
obj("commentclick", "t b", 10, 960); wire("description", 2, "commentclick");
box("commentwaiton", "message", "1", [10, 1040, 35, 22]); wire("commentclick", 0, "commentwaiton");
obj("commentwait", "qmetro 20", 270, 1040); wire("commentwaiton", 0, "commentwait");
obj("commentmouseup", "mousefilter", 540, 1040); wire("commentwait", 0, "commentmouseup");
obj("commentreleased", "t b b", 800, 1040); wire("commentmouseup", 0, "commentreleased");
box("commentwaitoff", "message", "0", [1070, 1040, 35, 22]); wire("commentreleased", 1, "commentwaitoff"); wire("commentwaitoff", 0, "commentwait");
obj("commentclickdefer", "deferlow", 270, 960); wire("commentreleased", 0, "commentclickdefer");
obj("commentread", "t b b b", 540, 960); wire("commentclickdefer", 0, "commentread");
box("commentgateon", "message", "1", [800, 960, 35, 22]);
box("commentgateoff", "message", "0", [840, 960, 35, 22]);
obj("commentdefault", 'sel "Raw Creativity"', 10, 1000);
obj("commenttext", "tosymbol", 10, 1080);
obj("commentgate", "gate 1 0", 270, 1000);
wire("commentread", 2, "commentgateon"); wire("commentgateon", 0, "commentgate", 0);
wire("commentread", 1, "description");
wire("commentread", 0, "commentgateoff"); wire("commentgateoff", 0, "commentgate", 0);
wire("descriptionroute", 0, "commenttext"); wire("commenttext", 0, "commentdefault"); wire("commentdefault", 0, "commentgate", 1);
box("commentselect", "message", "select", [540, 1000, 70, 22]);
wire("commentgate", 0, "commentselect"); wire("commentselect", 0, "description");
obj("libraryrestore", "prepend set", 1000, 585); wire("route", 17, "libraryrestore"); wire("libraryrestore", 0, "library");
obj("ignore", "prepend sendbox ignoreclick", 460, 660); wire("route", 2, "ignore");
for (const id of ["library", "description"]) wire("ignore", 0, id);
for (const id of ["library", "description"]) {
    obj(id + "route", "route text", 10, id === "library" ? 720 : 770);
    obj(id + "prefix", "prepend " + id, 270, id === "library" ? 720 : 770);
    wire(id, 0, id + "route"); wire(id + "route", 0, id + "prefix"); wire(id + "prefix", 0, "node");
}
button("init", "Initialise repo", "initprompt", 85, 50, 130);
obj("saveliveactive", "prepend active", 1250, 700); wire("notbusy", 0, "saveliveactive");
button("savelive", "Save Live Set", "savelive", 225, 50, 130);
button("refresh", "Refresh library", "refresh", 365, 50, 160);
button("push", "Push", "push", 365, 80, 75, true);
obj("gitstatusactive", "prepend active", 1250, 660); wire("notbusy", 0, "gitstatusactive");
button("gitstatus", "Git status", "gitstatus", 450, 80, 75, true);
obj("audioin", "plugin~", 10, 850); obj("audioout", "plugout~", 10, 900);
wire("audioin", 0, "audioout", 0); wire("audioin", 1, "audioout", 1);
obj("defaults", "loadbang", 300, 850);
const patch = { patcher: { fileversion: 1, appversion: { major: 8, minor: 6, revision: 5, architecture: "x64", modernui: 1 },
    classnamespace: "box", title: "Ableton Total Git", rect: [0, 0, 930, 1200], openinpresentation: 1, devicewidth: 930,
    default_fontsize: 12, default_fontface: 0, default_fontname: "Arial", boxes, lines,
    dependency_cache: ["device.js", "client.js", "preferences.js", "platform.js", "visibility.js", "file-list.js", "repo-link.js", "save-button.js", "live-save-state.js"].map(name => ({ name, bootpath: ".", type: "TEXT", implicit: 1 })) } };
fs.writeFileSync(path.join(__dirname, "Ableton Total Git.maxpat"), JSON.stringify(patch, null, 2) + "\n");
