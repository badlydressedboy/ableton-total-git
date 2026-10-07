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
      950
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
            2,
            750,
            20
          ],
          "text": "ABLETON GIT   •   Save in Live before Snapshot",
          "presentation": 1,
          "presentation_rect": [
            8,
            2,
            750,
            20
          ]
        }
      },
      {
        "box": {
          "id": "librarylabel",
          "maxclass": "comment",
          "patching_rect": [
            8,
            29,
            86,
            20
          ],
          "text": "Library folder",
          "presentation": 1,
          "presentation_rect": [
            8,
            29,
            86,
            20
          ]
        }
      },
      {
        "box": {
          "id": "library",
          "maxclass": "textedit",
          "patching_rect": [
            98,
            25,
            465,
            25
          ],
          "numinlets": 1,
          "numoutlets": 4,
          "parameter_enable": 0,
          "keymode": 1,
          "text": "",
          "presentation": 1,
          "presentation_rect": [
            98,
            25,
            465,
            25
          ]
        }
      },
      {
        "box": {
          "id": "description",
          "maxclass": "textedit",
          "patching_rect": [
            98,
            94,
            465,
            25
          ],
          "numinlets": 1,
          "numoutlets": 4,
          "parameter_enable": 0,
          "keymode": 1,
          "text": "",
          "presentation": 1,
          "presentation_rect": [
            98,
            94,
            465,
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
            98,
            86,
            20
          ],
          "text": "Description",
          "presentation": 1,
          "presentation_rect": [
            8,
            98,
            86,
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
            64,
            86,
            20
          ],
          "text": "Project",
          "presentation": 1,
          "presentation_rect": [
            8,
            64,
            86,
            20
          ]
        }
      },
      {
        "box": {
          "id": "project",
          "maxclass": "umenu",
          "patching_rect": [
            98,
            61,
            305,
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
            98,
            61,
            305,
            25
          ]
        }
      },
      {
        "box": {
          "id": "scope",
          "maxclass": "umenu",
          "patching_rect": [
            414,
            61,
            149,
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
            414,
            61,
            149,
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
            122,
            880,
            20
          ],
          "text": "Select the project you want to Snapshot. Save in Live first.",
          "presentation": 1,
          "presentation_rect": [
            8,
            122,
            880,
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
            145,
            880,
            20
          ],
          "text": "Enter library folder, then Start companion.",
          "presentation": 1,
          "presentation_rect": [
            8,
            145,
            880,
            20
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
          "id": "route",
          "maxclass": "newobj",
          "patching_rect": [
            8,
            550,
            250,
            22
          ],
          "text": "route status warning busy projectclear projectitem projectselect detail"
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
            574,
            25,
            132,
            25
          ],
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
            574,
            25,
            132,
            25
          ]
        }
      },
      {
        "box": {
          "id": "startcmd",
          "maxclass": "message",
          "patching_rect": [
            574,
            428,
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
            574,
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
            717,
            25,
            132,
            25
          ],
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
            717,
            25,
            132,
            25
          ]
        }
      },
      {
        "box": {
          "id": "initcmd",
          "maxclass": "message",
          "patching_rect": [
            717,
            446,
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
            717,
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
            860,
            25,
            50,
            25
          ],
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
            860,
            25,
            50,
            25
          ]
        }
      },
      {
        "box": {
          "id": "stopcmd",
          "maxclass": "message",
          "patching_rect": [
            860,
            464,
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
            860,
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
            574,
            61,
            132,
            25
          ],
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
            574,
            61,
            132,
            25
          ]
        }
      },
      {
        "box": {
          "id": "refreshcmd",
          "maxclass": "message",
          "patching_rect": [
            574,
            482,
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
            574,
            230,
            250,
            22
          ],
          "text": "t b"
        }
      },
      {
        "box": {
          "id": "snapshot",
          "maxclass": "textbutton",
          "patching_rect": [
            574,
            94,
            132,
            25
          ],
          "mode": 0,
          "parameter_enable": 0,
          "numinlets": 1,
          "numoutlets": 3,
          "outlettype": [
            "",
            "",
            "int"
          ],
          "text": "Snapshot",
          "presentation": 1,
          "presentation_rect": [
            574,
            94,
            132,
            25
          ]
        }
      },
      {
        "box": {
          "id": "snapshotcmd",
          "maxclass": "message",
          "patching_rect": [
            574,
            500,
            100,
            22
          ],
          "text": "snapshot"
        }
      },
      {
        "box": {
          "id": "snapshottrigger",
          "maxclass": "newobj",
          "patching_rect": [
            574,
            230,
            250,
            22
          ],
          "text": "t b b b"
        }
      },
      {
        "box": {
          "id": "push",
          "maxclass": "textbutton",
          "patching_rect": [
            717,
            94,
            132,
            25
          ],
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
            717,
            94,
            132,
            25
          ]
        }
      },
      {
        "box": {
          "id": "pushcmd",
          "maxclass": "message",
          "patching_rect": [
            717,
            518,
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
            717,
            230,
            250,
            22
          ],
          "text": "t b"
        }
      },
      {
        "box": {
          "id": "pushlabel",
          "maxclass": "comment",
          "patching_rect": [
            717,
            61,
            197,
            20
          ],
          "text": "Push uploads all committed projects",
          "presentation": 1,
          "presentation_rect": [
            717,
            61,
            197,
            20
          ]
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
          "text": "set 0"
        }
      }
    ],
    "lines": [
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
            "warning",
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
            "active",
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
            "active",
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
            "active",
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
            "active",
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
            "snapshot",
            1
          ],
          "destination": [
            "snapshottrigger",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "snapshottrigger",
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
            "snapshottrigger",
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
            "snapshottrigger",
            0
          ],
          "destination": [
            "snapshotcmd",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "snapshotcmd",
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
            "active",
            0
          ],
          "destination": [
            "snapshot",
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
            "active",
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
      }
    ]
  }
}
