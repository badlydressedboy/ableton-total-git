# Max for Live UI

The implemented source patch is `max-for-live/Ableton Total Git.maxpat`. It uses Node for Max as a thin loopback API client. It starts the Windows or macOS companion directly, using arguments rather than a shell; the companion owns Git, LFS, parsing and repository locks. No PowerShell is needed for routine device operations.

```text
ABLETON TOTAL GIT                    Save in Live before Snapshot
Library folder [D:\Music\Ableton Projects] [Start companion] [Initialise library]
Commit Comment [Raw Creativity]                            [Push]
Select the project you want to Snapshot. Save in Live first.
Snapshot saved: a123456789ab
```

## Package and install

Prerequisites: Windows or macOS, Ableton Live with Max for Live / Node for Max, Git and Git LFS. Runtime-specific packages include .NET; only the default development package requires the .NET 10 **ASP.NET Core Runtime** (or SDK). Configure your Git author and, for Push, the library's remote/tracking branch and authentication through your existing Git tools.

Choose `artifacts/max-for-live-win-x64.zip` for Windows, `artifacts/max-for-live-osx-arm64.zip` for Apple Silicon, or `artifacts/max-for-live-osx-x64.zip` for Intel Macs. Extract the complete archive into a permanent writable folder. The development source package is `artifacts/max-for-live/`. To rebuild it from this repository after restoring the solution, run `node max-for-live/package.js` with Node installed. The device itself uses Max's bundled Node; it has no npm dependencies.

Build a self-contained package with `node max-for-live/package.js --runtime win-x64`, `--runtime osx-arm64` or `--runtime osx-x64`. These builds download official .NET runtime packs from NuGet. ZIP packages preserve the macOS executable permission. Use `--output artifacts/my-package` to build separately from a running companion. CI builds and tests on Windows, Intel macOS and Apple Silicon macOS.

On macOS, install Git and Git LFS using your existing Git installer or Homebrew (`brew install git git-lfs`). Live launched from Finder also searches `/opt/homebrew/bin` and `/usr/local/bin`. Settings are saved under `~/Library/Application Support/AbletonGit/max-for-live.json`; Windows retains `%LOCALAPPDATA%\AbletonGit\max-for-live.json`. macOS packages use the SDK's ad hoc signature and are not Developer ID signed or notarized; native Live/Max operation and macOS security prompts still need validation on a Mac. The Git status button can request permission to control Terminal; allow that request in macOS Automation settings if you want to use it.

The packages include **Ableton Total Git.amxd**. Keep it beside `device.js`, `client.js`, `preferences.js`, `platform.js`, `visibility.js`, `file-list.js` and `companion/`, then drag the device into Live. It opens in Presentation mode with Device Width 930. Keep it unfrozen so it can find the external companion. Re-add the device after replacing package files; an instance already loaded in a Set keeps its previous embedded patch.

To install into your User Library, copy the complete package into `Presets/Audio Effects/Max Audio Effect/Imported` (or a dedicated subfolder there). Updating only JavaScript does not replace the controls embedded in an older `.amxd`.

For source editing, open `Ableton Total Git.maxpat` in Max. `node max-for-live/build-device.js` creates the saved device from an unfrozen Audio Effect container saved by Max, retaining its container chunks and project metadata. The generated container is structurally checked; native rendering still needs verification by reloading it in Live.

## Everyday use

