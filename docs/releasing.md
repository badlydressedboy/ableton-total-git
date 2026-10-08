# Windows releases

Windows x64 is the only release target for now. The Intel and Apple Silicon Mac entries in `.github/workflows/build.yml` are commented out; re-enable them only after native Live/Max validation. Contributions toward platform support and new features are welcome.

Before a release, update the version in `Directory.Build.props` and add `docs/releases/vMAJOR.MINOR.PATCH.md` describing the user-facing changes, installation and known limitations. Run the build and tests in [building.md](building.md), then build `node max-for-live/package.js --runtime win-x64`. Test the actual device in Live where possible, and record any checks that remain outstanding in the release notes.

Commit the release changes, then create an annotated `vMAJOR.MINOR.PATCH` tag on that commit and push the commit and tag. The tag must match the shared version. GitHub Actions runs the .NET and Max client tests, builds the self-contained Windows ZIP, generates its SHA-256 checksum and publishes both to a GitHub Release only after those checks pass. Only the publishing job has write access to repository contents.

The README links to the latest published Windows asset, so people can download it without finding a workflow artifact. Check the release page and both assets after publishing. Do not replace or force-move an existing release tag; use a new version for fixes.
