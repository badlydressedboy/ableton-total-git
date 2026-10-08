# Contributing to Ableton Total Git

Bug reports, documentation improvements and focused pull requests are welcome.

For bugs, include your operating system, Live/Max version, Git/Git LFS versions,
steps to reproduce, and the relevant error from the Max Console or CLI. Remove
personal paths and credentials. Do not upload private Sets, samples or plugin
presets; reduce parsing issues to a synthetic fixture where possible.

## Development

Install the .NET SDK selected by `global.json`, Node.js 22 or later, Git and Git
LFS. No npm install is needed. Live and Max are only required for native device
validation.

```powershell
dotnet restore AbletonGit.sln --configfile NuGet.Config
dotnet build AbletonGit.sln --no-restore
dotnet run --project tests/AbletonGit.Tests --no-build --no-restore
node max-for-live/package.js
node --test max-for-live/client.test.js max-for-live/platform.test.js max-for-live/file-list.test.js
```

The .NET tests run as an executable, rather than through `dotnet test`. See
[testing](docs/testing.md) for fixture rules and
[architecture](docs/architecture.md) for the service boundaries.

Edit `max-for-live/build-patch.js` to change the generated Max patch, then run
`node max-for-live/build-device.js` and include the regenerated `.maxpat` and
`.amxd`. Keep the saved device beside its JavaScript files and companion.

## Pull requests

Describe the problem, resulting behavior and validation. Add regression coverage
for behavior changes where it can catch real failures. For Max presentation or
Live API changes, report which native Live/Max checks you performed; structural
tests do not verify the UI. Keep Git mutations serial and project analysis
bounded and parallel. Never rewrite users' ALS files or discard their Git work.

Use `local-fixtures/` for private validation files; it is ignored. Use temporary
repositories for integration checks, not a working music library. The CI workflow
builds packages for Windows, Intel Macs and Apple Silicon Macs.

Contributions are distributed under the repository's [MIT licence](LICENSE).
