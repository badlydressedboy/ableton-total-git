# CLI and local API

Run build commands from the repository root. For prerequisites and the primary Max for Live workflow, see the [README](../README.md).

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

To track **all projects in one parent-folder repository**, use `--all` on any command. Every Set gets separate semantic metadata; analysis and report generation run in parallel with up to four workers, while Git writes remain serial. See [project library workflow](project-library.md) for commands, layout and migration constraints.

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
| GET | `/api/tools` | Git/Git LFS availability checks, without project parsing or writes |
| GET | `/api/project` | Fresh read-only semantic model |
| GET | `/api/projects` | Project choices and whether library scope is available |
| GET | `/api/history` | Recent Snapshots |
| GET | `/api/diff` | Structured changes |
| POST | `/api/analyse` | Generated model and updated file names |
| POST | `/api/init` | Initialise repository and LFS; optional `{ "remoteUrl": "https://github.com/owner/repo" }` connects GitHub and prepares first-push tracking |
| POST | `/api/snapshot` | `{ "message": "Added dub bass variation", "push": false }` |
| POST | `/api/push` | Push configured tracking branch |

Snapshot also accepts `scope: "project"` with a project identifier from `/api/projects`, or `scope: "all"` in library mode. Omitting scope preserves existing behavior. No arbitrary Git commands are exposed. Unknown Snapshot fields are rejected. See [architecture](architecture.md).

