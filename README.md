# Ableton Git Companion

A Windows-first .NET 10 companion that turns saved Ableton projects into **Snapshots**: musical descriptions, semantic JSON/Markdown history, original ALS files, and project-local audio stored using Git LFS.

The CLI is the first product. A loopback HTTP API uses the same services. Ableton remains authoritative: this application reads Sets and never rewrites them. It does not create GitHub repositories, publish automatically, restore projects, or implement a Max for Live device.

## Requirements and build

Windows 11, the .NET 10 SDK, [Git for Windows](https://gitforwindows.org/) and [Git LFS](https://git-lfs.com/). Configure your Git author name/email using your existing Git tools. GitHub and Ableton Live are not needed to build or test.

```powershell
dotnet restore AbletonGit.sln --configfile NuGet.Config
dotnet build AbletonGit.sln --no-restore
dotnet run --project tests/AbletonGit.Tests --no-build --no-restore
```

The test project is a dependency-free executable suite, **not** a `dotnet test` project. Its exit code is nonzero on failure. It creates synthetic gzip XML and temporary Git/LFS repositories, including a local bare remote; no commercial fixtures or network services are required. The solution uses only the .NET and ASP.NET shared frameworks, with no NuGet packages.

## Install the command

```powershell
dotnet pack src/AbletonGit.Cli -c Release --no-restore -o artifacts/packages
dotnet tool install --global AbletonGit.Cli --add-source ./artifacts/packages
abletongit --help
```

Alternatively run the compiled command directly:

```powershell
dotnet src/AbletonGit.Cli/bin/Debug/net10.0/abletongit.dll doctor --path "D:\Music\Dub Project\Dub.als"
```

## Make a Snapshot

Save your Set in Live. For portability, use **File → Collect All and Save** so the project's samples live inside its folder.

```powershell
abletongit doctor --path "D:\Music\Dub Project\Dub.als"
abletongit init --path "D:\Music\Dub Project\Dub.als"
abletongit analyse --path "D:\Music\Dub Project\Dub.als"
abletongit diff --path "D:\Music\Dub Project\Dub.als"
abletongit snapshot "Initial warped stems" --path "D:\Music\Dub Project\Dub.als"
abletongit status --path "D:\Music\Dub Project\Dub.als"
abletongit history --path "D:\Music\Dub Project\Dub.als"
```

Inside a project with one Set, omit `--path`. You may supply a project directory, a nested directory, or a Set file. When several Sets exist, choose an ALS explicitly. Each analysis covers the selected Set; Snapshots include all eligible project Sets and local audio. In single-project mode, Snapshots require a repository rooted at the Ableton Project itself, to avoid including unrelated parent-repository work.

Use `--json` for structured output and `--verbose` for diagnostics. `diff` analyses the saved Set in memory and compares it with the last committed `.abletongit/project.json`; running `analyse` repeatedly does not erase that baseline. The generated reports have no timestamps or absolute project paths.

## Push

To track **all projects in one parent-folder repository**, use `--all` on any command. Every Set gets separate semantic metadata; analysis and report generation run in parallel with up to four workers, while Git writes remain serial. See [project library workflow](docs/project-library.md) for commands, layout and migration constraints.

Link an **existing private repository** and configure its tracking branch with your normal Git tools. Local operations work without a remote. The companion uses Git's existing credential mechanism, stores no GitHub credentials, and performs no fetch automatically; ahead/behind counts use the last known remote state.

```powershell
abletongit push --path "D:\Music\Dub Project\Dub.als"
abletongit snapshot "Added dub bass variation" --push --path "D:\Music\Dub Project\Dub.als"
```

If Push fails after a Snapshot, the result includes its saved hash and the push error. A local Snapshot remains available.

## Local API

```powershell
dotnet run --project src/AbletonGit.Api --no-launch-profile -- --path "D:\Music\Dub Project\Dub.als"
```

Listens only at `http://127.0.0.1:17831` (`--port` can change the port). Startup prints an ephemeral token: send it as `X-AbletonGit-Token` on every request. The fixed project path comes from startup, never a request. Browser Origin/fetch headers and nonnumeric loopback Hosts are rejected.

| Method | Route | Result / body |
| --- | --- | --- |
| GET | `/api/status` | Structured status |
| GET | `/api/project` | Fresh read-only semantic model |
| GET | `/api/projects` | Project choices and whether library scope is available |
| GET | `/api/history` | Recent Snapshots |
| GET | `/api/diff` | Structured changes |
| POST | `/api/analyse` | Generated model and updated file names |
| POST | `/api/init` | Initialise configured repository and LFS |
| POST | `/api/snapshot` | `{ "message": "Added dub bass variation", "push": false }` |
| POST | `/api/push` | Push configured tracking branch |

Snapshot also accepts `scope: "project"` with a project identifier from `/api/projects`, or `scope: "all"` in library mode. Omitting scope preserves existing behavior. No arbitrary Git commands are exposed. Unknown Snapshot fields are rejected. See [architecture](docs/architecture.md).

## Max for Live

The [M4L UI and installation guide](docs/max-for-live.md) provides a **Snapshot** button with **Current project / All projects** scope, an explicit project dropdown and separate **Push**. The device starts the companion and initialises the library without PowerShell. Project Snapshots in a shared repository preserve pending sibling changes and their committed semantic baselines. Processing remains parallel, with up to four workers; Git writes are serial.

Build the source package and Windows companion with `node max-for-live/package.js`, then use Max to save the supplied patch as an `.amxd` following the guide. The patch/client are implemented and tested locally; the device has not yet been loaded or verified inside Live. Current project uses your explicit dropdown selection, without automatic open-Set detection.

## Current scope

Supported extraction includes track names/types/order, tempo, scenes, session and arrangement clip names/positions/lengths, return/master devices, nested rack/chain context, best-effort macros and routing, and FileRef dependency warnings. Unknown XML/device types remain readable. IDs are retained where present, with scoped comparisons and positional fallbacks where absent.

This is an initial reader of an undocumented format, verified with synthetic Live 11/12-shaped fixtures. It has not yet been validated against a broad archive of real Sets. It does not compare MIDI note content, automation, full effect parameter state, warp markers or opaque plugin state. External media detection is best effort. No live unsaved-state detection or automatic Save is implemented.

Prepared Git files, conflicts, detached state and ongoing merge/rebase operations block Snapshots. Failures or cancellation after preparation can leave files staged for review in Git; the companion does not discard them. Do not run another Git writer during a Snapshot.

Read [prior art](docs/prior-art.md), [ALS/schema notes](docs/als-format.md), [LFS](docs/git-lfs.md), [Snapshot workflow](docs/snapshot-workflow.md) and [testing](docs/testing.md).
