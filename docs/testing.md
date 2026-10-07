# Testing and local fixtures

Run `dotnet run --project tests/AbletonGit.Tests --no-build --no-restore` after building the solution. This executable suite requires installed Git/Git LFS for integration cases, but does not require GitHub, Live, M4L or a GPU. Failures return exit code 1. Test identities are configured only inside temporary repositories; no global identity is changed.

Synthetic fixtures are created from C# XML strings and gzip compression at runtime. They cover invalid gzip/XML, DTD rejection, unknown elements, Live 11/12 master shapes, tracks/scenes/clips/devices/racks/macros/routing, discovery, spaces/Unicode, multiple Sets, deterministic reports, semantic additions/removals/changes, LFS pointers, selective preparation, missing tools, commit/analysis failures, cancellation, concurrency, literal command descriptions, local push and API controls. Temporary test repositories are cleaned after each case.

Do not commit commercial Sets, stems, plugin presets or private recordings. For additional real-world validation, place files in ignored `local-fixtures/` or outside this repository. Analyse a disposable copy first:

```powershell
dotnet src/AbletonGit.Cli/bin/Debug/net10.0/abletongit.dll analyse --path "D:\Private Fixtures\Project\Set.als"
```

Compare generated counts, names, clip positions, scenes, chain context and routing against Live. Test both MasterTrack and MainTrack projects, multi-chain racks, multiple session slots, recorded/processed samples, external paths and plugins. Record anonymised findings and reduce any bugs to synthetic fixtures before adding public tests. Keep originals unchanged and do not push private fixtures. Synthetic tests establish workflow correctness, not exhaustive real-format compatibility.

Library tests additionally verify bounded parallel workers, deterministic parallel metadata, duplicate Set names, one shared repository, scoped historical baselines, Set/project deletions, nested-repository rejection, read failures before writes, cancellation, preserved staged work, concurrent Save detection, and CLI/API library mode.

Discovery filters incidental filenames before attribute access, covering cloud-drive listings with disappearing shell/cache files while continuing to fail on disappearing Sets. Path-input tests cover both slash styles, mixed separators, quoted paths, spaces, Unicode and UNC prefixes; the patch's text input is checked for literal single-symbol output.

Tool preflight tests cover successful version commands, missing executables, nonzero Git/LFS versions, cancellation, and authenticated API checks without a repository or readable Set. Client tests verify disabled mutation controls before checks pass, failed checks, recovery, disconnects and the generated patch's control wiring.

Project-scoped Snapshot tests cover a first Snapshot before sibling projects are committed, preserving sibling baselines and pending reports after Analyse, deleting selected Sets, nested project boundaries, unreadable siblings and API scope validation. For the M4L client, run `node max-for-live/package.js` followed by `node --test max-for-live/client.test.js`. These check scope routing, duplicate-click suppression, friendly errors, real loopback requests, patch wiring and a published companion launch/initialise/Snapshot cycle through the device's Node handlers. They do not execute Max's object graph or render the UI; follow the hands-on checklist in [max-for-live.md](max-for-live.md) for Live validation.
