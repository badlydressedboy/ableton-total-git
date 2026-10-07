# Max for Live UI

The implemented source patch is `max-for-live/Ableton Git.maxpat`. It uses Node for Max as a thin loopback API client. It starts the Windows companion directly, using arguments rather than a shell; the companion owns Git, LFS, parsing and repository locks. No PowerShell is needed for routine device operations.

```text
ABLETON GIT                    Save in Live before Snapshot
Library folder [D:\Music\Ableton Projects] [Start companion] [Initialise library] [Stop]
Project        [Choose project...]  [Current project ▾]     [Refresh projects]
Description    [Added dub bass variation]                  [Snapshot] [Push]
Select the project you want to Snapshot. Save in Live first.
Snapshot saved: a123456789ab
```

## Package and install

Prerequisites: Windows, Ableton Live with Max for Live / Node for Max, .NET 10 **ASP.NET Core Runtime** (or the .NET 10 SDK), Git for Windows and Git LFS. Configure your Git author and, for Push, the library's remote/tracking branch and authentication through your existing Git tools.

The source package is `artifacts/max-for-live/`. To rebuild it from this repository after restoring the solution, run `node max-for-live/package.js` with Node installed. The device itself uses Max's bundled Node; it has no npm dependencies.

Create the actual `.amxd` using Max:

1. Keep `Ableton Git.maxpat`, `device.js`, `client.js` and the `companion/` directory together in a permanent folder.
2. In Live, add a new **Max Audio Effect** to a track and click its Edit button.
3. In Max, open `Ableton Git.maxpat`, unlock it, select all its objects and copy them. In the new device's main patcher, unlock, remove the template's objects, and paste the copied objects. This includes stereo `plugin~` → `plugout~` connections.
4. Enable **Open in Presentation** in the device patcher's Inspector and set **Device Width** to `930`. Save the device as **Ableton Git.amxd in the same folder as the JS files**. Close the editor and use the device in Live.

Keep the device **unfrozen** and keep its external files beside it. Moving only the `.amxd` breaks the companion lookup. The package is source plus a published Windows companion; a Max installation must save the device container. Rendering, audio pass-through and Node startup have not been verified inside Live in this environment. See Cycling '74's [Node for Max device packaging guide](https://docs.cycling74.com/legacy/max8/vignettes/03_n4m_projects_devices).

## Everyday use

1. Enter the full **parent library folder** path, then click **Start companion**. Before showing Ready, the companion checks that `git --version` and `git lfs version` succeed in its process environment. Initialise, Snapshot and Push remain disabled until both checks pass, and are disabled again when the companion stops. Missing tools show installation/PATH guidance; after installing tools or changing PATH, restart Live and the companion. **Refresh projects** also checks tools again. Use one device/companion instance per library. The device launches a hidden companion process and obtains its fresh token in memory; it never saves the token in the Set or prints it to the Max console. Port `17831` must be free.
2. Click **Initialise library** once for a new library. This creates the parent Git repository if needed, installs local LFS rules and generates reports. Existing nested project repositories are refused; migration remains a separate task.
3. Select the intended project in the project dropdown. **Current project means this explicit selection**, not automatic detection of Live's open Set. It includes every saved Set and eligible local audio in that project.
4. Save in Live; use Collect All and Save when needed. Enter a description and click **Snapshot**. To Snapshot the whole library, change the adjacent scope dropdown to **All projects**. The warning updates to make that scope visible. Scope starts at Current project when the device loads.
5. **Push** uploads the shared repository's committed history across all projects, regardless of Snapshot scope. It is separate from Snapshot; a failed Push leaves the local Snapshot intact.

Refresh projects after adding/removing project folders. Stop the companion before changing the library folder. Stop and mutation controls ignore clicks while an operation runs. A connection failure can leave a server operation completing: check history/status with Git before retrying. If the device's Node process ends while idle, it stops its companion; during an active operation it leaves the companion alive so it can finish. If port `17831` remains occupied after a device restart, finish/check any active operation, then close the old companion before starting another.

No automatic Save, Collect All, open-Set detection, restore, remote setup or Git identity editing is implemented. Advanced setup remains in Git/VS Code/GitHub Desktop.

## API scope and committed baselines

`GET /api/projects` returns `{ all, projects: [{ path, name }] }`; library project paths are repository-relative identifiers. `POST /api/init` initialises the configured root. The host root and mode are fixed at companion startup and cannot be overridden by HTTP requests.

`GET /api/tools` returns `{ ready, checks: [{ level, message }] }` in either mode. It checks Git and Git LFS directly through the companion's typed Git adapter, without a shell, project parsing, repository initialisation or network access. Both missing executables and nonzero version commands produce `ready: false` with friendly repair guidance. The endpoint uses the same local token and loopback restrictions as other requests. These checks establish executable availability; Git identity, repository state, LFS configuration and remote authentication are checked by the operations that require them.

Project Snapshot:

```json
{ "message": "Added dub bass variation", "push": false, "scope": "project", "project": "Dub Project" }
```

Whole-library Snapshot:

```json
{ "message": "Saved work across the library", "push": false, "scope": "all" }
```

Omitting scope retains the earlier API behavior: all projects in library mode, or the configured single project in single-project mode. Invalid scope combinations and projects outside the configured library are rejected. Single-project mode supports `scope: "project"` with `project: "."`.

A project Snapshot stages only that project's eligible files/reports, plus the shared catalog and root Git/LFS rules. The catalog advances only that project's models, preserving committed sibling models even if Analyse has already generated newer sibling reports. Pending sibling files/reports stay pending. Selected-project Set deletions remove its committed entries/reports without deleting music. Parsing, hashing and report generation use up to four concurrent workers within the scope; staging/committing/pushing use the shared serial lock.

## Verification

Run `node --test max-for-live/client.test.js` for scope, duplicate-click, error and real-loopback transport checks. The .NET executable suite covers first scoped Snapshot, sibling baseline/report preservation, deletions, unreadable siblings, invalid scope and HTTP routing in real temporary Git/LFS repositories. A hands-on Live check is still required: load the saved device, test Current project, verify sibling pending changes, test All projects, check unchanged audio routing, and test Push against a configured remote.