The redundant whole-library reminder is removed. Every control has a titled Info View annotation describing its purpose and disabled conditions. Pop-up tooltips are omitted so the text is shown only in Info View. Show Live's Info View and hover over the control, including disabled buttons. The same help is also stored on the text-field labels. Help uses Max's [annotation attributes](https://docs.cycling74.com/reference/textbutton/). Analysis warnings remain on their own line beneath the status.

The file list uses a custom read-only `jsui` renderer with white paths and muted status text on charcoal. Six-pixel rounded scrollbar thumbs use grey at rest and a soft teal highlight on hover or drag. Scrollbars appear only when the actual text or rows overflow, so empty lists have no bars. Drag a thumb, click its track or drag the list contents to scroll both axes. Mouse-wheel scrolling is not provided by the legacy `jsui` callbacks. The renderer keeps the client's existing file-list message protocol; unchanged previews preserve the scroll position.

The Node script starts from the device-ready output of `live.thisdevice`, after Live has completely initialized the device. A one-shot gate prevents preset changes from launching it a second time; `deferlow` sends the start in the low-priority queue. The library folder is remembered after starting with a valid folder. It is saved in `%LOCALAPPDATA%\AbletonGit\max-for-live.json` and restored into the path field when the device's Node script reloads. If a saved folder is present, the companion starts automatically and checks Git/Git LFS. This preference survives package upgrades and Live restarts; it stores only the folder path. Applying a valid folder with Enter or Tab starts the companion immediately and updates the saved preference. If settings cannot be read or saved, the Max Console reports the problem and manual path input remains available. Automatic field restoration requires the updated patch's `libraryrestore` wire. Close previous companion instances before reopening the patch so the new instance can use the local API port.

The changed-file panel is on the right of the controls, 365 pixels wide and 140 pixels tall, with the file count immediately above it. All visible objects fit within the 930-pixel device width and 169-pixel Live device height. Scroll vertically for more files and horizontally for long paths. The count covers the whole library, including generated reports and deletions. The list is read-only and refreshes after operations, manual Refresh, saved-file events and background polling. Unchanged refreshes preserve its scroll position. Preview never writes reports, stages files, commits or fetches from the remote.

**Initialise library** is enabled only when setup is needed at the repository root. **Start companion** is disabled while it is running. The single **Push** button commits eligible changes in the whole library first, then uploads the repository's committed history if a remote/tracking branch is available. It enables for pending files with a valid description, or existing commits ready to upload. With no remote, it saves the commit locally and reports that no push is available. A failed upload retains the local commit; retrying Push uploads it without creating another unchanged commit. Controls are disabled during explicit operations. Background polls retain the last known control state to avoid flicker; actions wait for pending state reads. A failed state read disables actions that need repository state.

Commit Comment starts with the editable default **Raw Creativity**. Clicking that exact default selects all of it for replacement or deletion; custom comments keep normal cursor placement. The folder and comment fields use single-line text with five-pixel insets to center the text vertically. Creating a commit through Push requires at least four characters after trimming surrounding whitespace; the button updates as you type, and the handler checks the same rule before sending a request. Uploading existing commits without pending files does not require another description. After a commit is created, Commit Comment returns to **Raw Creativity** and the preview refreshes, even if the following upload fails. A failed commit or a no-change result keeps the description.

While the device UI is visible, a recursive folder watcher detects saved Sets, changed media, and added or removed files. It waits 750ms after the last event before refreshing the library file preview, and queues scans behind active operations. Git internals, generated `.abletongit` reports, Backup folders and `.asd` caches do not trigger scans. The watcher closes while the device is hidden. Five-second preview polling also pauses, including the initial file scan if the device loads hidden. The companion stays running and still checks Git/Git LFS on startup. A transparent full-width `jsui` strip reports drawing through a 500ms Task; drawing stops when the device is hidden, and its next drawing heartbeat resumes scanning. This follows UI drawing rather than device power or keyboard focus. Showing the device reopens the watcher and immediately refreshes projects and changed files, so edits made while hidden are included. A scan or explicit operation already underway can finish, but no further preview scans start while hidden. Native visibility behavior still needs checking in Live, including track changes, collapsed devices, hidden Device View and horizontal scrolling. Automatic scans never create commits or push.

**Git status**, beside the file count, opens a visible PowerShell window on Windows or Terminal window on macOS in the configured library folder, runs `git status`, and keeps the window open. It reports the entire repository's status regardless of the selected project scope. On Windows the folder is supplied as the process working directory. On macOS it is quoted as a literal shell argument and passed to a fixed AppleScript as data. The companion does not need to be running to use this button; a valid folder is required.

To upgrade an existing device: remove the old instance from Live, replace **Ableton Total Git.amxd** and its accompanying package files in your device folder, then re-add the device. The updated saved device contains the latest controls and right-hand file list; no copying patch objects or Inspector changes are required.

Snapshot status stays on its own line. Warnings appear as a short count, and each complete warning is posted to the Max Console. Long error messages are shortened in the UI and preserved in full in the console. Updating `device.js` and `client.js` fixes overflow in existing devices too; the newer patch also separates the scope reminder from the warning count.

Library folder accepts forward slashes, Windows backslashes or mixed separators on Windows, including paths pasted with surrounding quotes. macOS preserves native POSIX paths (including literal backslashes) and expands `~/` to your home folder. Spaces, Unicode and UNC shares are preserved. The path field outputs one literal symbol so Max does not interpret backslashes or split the path into messages; the client normalises separators before launching the companion. See the [textedit reference](https://docs.cycling74.com/reference/textedit/) for its single-symbol output mode.

1. Enter the full **parent library folder** path and press Enter or Tab. The companion starts automatically; **Start companion** provides a manual retry. Before showing Ready, the companion checks that `git --version` and `git lfs version` succeed in its process environment. Initialise, Snapshot and Push remain disabled until both checks pass, and are disabled again when the companion stops. Missing tools show installation/PATH guidance; after installing tools or changing PATH, restart Live and the companion. **Refresh library** also checks tools again. Use one device/companion instance per library. The device launches a hidden companion process and obtains its fresh token in memory; it never saves the token in the Set or prints it to the Max console. Port `17831` must be free.
2. Click **Initialise library** once for a new library. Default ignore rules exclude Windows `desktop.ini` files at every depth, regardless of capitalization. This creates the parent Git repository if needed, installs local LFS rules and generates reports. Existing nested project repositories are refused; migration remains a separate task.
3. The device always operates across the complete library. There are no project or scope selectors. Eligible saved Sets and local media in all projects are included; project processing remains parallel.
4. Save in Live; use Collect All and Save when needed. Review the files, enter a description and click **Push** to commit then upload. The preview and commit always cover the whole library, and startup scans it when the device is visible before reporting that the file preview is up to date.
5. Push uploads the shared repository's committed history across all projects, regardless of commit scope. If uploading fails, the local Snapshot remains saved and Push can retry the upload.

Refresh library after adding/removing project folders. An unexpected companion process exit triggers an automatic restart on the five-second background timer. Failed startup attempts retry after 30 seconds; Start companion can retry sooner. There is no Stop button: the companion stays running until the device's Node process closes, normally when the device is removed or Live exits. To change folders, enter the new full path and press Enter or Tab. A valid change automatically closes the old companion, waits for its process to exit, starts the new library companion and refreshes the preview. Invalid entries keep the existing companion running. Folder changes received during an operation wait for it to finish. Closing only the Max editor does not stop a device still loaded in Live. A connection failure can leave a server operation completing: check history/status with Git before retrying.

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

Run `node --test max-for-live/client.test.js` for scope, duplicate-click, error and real-loopback transport checks. The .NET executable suite covers first scoped Snapshot, sibling baseline/report preservation, deletions, unreadable siblings, invalid scope and HTTP routing in real temporary Git/LFS repositories. A hands-on Live check is still required: load the saved device, verify automatic startup and whole-library file preview, check unchanged audio routing, and test Push against a configured remote.
