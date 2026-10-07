# Max for Live UI

The implemented source patch is `max-for-live/Ableton Git.maxpat`. It uses Node for Max as a thin loopback API client. It starts the Windows companion directly, using arguments rather than a shell; the companion owns Git, LFS, parsing and repository locks. No PowerShell is needed for routine device operations.

```text
ABLETON GIT                    Save in Live before Snapshot
Library folder [D:\Music\Ableton Projects] [Start companion] [Initialise library] [Stop]
Project        [Choose project...]  [Current project ▾]     [Refresh projects]
Description    [Raw Creativity]                            [Push]
Select the project you want to Snapshot. Save in Live first.
Snapshot saved: a123456789ab
```

## Package and install

Prerequisites: Windows, Ableton Live with Max for Live / Node for Max, .NET 10 **ASP.NET Core Runtime** (or the .NET 10 SDK), Git for Windows and Git LFS. Configure your Git author and, for Push, the library's remote/tracking branch and authentication through your existing Git tools.

The source package is `artifacts/max-for-live/`. To rebuild it from this repository after restoring the solution, run `node max-for-live/package.js` with Node installed. The device itself uses Max's bundled Node; it has no npm dependencies.

Create the actual `.amxd` using Max:

1. Keep `Ableton Git.maxpat`, `device.js`, `client.js`, `preferences.js` and the `companion/` directory together in a permanent folder.
2. In Live, add a new **Max Audio Effect** to a track and click its Edit button.
3. In Max, open `Ableton Git.maxpat`, unlock it, select all its objects and copy them. In the new device's main patcher, unlock, remove the template's objects, and paste the copied objects. This includes stereo `plugin~` → `plugout~` connections.
4. Enable **Open in Presentation** in the device patcher's Inspector and set **Device Width** to `930`. Save the device as **Ableton Git.amxd in the same folder as the JS files**. Close the editor and use the device in Live. Controls fit inside Live's device panel; open the Max window to see the full expanded file list.

