# Build from source

Run the commands below from the repository root.

Install the .NET SDK selected by [global.json](../global.json), Node.js 22 or later, Git and Git LFS. Live is not required to build or run automated tests. The solution has no third-party NuGet packages, and the Max client has no npm dependencies.

Run from the repository root:

```powershell
dotnet restore AbletonGit.sln --configfile NuGet.Config
dotnet build AbletonGit.sln --no-restore
dotnet run --project tests/AbletonGit.Tests --no-build --no-restore
node max-for-live/package.js
node --test max-for-live/client.test.js max-for-live/platform.test.js max-for-live/file-list.test.js
```

The .NET test suite is an executable, rather than a dotnet test project. It uses synthetic Sets and temporary Git/LFS repositories; no GitHub access or commercial fixtures are required.

Build the Windows release package:

```powershell
node max-for-live/package.js --runtime win-x64
# Experimental contributor builds only; not currently released or run in CI:
# node max-for-live/package.js --runtime osx-arm64
# node max-for-live/package.js --runtime osx-x64
```

Output goes to the corresponding artifacts/max-for-live directory and ZIP. Runtime packaging downloads official .NET runtime packs. The default development package requires the .NET 10 ASP.NET Core Runtime or SDK.

See [testing and private fixtures](testing.md) for additional validation and [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidance.
