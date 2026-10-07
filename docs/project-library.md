# One repository for all Ableton projects

Use `--all` with the **parent folder** containing the projects. All commands retain their single-project behaviour when the flag is absent.

```text
Ableton Projects/
  .git/
  .gitattributes
  .gitignore
  .abletongit/
    library.json
    sets/<path-key>/project.json
    sets/<path-key>/tracks.md
    sets/<path-key>/clips.md
    sets/<path-key>/devices.md
    sets/<path-key>/scenes.md
    sets/<path-key>/routing.md
  Dub Project/
    Dub.als
    Performance.als
    Samples/
    Ableton Project Info/
  Ambient Project/
    Ambient.als
    Samples/
    Ableton Project Info/
```

From the companion workspace:

```powershell
$tool = "C:\Git\ableton-total-git\artifacts\cli\abletongit.exe"
$library = "D:\Music\Ableton Projects"
& $tool doctor --all --path $library
& $tool init --all --path $library
& $tool analyse --all --path $library
& $tool diff --all --path $library
& $tool snapshot "Saved changes across my projects" --all --path $library
& $tool status --all --path $library
& $tool history --all --path $library
& $tool push --all --path $library
```

Save all modified Sets in Live first. Collect All and Save still applies to each project. Multiple Sets per project are all analysed automatically in this mode. Identically named Sets in different folders get separate metadata and diffs. The parent folder must be the repository root. Local operations do not need a remote; Push uses the parent's configured tracking branch.

## Parallel operations

Up to **four Sets** are read/analysed concurrently. Set hashing and per-Set report generation also run with bounded parallel workers. Output is collected by sorted relative Set path, so scheduling does not change JSON, reports or diff order. If any Set cannot be read, the operation fails with its path before metadata writes or Git staging. Metadata writes themselves remain individually atomic, not a whole-library transaction; rerun Analyse after a write failure.

Git configuration, staging, committing and pushing are serial: one shared index must not be modified by parallel Git writers. All write operations use one library lock. Read-only status checks use the same root and effective LFS attributes. No project is pushed separately; one Snapshot is one commit covering eligible changes within its chosen scope.

## Catalog and metadata

`library.json` is a deterministic version-1 catalog containing library name and `sets[]`, with each entry's `projectPath`, repository-relative `setPath`, `metadataDirectory`, and complete semantic `model`. It is the committed baseline for whole-library comparison. Per-Set project models retain project-relative media/sample paths; catalog paths provide the repository context.

The metadata directory key is SHA-256 of the repository-relative Set path, encoded as lowercase hex. It is a filesystem namespace, **not an invented Ableton identity**. Moving/renaming a Set therefore appears as removed/added. Deleted Sets are removed from the catalog and their six derived reports are deleted; original music files are never removed by analysis. Empty derived directories may remain.

The library diff labels track/clip/device changes with their Set path. Audio inventories are deduplicated per repository-relative path, so several Sets sharing one project's samples do not repeat audio entries. ALS, supported project-local audio, Ableton Project Info and generated metadata are eligible; unrelated parent-folder audio/documents are excluded. Git ignores still apply. Deletions use the previous committed catalog's project scope, allowing removal of an entire project to be recorded.

## Existing repositories

The companion refuses nested project repositories and leaves them intact. If each project already has its own `.git`, merging them into a parent repository is a separate migration: preserve backups and choose whether to import the histories. Do not simply delete project `.git` folders if their history matters.

Existing single-project metadata can remain in project folders. Library mode adds its own catalog/per-Set reports and does not rewrite those legacy reports. Without `--all`, Snapshot still requires its own project repository; use `--all` for operations on the shared repository. No automatic migration or history rewrite is implemented.

## Local API

Start with `dotnet run --project src/AbletonGit.Api --no-launch-profile -- --all --path "D:\Music\Ableton Projects"`, or use the [Max for Live UI](max-for-live.md). The same routes/token/loopback controls apply. Project, Status and Analyse return library models/results. Snapshot defaults to the entire library; supply `scope: "project"` and a project identifier from `GET /api/projects` for a project-only Snapshot. Mode and root are fixed at startup, never supplied by requests.

Project scope includes all Sets in the selected Ableton Project, with parallel parsing/hashing/report writes. It stages only that project's eligible files/reports plus shared root rules and catalog. The committed catalog preserves sibling baseline models, including when their working reports were regenerated by Analyse. Pending sibling changes remain visible in the next library diff. An unreadable sibling Set does not block a selected-project Snapshot; All projects still requires every Set to be readable. The CLI's `--all` Snapshot continues to use the whole library; project selection is exposed through the API and M4L UI.

Storage is shared across projects, including retained audio versions. Parallel work does not multiply unchanged LFS objects, and one repository does not increase GitHub's account allowance.
