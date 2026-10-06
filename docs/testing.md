# Testing and local fixtures

Run `dotnet run --project tests/AbletonGit.Tests --no-build --no-restore` after building the solution. This executable suite requires installed Git/Git LFS for integration cases, but does not require GitHub, Live, M4L or a GPU. Failures return exit code 1. Test identities are configured only inside temporary repositories; no global identity is changed.

Synthetic fixtures are created from C# XML strings and gzip compression at runtime. They cover invalid gzip/XML, DTD rejection, unknown elements, Live 11/12 master shapes, tracks/scenes/clips/devices/racks/macros/routing, discovery, spaces/Unicode, multiple Sets, deterministic reports, semantic additions/removals/changes, LFS pointers, selective preparation, missing tools, commit/analysis failures, cancellation, concurrency, literal command descriptions, local push and API controls. Temporary test repositories are cleaned after each case.

Do not commit commercial Sets, stems, plugin presets or private recordings. For additional real-world validation, place files in ignored `local-fixtures/` or outside this repository. Analyse a disposable copy first:

```powershell
dotnet src/AbletonGit.Cli/bin/Debug/net10.0/abletongit.dll analyse --path "D:\Private Fixtures\Project\Set.als"
```

Compare generated counts, names, clip positions, scenes, chain context and routing against Live. Test both MasterTrack and MainTrack projects, multi-chain racks, multiple session slots, recorded/processed samples, external paths and plugins. Record anonymised findings and reduce any bugs to synthetic fixtures before adding public tests. Keep originals unchanged and do not push private fixtures. Synthetic tests establish workflow correctness, not exhaustive real-format compatibility.