Keep the device **unfrozen** and keep its external files beside it. Moving only the `.amxd` breaks the companion lookup. The package is source plus a published Windows companion; a Max installation must save the device container. Rendering, audio pass-through and Node startup have not been verified inside Live in this environment. See Cycling '74's [Node for Max device packaging guide](https://docs.cycling74.com/legacy/max8/vignettes/03_n4m_projects_devices).

## Everyday use

The file list uses white text on dark charcoal cells and background. The client reapplies these colours when populating the list, so existing preview patches receive the contrast fix after replacing the JS files and reloading.

The library folder is remembered after starting with a valid folder. It is saved in `%LOCALAPPDATA%\AbletonGit\max-for-live.json` and restored into the path field when the device's Node script reloads. If a saved folder is present, the companion starts automatically and checks Git/Git LFS. This preference survives package upgrades and Live restarts; it stores only the folder path. Changing to another valid folder and starting updates the saved preference. If settings cannot be read or saved, the Max Console reports the problem and manual path input remains available. Automatic field restoration requires the updated patch's `libraryrestore` wire. Close previous companion instances before reopening the patch so the new instance can use the local API port.

The changed-file panel is 912 pixels wide and 276 pixels tall. Its count sits on a separate line, 20 pixels below the status text, with the list immediately below it. This expanded layout is intended for the Max presentation window: Live's fixed 169-pixel device height clips the lower list. Scroll vertically for additional files and horizontally for exceptionally long paths. Its summary says how many files will be committed in the selected project or All projects scope, including generated reports and deletions. The list is read-only and uses Max's [jit.cellblock](https://docs.cycling74.com/reference/jit.cellblock/) with editing disabled. It refreshes after selection changes, Initialise, Snapshot, Push, Refresh projects, and every five seconds while idle. Unchanged refreshes preserve the scroll position. The preview does not write reports, stage files, commit or fetch from the remote; Snapshot checks the saved files again when clicked.

**Initialise library** is enabled only when setup is needed at the repository root. **Stop** is enabled only while this device owns a running companion and no operation is active; **Start companion** is disabled while it is running. The single **Push** button commits eligible changes in the selected scope first, then uploads the repository's committed history if a remote/tracking branch is available. It enables for pending files with a valid description, or existing commits ready to upload. With no remote, it saves the commit locally and reports that no push is available. A failed upload retains the local commit; retrying Push uploads it without creating another unchanged commit. Controls are disabled during explicit operations. Background polls retain the last known control state to avoid flicker; actions wait for pending state reads. A failed state read disables actions that need repository state.

Description starts with the editable default **Raw Creativity**. Creating a commit through Push requires at least four characters after trimming surrounding whitespace; the button updates as you type, and the handler checks the same rule before sending a request. Uploading existing commits without pending files does not require another description. After a commit is created, Description returns to **Raw Creativity** and the preview refreshes, even if the following upload fails. A failed commit or a no-change result keeps the description. Stop remains available while the background companion process is running, including between operations; it disables after a stop, process exit, or failed startup.

While the companion is running, a recursive folder watcher detects saved Sets, changed media, and added or removed files. It waits 750ms after the last event before refreshing projects and the selected file preview, and queues scans behind active operations. Git internals, generated `.abletongit` reports, Backup folders and `.asd` caches do not trigger scans. Stop closes the watcher. Five-second polling remains a fallback if the filesystem watcher is unavailable or misses an event. Automatic scans never create commits or push.

**Git status**, beside the file count, opens a visible Windows PowerShell window in the configured library folder, runs `git status`, and keeps the window open. It reports the entire repository's status regardless of the selected project scope. The folder is supplied as the process working directory rather than inserted into a shell command. The companion does not need to be running to use this button; a valid folder is required.

To upgrade an existing device: click Stop, replace the package's JS files and `companion/` folder, and replace the device's main patch objects with those from the updated `Ableton Git.maxpat`, using the install steps above. Set Device Width to `930` and save the `.amxd` again. This update adds new patch objects and wires; replacing JS alone does not add the list or independent button controls. The file panel is inside the original 930px device width. Long paths can be read with its horizontal scrollbar, and manual Refresh projects repaints the list.

Snapshot status stays on its own line. Warnings appear as a short count, and each complete warning is posted to the Max Console. Long error messages are shortened in the UI and preserved in full in the console. Updating `device.js` and `client.js` fixes overflow in existing devices too; the newer patch also separates the scope reminder from the warning count.

Library folder accepts forward slashes, Windows backslashes or mixed separators, including paths pasted with surrounding quotes. Spaces, Unicode and UNC shares are preserved. The path field outputs one literal symbol so Max does not interpret backslashes or split the path into messages; the client normalises separators before launching the companion. See the [textedit reference](https://docs.cycling74.com/reference/textedit/) for its single-symbol output mode.

1. Enter the full **parent library folder** path, then click **Start companion**. Before showing Ready, the companion checks that `git --version` and `git lfs version` succeed in its process environment. Initialise, Snapshot and Push remain disabled until both checks pass, and are disabled again when the companion stops. Missing tools show installation/PATH guidance; after installing tools or changing PATH, restart Live and the companion. **Refresh projects** also checks tools again. Use one device/companion instance per library. The device launches a hidden companion process and obtains its fresh token in memory; it never saves the token in the Set or prints it to the Max console. Port `17831` must be free.
2. Click **Initialise library** once for a new library. This creates the parent Git repository if needed, installs local LFS rules and generates reports. Existing nested project repositories are refused; migration remains a separate task.
3. Select the intended project in the project dropdown. **Current project means this explicit selection**, not automatic detection of Live's open Set. It includes every saved Set and eligible local audio in that project.
4. Save in Live; use Collect All and Save when needed. Review the files, enter a description and click **Push** to commit then upload. Scope defaults to **All projects** when the device loads, and startup scans that scope before reporting that the file preview is up to date. To commit one project, select **Current project** and choose its project. The warning updates to make the scope visible.
5. Push uploads the shared repository's committed history across all projects, regardless of commit scope. If uploading fails, the local Snapshot remains saved and Push can retry the upload.

Refresh projects after adding/removing project folders. Stop the companion before changing the library folder. Stop and mutation controls ignore clicks while an operation runs. A connection failure can leave a server operation completing: check history/status with Git before retrying. If the device's Node process ends while idle, it stops its companion; during an active operation it leaves the companion alive so it can finish. If port `17831` remains occupied after a device restart, finish/check any active operation, then close the old companion before starting another.

No automatic Save, Collect All, open-Set detection, restore, remote setup or Git identity editing is implemented. Advanced setup remains in Git/VS Code/GitHub Desktop.

## API scope and committed baselines

`GET /api/projects` returns `{ all, projects: [{ path, name }] }`; library project paths are repository-relative identifiers. `POST /api/init` initialises the configured root. The host root and mode are fixed at companion startup and cannot be overridden by HTTP requests.

`GET /api/ui-state` returns `{ initialized, canInitialize, canPush, repository }` without parsing all Sets. `GET /api/preview?scope=all` or `GET /api/preview?scope=project&project=<encoded project path>` returns `{ files: [{ state, path, originalPath }], count }`. Both endpoints require the local token. Preview uses the same scope/file selection and generated-report plan as Snapshot, comparing proposed report content against Git without writing it. Project parsing and report rendering retain bounded parallel workers. Use Refresh after adding or removing project folders.

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
