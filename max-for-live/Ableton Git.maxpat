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
            90,
            20
          ],
          "text": "ABLETON GIT"
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
          ]
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
          ]
        }
      },
      {
        "box": {
          "id": "description",
          "maxclass": "textedit",
          "patching_rect": [
            125,
            110,
            230,
            25
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
            110,
            230,
            25
          ]
        }
      },
      {
        "box": {
          "id": "descriptionlabel",
          "maxclass": "comment",
          "patching_rect": [
            8,
            114,
            110,
            20
          ],
          "text": "Commit Comment",
          "presentation": 1,
          "presentation_rect": [
            8,
            114,
            110,
            20
          ]
        }
      },
      {
        "box": {
          "id": "projectlabel",
          "maxclass": "comment",
          "patching_rect": [
            8,
            84,
            75,
            20
          ],
          "text": "Project",
          "presentation": 1,
          "presentation_rect": [
            8,
            84,
            75,
            20
          ]
        }
      },
      {
        "box": {
          "id": "project",
          "maxclass": "umenu",
          "patching_rect": [
            85,
            80,
            275,
            25
          ],
          "items": [
            "Choose project..."
          ],
          "parameter_enable": 0,
          "numinlets": 1,
          "numoutlets": 3,
          "presentation": 1,
          "presentation_rect": [
            85,
            80,
            275,
            25
          ]
        }
      },
      {
        "box": {
          "id": "scope",
          "maxclass": "umenu",
          "patching_rect": [
            370,
            80,
            155,
            25
          ],
          "items": [
            "Current project",
            ",",
            "All projects"
          ],
          "parameter_enable": 0,
          "numinlets": 1,
          "numoutlets": 3,
          "presentation": 1,
          "presentation_rect": [
            370,
            80,
            155,
            25
          ]
        }
      },
      {
        "box": {
          "id": "warning",
          "maxclass": "comment",
          "patching_rect": [
            8,
            0,
            300,
            20
          ],
          "text": "Select a project. Save in Live before Snapshot.",
          "presentation": 1,
          "presentation_rect": [
            8,
            0,
            300,
            20
          ]
        }
      },
      {
        "box": {
          "id": "details",
          "maxclass": "comment",
          "patching_rect": [
            315,
            0,
            210,
            20
          ],
          "text": "",
          "presentation": 1,
          "presentation_rect": [
            315,
            0,
            210,
            20
          ]
        }
      },
      {
        "box": {
          "id": "status",
          "maxclass": "comment",
          "patching_rect": [
            8,
            140,
            537,
            20
          ],
          "text": "Enter library folder, then Start companion.",
          "presentation": 1,
          "presentation_rect": [
            8,
            140,
            537,
            20
          ]
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
          ]
        }
      },
      {
        "box": {
          "id": "filelist",
          "maxclass": "jit.cellblock",
          "patching_rect": [
            555,
            22,
            365,
            140
          ],
          "cols": 2,
          "rows": 1,
          "rowheight": 14,
          "colwidth": 75,
          "hscroll": 1,
          "vscroll": 1,
          "readonly": 1,
          "selmode": 0,
          "neverdirty": 1,
          "datadirty": 0,
          "fontsize": 11,
          "numinlets": 2,
          "numoutlets": 4,
          "bgcolor": [
            0.12,
            0.12,
            0.12,
            1
          ],
          "fgcolor": [
            1,
            1,
            1,
            1
          ],
          "textcolor": [
            1,
            1,
            1,
            1
          ],
          "grid": 0,
          "presentation": 1,
          "presentation_rect": [
            555,
            22,
            365,
            140
          ]
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
          "text": "node.script device.js @autostart 1 @defer 1"
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
          "text": "route status warning busy projectclear projectitem projectselect detail mutations startenabled stopenabled initenabled pushenabled snapshotenabled refreshenabled filelist filesummary descriptionclear libraryrestore scopeselect"
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
          "id": "set1",
          "maxclass": "newobj",
          "patching_rect": [
            108,
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
          "id": "stopactive",
          "maxclass": "newobj",
          "patching_rect": [
            800,
            970,
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
          "id": "scoperestore",
          "maxclass": "newobj",
          "patching_rect": [
            1250,
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
          "id": "clear",
          "maxclass": "message",
          "patching_rect": [
            320,
            585,
            60,
            22
          ],
          "text": "clear"
        }
      },
      {
        "box": {
          "id": "append",
          "maxclass": "newobj",
          "patching_rect": [
            390,
            585,
            250,
            22
          ],
          "text": "prepend append"
        }
      },
      {
        "box": {
          "id": "select",
          "maxclass": "newobj",
          "patching_rect": [
            560,
            585,
            250,
            22
          ],
          "text": "prepend set"
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
          "id": "projectprefix",
          "maxclass": "newobj",
          "patching_rect": [
            520,
            720,
            250,
            22
          ],
          "text": "prepend project"
        }
      },
      {
        "box": {
          "id": "scopeprefix",
          "maxclass": "newobj",
          "patching_rect": [
            520,
            770,
            250,
            22
          ],
          "text": "prepend scope"
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
          ]
        }
      },
      {
        "box": {
          "id": "startcmd",
          "maxclass": "message",
          "patching_rect": [
            85,
            536,
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
          ]
        }
      },
      {
        "box": {
          "id": "initcmd",
          "maxclass": "message",
          "patching_rect": [
            225,
            554,
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
          "id": "stop",
          "maxclass": "textbutton",
          "patching_rect": [
            365,
            50,
            60,
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
          "text": "Stop",
          "presentation": 1,
          "presentation_rect": [
            365,
            50,
            60,
            25
          ]
        }
      },
      {
        "box": {
          "id": "stopcmd",
          "maxclass": "message",
          "patching_rect": [
            365,
            572,
            100,
            22
          ],
          "text": "stop"
        }
      },
      {
        "box": {
          "id": "stoptrigger",
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
          "id": "refresh",
          "maxclass": "textbutton",
          "patching_rect": [
            435,
            50,
            90,
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
          "text": "Refresh projects",
          "presentation": 1,
          "presentation_rect": [
            435,
            50,
            90,
            25
          ]
        }
      },
      {
        "box": {
          "id": "refreshcmd",
          "maxclass": "message",
          "patching_rect": [
            435,
            590,
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
            435,
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
            110,
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
            110,
            75,
            25
          ]
        }
      },
      {
        "box": {
          "id": "pushcmd",
          "maxclass": "message",
          "patching_rect": [
            365,
            608,
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
            110,
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
            110,
            75,
            25
          ]
        }
      },
      {
        "box": {
          "id": "gitstatuscmd",
          "maxclass": "message",
          "patching_rect": [
            450,
            632,
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
      },
      {
        "box": {
          "id": "defaultscope",
          "maxclass": "message",
          "patching_rect": [
            300,
            900,
            70,
            22
          ],
          "text": "set 1"
        }
      },
      {
        "box": {
          "id": "filecolumns",
          "maxclass": "message",
          "patching_rect": [
            930,
            900,
            230,
            22
          ],
          "text": "col 0 width 45, col 1 width 850"
        }
      }
    ],
    "lines": [
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
            1
          ],
          "destination": [
            "set1",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "set1",
            0
          ],
          "destination": [
            "warning",
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
            9
          ],
          "destination": [
            "stopactive",
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
            18
          ],
          "destination": [
            "scoperestore",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "scoperestore",
            0
          ],
          "destination": [
            "scope",
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
            "ignore",
            0
          ],
          "destination": [
            "project",
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
            "scope",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "route",
            3
          ],
          "destination": [
            "clear",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "clear",
            0
          ],
          "destination": [
            "project",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "route",
            4
          ],
          "destination": [
            "append",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "append",
            0
          ],
          "destination": [
            "project",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "route",
            5
          ],
          "destination": [
            "select",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "select",
            0
          ],
          "destination": [
            "project",
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
            "project",
            0
          ],
          "destination": [
            "projectprefix",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "projectprefix",
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
            "scope",
            0
          ],
          "destination": [
            "scopeprefix",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "scopeprefix",
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
            "stop",
            1
          ],
          "destination": [
            "stoptrigger",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "stoptrigger",
            0
          ],
          "destination": [
            "stopcmd",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "stopcmd",
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
            "stopactive",
            0
          ],
          "destination": [
            "stop",
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
      },
      {
        "patchline": {
          "source": [
            "defaults",
            0
          ],
          "destination": [
            "defaultscope",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "defaultscope",
            0
          ],
          "destination": [
            "scope",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "defaults",
            0
          ],
          "destination": [
            "filecolumns",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "filecolumns",
            0
          ],
          "destination": [
            "filelist",
            0
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
      }
    ]
  }
}
