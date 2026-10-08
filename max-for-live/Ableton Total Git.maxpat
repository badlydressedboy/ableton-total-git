{
  "patcher": {
    "fileversion": 1,
    "appversion": {
      "major": 8,
      "minor": 6,
      "revision": 5,
      "architecture": "x64",
      "modernui": 1
    },
    "classnamespace": "box",
    "title": "Ableton Total Git",
    "rect": [
      0,
      0,
      930,
      1200
    ],
    "openinpresentation": 1,
    "devicewidth": 930,
    "default_fontsize": 12,
    "default_fontface": 0,
    "default_fontname": "Arial",
    "boxes": [
      {
        "box": {
          "id": "title",
          "maxclass": "comment",
          "patching_rect": [
            8,
            200,
            150,
            20
          ],
          "text": "ABLETON TOTAL GIT"
        }
      },
      {
        "box": {
          "id": "librarylabel",
          "maxclass": "comment",
          "patching_rect": [
            8,
            26,
            75,
            20
          ],
          "text": "Library folder",
          "presentation": 1,
          "presentation_rect": [
            8,
            26,
            75,
            20
          ],
          "annotation_name": "Library folder",
          "annotation": "Full path to the parent Ableton projects library tracked in one Git repository. This folder is remembered and starts automatically next time. Press Enter or Tab to apply a folder edit and start automatically. Changing to another valid folder automatically restarts the running companion and rescans. Folder changes wait for an active operation to finish. Editing is locked while an operation runs."
        }
      },
      {
        "box": {
          "id": "library",
          "maxclass": "textedit",
          "patching_rect": [
            85,
            22,
            440,
            25
          ],
          "fontsize": 12,
          "lines": 1,
          "wordwrap": 0,
          "autoscroll": 1,
          "border": 5,
          "rounded": 5,
          "bgcolor": [
            0.24,
            0.24,
            0.24,
            1
          ],
          "bordercolor": [
            0.24,
            0.24,
            0.24,
            1
          ],
          "textcolor": [
            0.94,
            0.94,
            0.94,
            1
          ],
          "numinlets": 1,
          "numoutlets": 4,
          "parameter_enable": 0,
          "keymode": 1,
          "outputmode": 1,
          "valuemode": 0,
          "text": "",
          "presentation": 1,
          "presentation_rect": [
            85,
            22,
            440,
            25
          ],
          "annotation_name": "Library folder",
          "annotation": "Full path to the parent Ableton projects library tracked in one Git repository. This folder is remembered and starts automatically next time. Press Enter or Tab to apply a folder edit and start automatically. Changing to another valid folder automatically restarts the running companion and rescans. Folder changes wait for an active operation to finish. Editing is locked while an operation runs."
        }
      },
      {
        "box": {
          "id": "description",
          "maxclass": "textedit",
          "patching_rect": [
            125,
            80,
            230,
            25
          ],
          "fontsize": 12,
          "lines": 1,
          "wordwrap": 0,
          "autoscroll": 1,
          "border": 5,
          "rounded": 5,
          "bgcolor": [
            0.24,
            0.24,
            0.24,
            1
          ],
          "bordercolor": [
            0.24,
            0.24,
            0.24,
            1
          ],
          "textcolor": [
            0.94,
            0.94,
            0.94,
            1
          ],
          "numinlets": 1,
          "numoutlets": 4,
          "parameter_enable": 0,
          "keymode": 1,
          "outputmode": 1,
          "text": "Raw Creativity",
          "presentation": 1,
          "presentation_rect": [
            125,
            80,
            230,
            25
          ],
          "annotation_name": "Commit Comment",
          "annotation": "Comment recorded with the next commit. Click the default Raw Creativity text to select it all for easy replacement. Custom comments retain normal cursor behavior. Enter at least four characters after trimming surrounding spaces to commit changed files. Raw Creativity returns after a successful commit. Editing is locked while an operation runs. Uploading existing commits does not require a new comment."
        }
      },
      {
        "box": {
          "id": "descriptionlabel",
          "maxclass": "comment",
          "patching_rect": [
            8,
            84,
            110,
            20
          ],
          "text": "Commit Comment",
          "presentation": 1,
          "presentation_rect": [
            8,
            84,
            110,
            20
          ],
          "annotation_name": "Commit Comment",
          "annotation": "Comment recorded with the next commit. Click the default Raw Creativity text to select it all for easy replacement. Custom comments retain normal cursor behavior. Enter at least four characters after trimming surrounding spaces to commit changed files. Raw Creativity returns after a successful commit. Editing is locked while an operation runs. Uploading existing commits does not require a new comment."
        }
      },
      {
        "box": {
          "id": "details",
          "maxclass": "comment",
          "patching_rect": [
            8,
            140,
            537,
            20
          ],
          "text": "",
          "presentation": 1,
          "presentation_rect": [
            8,
            140,
            537,
            20
          ],
          "annotation_name": "Analysis warnings",
          "annotation": "Warnings from analysing saved Sets and media references. Complete warnings are printed in the Max Console. Resolve external or missing media in Live with Collect All and Save when appropriate."
        }
      },
      {
        "box": {
          "id": "status",
          "maxclass": "comment",
          "patching_rect": [
            8,
            110,
            537,
            20
          ],
          "text": "Loading companion script...",
          "presentation": 1,
          "presentation_rect": [
            8,
            110,
            537,
            20
          ],
          "annotation_name": "Companion status",
          "annotation": "Latest startup, operation result or error. Long messages are shortened here and printed in full in the Max Console. Hover over a disabled button for the conditions needed to enable it."
        }
      },
      {
        "box": {
          "id": "filesummary",
          "maxclass": "comment",
          "patching_rect": [
            555,
            0,
            365,
            20
          ],
          "text": "Start the companion to preview files.",
          "presentation": 1,
          "presentation_rect": [
            555,
            0,
            365,
            20
          ],
          "annotation_name": "File count",
          "annotation": "Number of eligible files that the next commit will include across the whole library. Start and initialise the companion library to see the preview. Zero files can still allow Push when existing commits are ready to upload."
        }
      },
      {
        "box": {
          "id": "filelist",
          "maxclass": "jsui",
          "patching_rect": [
            555,
            22,
            365,
            140
          ],
          "filename": "file-list.js",
          "border": 0,
          "parameter_enable": 0,
          "numinlets": 1,
          "numoutlets": 0,
          "presentation": 1,
          "presentation_rect": [
            555,
            22,
            365,
            140
          ],
          "annotation_name": "Files to commit",
          "annotation": "Read-only preview of eligible changed files across the whole library, including generated .abletongit reports. The left column shows Git change status. Drag the slim scrollbars, click their tracks, or drag the list to scroll vertically and horizontally. Scrollbars appear only when needed. Preview does not commit files. Save in Live before reviewing or pushing."
        }
      },
      {
        "box": {
          "id": "node",
          "maxclass": "newobj",
          "patching_rect": [
            8,
            500,
            250,
            22
          ],
          "text": "node.script device.js @autostart 0 @defer 1"
        }
      },
      {
        "box": {
          "id": "deviceready",
          "maxclass": "newobj",
          "patching_rect": [
            8,
            450,
            250,
            22
          ],
          "text": "live.thisdevice"
        }
      },
      {
        "box": {
          "id": "startonce",
          "maxclass": "newobj",
          "patching_rect": [
            280,
            450,
            250,
            22
          ],
          "text": "onebang 1"
        }
      },
      {
        "box": {
          "id": "startdefer",
          "maxclass": "newobj",
          "patching_rect": [
            550,
            450,
            250,
            22
          ],
          "text": "deferlow"
        }
      },
      {
        "box": {
          "id": "namedefer",
          "maxclass": "newobj",
          "patching_rect": [
            8,
            1140,
            250,
            22
          ],
          "text": "deferlow"
        }
      },
      {
        "box": {
          "id": "namepath",
          "maxclass": "newobj",
          "patching_rect": [
            280,
            1140,
            250,
            22
          ],
          "text": "live.path this_device"
        }
      },
      {
        "box": {
          "id": "nameid",
          "maxclass": "newobj",
          "patching_rect": [
            550,
            1140,
            250,
            22
          ],
          "text": "route id"
        }
      },
      {
        "box": {
          "id": "namevalid",
          "maxclass": "newobj",
          "patching_rect": [
            820,
            1140,
            250,
            22
          ],
          "text": "sel 0"
        }
      },
      {
        "box": {
          "id": "namebind",
          "maxclass": "newobj",
          "patching_rect": [
            8,
            1180,
            250,
            22
          ],
          "text": "t b i"
        }
      },
      {
        "box": {
          "id": "nameprefix",
          "maxclass": "newobj",
          "patching_rect": [
            280,
            1180,
            250,
            22
          ],
          "text": "prepend id"
        }
      },
      {
        "box": {
          "id": "nameobject",
          "maxclass": "newobj",
          "patching_rect": [
            550,
            1180,
            250,
            22
          ],
          "text": "live.object"
        }
      },
      {
        "box": {
          "id": "namewrite",
          "maxclass": "newobj",
          "patching_rect": [
            820,
            1180,
            250,
            22
          ],
          "text": "deferlow"
        }
      },
      {
        "box": {
          "id": "devicename",
          "maxclass": "message",
          "patching_rect": [
            1090,
            1180,
            190,
            22
          ],
          "text": "set name \"Ableton Total Git\""
        }
      },
      {
        "box": {
          "id": "scriptstart",
          "maxclass": "message",
          "patching_rect": [
            280,
            500,
            95,
            22
          ],
          "text": "script start"
        }
      },
      {
        "box": {
          "id": "visibilityprobe",
          "maxclass": "jsui",
          "patching_rect": [
            0,
            0,
            930,
            1
          ],
          "filename": "visibility.js",
          "presentation": 1,
          "presentation_rect": [
            0,
            0,
            930,
            1
          ],
          "border": 0,
          "ignoreclick": 1,
          "parameter_enable": 0,
          "numinlets": 1,
          "numoutlets": 1,
          "annotation_name": "Device visibility",
          "annotation": "Background file scanning pauses while this device is hidden and resumes when it is shown."
        }
      },
      {
        "box": {
          "id": "runtimeconsole",
          "maxclass": "newobj",
          "patching_rect": [
            380,
            500,
            250,
            22
          ],
          "text": "print AbletonGit-runtime"
        }
      },
      {
        "box": {
          "id": "route",
          "maxclass": "newobj",
          "patching_rect": [
            8,
            550,
            250,
            22
          ],
          "text": "route status warning busy projectclear projectitem projectselect detail mutations startenabled stopenabled initenabled pushenabled snapshotenabled refreshenabled filelist filesummary descriptionclear libraryrestore scopeselect visibilityrequest"
        }
      },
      {
        "box": {
          "id": "set0",
          "maxclass": "newobj",
          "patching_rect": [
            8,
            585,
            250,
            22
          ],
          "text": "prepend set"
        }
      },
      {
        "box": {
          "id": "set6",
          "maxclass": "newobj",
          "patching_rect": [
            608,
            585,
            250,
            22
          ],
          "text": "prepend set"
        }
      },
      {
        "box": {
          "id": "set15",
          "maxclass": "newobj",
          "patching_rect": [
            1508,
            585,
            250,
            22
          ],
          "text": "prepend set"
        }
      },
      {
        "box": {
          "id": "notbusy",
          "maxclass": "newobj",
          "patching_rect": [
            220,
            630,
            250,
            22
          ],
          "text": "== 0"
        }
      },
      {
        "box": {
          "id": "active",
          "maxclass": "newobj",
          "patching_rect": [
            220,
            660,
            250,
            22
          ],
          "text": "prepend active"
        }
      },
      {
        "box": {
          "id": "mutations",
          "maxclass": "newobj",
          "patching_rect": [
            740,
            660,
            250,
            22
          ],
          "text": "prepend active"
        }
      },
      {
        "box": {
          "id": "startactive",
          "maxclass": "newobj",
          "patching_rect": [
            800,
            940,
            250,
            22
          ],
          "text": "prepend active"
        }
      },
      {
        "box": {
          "id": "initactive",
          "maxclass": "newobj",
          "patching_rect": [
            800,
            1000,
            250,
            22
          ],
          "text": "prepend active"
        }
      },
      {
        "box": {
          "id": "pushactive",
          "maxclass": "newobj",
          "patching_rect": [
            800,
            1030,
            250,
            22
          ],
          "text": "prepend active"
        }
      },
      {
        "box": {
          "id": "snapshotactive",
          "maxclass": "newobj",
          "patching_rect": [
            800,
            1060,
            250,
            22
          ],
          "text": "prepend active"
        }
      },
      {
        "box": {
          "id": "refreshactive",
          "maxclass": "newobj",
          "patching_rect": [
            800,
            1090,
            250,
            22
          ],
          "text": "prepend active"
        }
      },
      {
        "box": {
          "id": "descriptionclear",
          "maxclass": "message",
          "patching_rect": [
            900,
            585,
            140,
            22
          ],
          "text": "set Raw Creativity"
        }
      },
      {
        "box": {
          "id": "descriptionkeys",
          "maxclass": "newobj",
          "patching_rect": [
            270,
            810,
            250,
            22
          ],
          "text": "deferlow"
        }
      },
      {
        "box": {
          "id": "descriptionbang",
          "maxclass": "newobj",
          "patching_rect": [
            520,
            810,
            250,
            22
          ],
          "text": "t b"
        }
      },
      {
        "box": {
          "id": "commentclick",
          "maxclass": "newobj",
          "patching_rect": [
            10,
            960,
            250,
            22
          ],
          "text": "t b"
        }
      },
      {
        "box": {
          "id": "commentwaiton",
          "maxclass": "message",
          "patching_rect": [
            10,
            1040,
            35,
            22
          ],
          "text": "1"
        }
      },
      {
        "box": {
          "id": "commentwait",
          "maxclass": "newobj",
          "patching_rect": [
            270,
            1040,
            250,
            22
          ],
          "text": "qmetro 20"
        }
      },
      {
        "box": {
          "id": "commentmouseup",
          "maxclass": "newobj",
          "patching_rect": [
            540,
            1040,
            250,
            22
          ],
          "text": "mousefilter"
        }
      },
      {
        "box": {
          "id": "commentreleased",
          "maxclass": "newobj",
          "patching_rect": [
            800,
            1040,
            250,
            22
          ],
          "text": "t b b"
        }
      },
      {
        "box": {
          "id": "commentwaitoff",
          "maxclass": "message",
          "patching_rect": [
            1070,
            1040,
            35,
            22
          ],
          "text": "0"
        }
      },
      {
        "box": {
          "id": "commentclickdefer",
          "maxclass": "newobj",
          "patching_rect": [
            270,
            960,
            250,
            22
          ],
          "text": "deferlow"
        }
      },
      {
        "box": {
          "id": "commentread",
          "maxclass": "newobj",
          "patching_rect": [
            540,
            960,
            250,
            22
          ],
          "text": "t b b b"
        }
      },
      {
        "box": {
          "id": "commentgateon",
          "maxclass": "message",
          "patching_rect": [
            800,
            960,
            35,
            22
          ],
          "text": "1"
        }
      },
      {
        "box": {
          "id": "commentgateoff",
          "maxclass": "message",
          "patching_rect": [
            840,
            960,
            35,
            22
          ],
          "text": "0"
        }
      },
      {
        "box": {
          "id": "commentdefault",
          "maxclass": "newobj",
          "patching_rect": [
            10,
            1000,
            250,
            22
          ],
          "text": "sel \"Raw Creativity\""
        }
      },
      {
        "box": {
          "id": "commenttext",
          "maxclass": "newobj",
          "patching_rect": [
            10,
            1080,
            250,
            22
          ],
          "text": "tosymbol"
        }
      },
      {
        "box": {
          "id": "commentgate",
          "maxclass": "newobj",
          "patching_rect": [
            270,
            1000,
            250,
            22
          ],
          "text": "gate 1 0"
        }
      },
      {
        "box": {
          "id": "commentselect",
          "maxclass": "message",
          "patching_rect": [
            540,
            1000,
            70,
            22
          ],
          "text": "select"
        }
      },
      {
        "box": {
          "id": "libraryrestore",
          "maxclass": "newobj",
          "patching_rect": [
            1000,
            585,
            250,
            22
          ],
          "text": "prepend set"
        }
      },
      {
        "box": {
          "id": "ignore",
          "maxclass": "newobj",
          "patching_rect": [
            460,
            660,
            250,
            22
          ],
          "text": "prepend sendbox ignoreclick"
        }
      },
      {
        "box": {
          "id": "libraryroute",
          "maxclass": "newobj",
          "patching_rect": [
            10,
            720,
            250,
            22
          ],
          "text": "route text"
        }
      },
      {
        "box": {
          "id": "libraryprefix",
          "maxclass": "newobj",
          "patching_rect": [
            270,
            720,
            250,
            22
          ],
          "text": "prepend library"
        }
      },
      {
        "box": {
          "id": "descriptionroute",
          "maxclass": "newobj",
          "patching_rect": [
            10,
            770,
            250,
            22
          ],
          "text": "route text"
        }
      },
      {
        "box": {
          "id": "descriptionprefix",
          "maxclass": "newobj",
          "patching_rect": [
            270,
            770,
            250,
            22
          ],
          "text": "prepend description"
        }
      },
      {
        "box": {
          "id": "start",
          "maxclass": "textbutton",
          "patching_rect": [
            85,
            50,
            130,
            25
          ],
          "active": 1,
          "mode": 0,
          "parameter_enable": 0,
          "numinlets": 1,
          "numoutlets": 3,
          "outlettype": [
            "",
            "",
            "int"
          ],
          "text": "Start companion",
          "presentation": 1,
          "presentation_rect": [
            85,
            50,
            130,
            25
          ],
          "annotation_name": "Start companion",
          "annotation": "Retry starting the background companion for the library folder and check Git and Git LFS. Valid folder input and saved folders start automatically; unexpected exits are restarted. Disabled while this device already owns a running companion or an operation is active. A valid folder and the companion files are required."
        }
      },
      {
        "box": {
          "id": "startcmd",
          "maxclass": "message",
          "patching_rect": [
            85,
            626,
            100,
            22
          ],
          "text": "start"
        }
      },
      {
        "box": {
          "id": "starttrigger",
          "maxclass": "newobj",
          "patching_rect": [
            85,
            230,
            250,
            22
          ],
          "text": "t b b b"
        }
      },
      {
        "box": {
          "id": "init",
          "maxclass": "textbutton",
          "patching_rect": [
            225,
            50,
            130,
            25
          ],
          "active": 0,
          "mode": 0,
          "parameter_enable": 0,
          "numinlets": 1,
          "numoutlets": 3,
          "outlettype": [
            "",
            "",
            "int"
          ],
          "text": "Initialise library",
          "presentation": 1,
          "presentation_rect": [
            225,
            50,
            130,
            25
          ],
          "annotation_name": "Initialise library",
          "annotation": "Create the library Git repository, configure Git LFS and generate project reports. Disabled if the companion is not connected, Git or Git LFS checks fail, an operation is active, repository state is unavailable, or this folder is already initialised or is not the repository root."
        }
      },
      {
        "box": {
          "id": "initcmd",
          "maxclass": "message",
          "patching_rect": [
            225,
            644,
            100,
            22
          ],
          "text": "init"
        }
      },
      {
        "box": {
          "id": "inittrigger",
          "maxclass": "newobj",
          "patching_rect": [
            225,
            230,
            250,
            22
          ],
          "text": "t b"
        }
      },
      {
        "box": {
          "id": "refresh",
          "maxclass": "textbutton",
          "patching_rect": [
            365,
            50,
            160,
            25
          ],
          "active": 0,
          "mode": 0,
          "parameter_enable": 0,
          "numinlets": 1,
          "numoutlets": 3,
          "outlettype": [
            "",
            "",
            "int"
          ],
          "text": "Refresh library",
          "presentation": 1,
          "presentation_rect": [
            365,
            50,
            160,
            25
          ],
          "annotation_name": "Refresh library",
          "annotation": "Check Git and Git LFS again and refresh the file preview across the whole library. Saved file changes are also scanned automatically. Disabled before the companion connects or while an operation is active."
        }
      },
      {
        "box": {
          "id": "refreshcmd",
          "maxclass": "message",
          "patching_rect": [
            365,
            662,
            100,
            22
          ],
          "text": "refresh"
        }
      },
      {
        "box": {
          "id": "refreshtrigger",
          "maxclass": "newobj",
          "patching_rect": [
            365,
            230,
            250,
            22
          ],
          "text": "t b"
        }
      },
      {
        "box": {
          "id": "push",
          "maxclass": "textbutton",
          "patching_rect": [
            365,
            80,
            75,
            25
          ],
          "active": 0,
          "mode": 0,
          "parameter_enable": 0,
          "numinlets": 1,
          "numoutlets": 3,
          "outlettype": [
            "",
            "",
            "int"
          ],
          "text": "Push",
          "presentation": 1,
          "presentation_rect": [
            365,
            80,
            75,
            25
          ],
          "annotation_name": "Push",
          "annotation": "Save in Live first. Commit all eligible changed files across the library using Commit Comment, then upload committed history if a tracking remote is configured. Without a remote, the commit stays local. Failed uploads keep the commit for retry. Disabled if the companion is not ready, Git or Git LFS checks fail, an operation runs, state is unavailable, the library needs initialising, changed files lack a four-character comment, or there are neither changes to commit nor commits ready to upload."
        }
      },
      {
        "box": {
          "id": "pushcmd",
          "maxclass": "message",
          "patching_rect": [
            365,
            680,
            100,
            22
          ],
          "text": "push"
        }
      },
      {
        "box": {
          "id": "pushtrigger",
          "maxclass": "newobj",
          "patching_rect": [
            365,
            230,
            250,
            22
          ],
          "text": "t b b b"
        }
      },
      {
        "box": {
          "id": "gitstatusactive",
          "maxclass": "newobj",
          "patching_rect": [
            1250,
            660,
            250,
            22
          ],
          "text": "prepend active"
        }
      },
      {
        "box": {
          "id": "gitstatus",
          "maxclass": "textbutton",
          "patching_rect": [
            450,
            80,
            75,
            25
          ],
          "active": 1,
          "mode": 0,
          "parameter_enable": 0,
          "numinlets": 1,
          "numoutlets": 3,
          "outlettype": [
            "",
            "",
            "int"
          ],
          "text": "Git status",
          "presentation": 1,
          "presentation_rect": [
            450,
            80,
            75,
            25
          ],
          "annotation_name": "Git status",
          "annotation": "Open PowerShell on Windows or Terminal on macOS in the library folder and run git status. The window stays open. Requires a valid folder; the companion can be stopped. Disabled while an operation is active."
        }
      },
      {
        "box": {
          "id": "gitstatuscmd",
          "maxclass": "message",
          "patching_rect": [
            450,
            704,
            100,
            22
          ],
          "text": "gitstatus"
        }
      },
      {
        "box": {
          "id": "gitstatustrigger",
          "maxclass": "newobj",
          "patching_rect": [
            450,
            230,
            250,
            22
          ],
          "text": "t b b b"
        }
      },
      {
        "box": {
          "id": "audioin",
          "maxclass": "newobj",
          "patching_rect": [
            10,
            850,
            250,
            22
          ],
          "text": "plugin~"
        }
      },
      {
        "box": {
          "id": "audioout",
          "maxclass": "newobj",
          "patching_rect": [
            10,
            900,
            250,
            22
          ],
          "text": "plugout~"
        }
      },
      {
        "box": {
          "id": "defaults",
          "maxclass": "newobj",
          "patching_rect": [
            300,
            850,
            250,
            22
          ],
          "text": "loadbang"
        }
      }
    ],
    "lines": [
      {
        "patchline": {
          "source": [
            "deviceready",
            0
          ],
          "destination": [
            "startonce",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "startonce",
            0
          ],
          "destination": [
            "startdefer",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "startdefer",
            0
          ],
          "destination": [
            "scriptstart",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "startonce",
            0
          ],
          "destination": [
            "namedefer",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "namedefer",
            0
          ],
          "destination": [
            "namepath",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "namepath",
            0
          ],
          "destination": [
            "nameid",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "nameid",
            0
          ],
          "destination": [
            "namevalid",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "namevalid",
            1
          ],
          "destination": [
            "namebind",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "namebind",
            1
          ],
          "destination": [
            "nameprefix",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "nameprefix",
            0
          ],
          "destination": [
            "nameobject",
            1
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "namebind",
            0
          ],
          "destination": [
            "namewrite",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "namewrite",
            0
          ],
          "destination": [
            "devicename",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "devicename",
            0
          ],
          "destination": [
            "nameobject",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "scriptstart",
            0
          ],
          "destination": [
            "node",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "visibilityprobe",
            0
          ],
          "destination": [
            "node",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "node",
            1
          ],
          "destination": [
            "runtimeconsole",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "route",
            19
          ],
          "destination": [
            "visibilityprobe",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "node",
            0
          ],
          "destination": [
            "route",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "route",
            0
          ],
          "destination": [
            "set0",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "set0",
            0
          ],
          "destination": [
            "status",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "route",
            6
          ],
          "destination": [
            "set6",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "set6",
            0
          ],
          "destination": [
            "details",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "route",
            15
          ],
          "destination": [
            "set15",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "set15",
            0
          ],
          "destination": [
            "filesummary",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "route",
            2
          ],
          "destination": [
            "notbusy",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "notbusy",
            0
          ],
          "destination": [
            "active",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "route",
            7
          ],
          "destination": [
            "mutations",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "route",
            8
          ],
          "destination": [
            "startactive",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "route",
            10
          ],
          "destination": [
            "initactive",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "route",
            11
          ],
          "destination": [
            "pushactive",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "route",
            12
          ],
          "destination": [
            "snapshotactive",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "route",
            13
          ],
          "destination": [
            "refreshactive",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "route",
            14
          ],
          "destination": [
            "filelist",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "route",
            16
          ],
          "destination": [
            "descriptionclear",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "descriptionclear",
            0
          ],
          "destination": [
            "description",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "description",
            1
          ],
          "destination": [
            "descriptionkeys",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "descriptionkeys",
            0
          ],
          "destination": [
            "descriptionbang",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "descriptionbang",
            0
          ],
          "destination": [
            "description",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "description",
            2
          ],
          "destination": [
            "commentclick",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "commentclick",
            0
          ],
          "destination": [
            "commentwaiton",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "commentwaiton",
            0
          ],
          "destination": [
            "commentwait",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "commentwait",
            0
          ],
          "destination": [
            "commentmouseup",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "commentmouseup",
            0
          ],
          "destination": [
            "commentreleased",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "commentreleased",
            1
          ],
          "destination": [
            "commentwaitoff",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "commentwaitoff",
            0
          ],
          "destination": [
            "commentwait",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "commentreleased",
            0
          ],
          "destination": [
            "commentclickdefer",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "commentclickdefer",
            0
          ],
          "destination": [
            "commentread",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "commentread",
            2
          ],
          "destination": [
            "commentgateon",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "commentgateon",
            0
          ],
          "destination": [
            "commentgate",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "commentread",
            1
          ],
          "destination": [
            "description",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "commentread",
            0
          ],
          "destination": [
            "commentgateoff",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "commentgateoff",
            0
          ],
          "destination": [
            "commentgate",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "descriptionroute",
            0
          ],
          "destination": [
            "commenttext",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "commenttext",
            0
          ],
          "destination": [
            "commentdefault",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "commentdefault",
            0
          ],
          "destination": [
            "commentgate",
            1
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "commentgate",
            0
          ],
          "destination": [
            "commentselect",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "commentselect",
            0
          ],
          "destination": [
            "description",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "route",
            17
          ],
          "destination": [
            "libraryrestore",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "libraryrestore",
            0
          ],
          "destination": [
            "library",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "route",
            2
          ],
          "destination": [
            "ignore",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "ignore",
            0
          ],
          "destination": [
            "library",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "ignore",
            0
          ],
          "destination": [
            "description",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "library",
            0
          ],
          "destination": [
            "libraryroute",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "libraryroute",
            0
          ],
          "destination": [
            "libraryprefix",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "libraryprefix",
            0
          ],
          "destination": [
            "node",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "description",
            0
          ],
          "destination": [
            "descriptionroute",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "descriptionroute",
            0
          ],
          "destination": [
            "descriptionprefix",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "descriptionprefix",
            0
          ],
          "destination": [
            "node",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "start",
            1
          ],
          "destination": [
            "starttrigger",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "starttrigger",
            2
          ],
          "destination": [
            "description",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "starttrigger",
            1
          ],
          "destination": [
            "library",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "starttrigger",
            0
          ],
          "destination": [
            "startcmd",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "startcmd",
            0
          ],
          "destination": [
            "node",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "startactive",
            0
          ],
          "destination": [
            "start",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "init",
            1
          ],
          "destination": [
            "inittrigger",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "inittrigger",
            0
          ],
          "destination": [
            "initcmd",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "initcmd",
            0
          ],
          "destination": [
            "node",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "initactive",
            0
          ],
          "destination": [
            "init",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "refresh",
            1
          ],
          "destination": [
            "refreshtrigger",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "refreshtrigger",
            0
          ],
          "destination": [
            "refreshcmd",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "refreshcmd",
            0
          ],
          "destination": [
            "node",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "refreshactive",
            0
          ],
          "destination": [
            "refresh",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "push",
            1
          ],
          "destination": [
            "pushtrigger",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "pushtrigger",
            2
          ],
          "destination": [
            "description",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "pushtrigger",
            1
          ],
          "destination": [
            "library",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "pushtrigger",
            0
          ],
          "destination": [
            "pushcmd",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "pushcmd",
            0
          ],
          "destination": [
            "node",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "pushactive",
            0
          ],
          "destination": [
            "push",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "notbusy",
            0
          ],
          "destination": [
            "gitstatusactive",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "gitstatus",
            1
          ],
          "destination": [
            "gitstatustrigger",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "gitstatustrigger",
            2
          ],
          "destination": [
            "description",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "gitstatustrigger",
            1
          ],
          "destination": [
            "library",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "gitstatustrigger",
            0
          ],
          "destination": [
            "gitstatuscmd",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "gitstatuscmd",
            0
          ],
          "destination": [
            "node",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "gitstatusactive",
            0
          ],
          "destination": [
            "gitstatus",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "audioin",
            0
          ],
          "destination": [
            "audioout",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "audioin",
            1
          ],
          "destination": [
            "audioout",
            1
          ]
        }
      }
    ],
    "dependency_cache": [
      {
        "name": "device.js",
        "bootpath": ".",
        "type": "TEXT",
        "implicit": 1
      },
      {
        "name": "client.js",
        "bootpath": ".",
        "type": "TEXT",
        "implicit": 1
      },
      {
        "name": "preferences.js",
        "bootpath": ".",
        "type": "TEXT",
        "implicit": 1
      },
      {
        "name": "platform.js",
        "bootpath": ".",
        "type": "TEXT",
        "implicit": 1
      },
      {
        "name": "visibility.js",
        "bootpath": ".",
        "type": "TEXT",
        "implicit": 1
      },
      {
        "name": "file-list.js",
        "bootpath": ".",
        "type": "TEXT",
        "implicit": 1
      }
    ]
  }
}
