# Future Max for Live device

The future device is a thin local API client. It does not run Git, parse ALS, manage LFS, store GitHub credentials or modify ALS.

```text
PROJECT GIT
Status: 7 changed files · 3 new samples
Snapshot: [ Added dub bass variation             ]
[ SNAPSHOT ]  [ SNAPSHOT + PUSH ]  [ PUSH ]
Branch: main
Last Snapshot: Cleaned vocal loops
```

Configure the companion project/Set at startup, then provide the ephemeral API client token to the device. It sends requests directly to `127.0.0.1:17831` with `X-AbletonGit-Token`, displays structured results and friendly errors, and disables duplicate actions while an operation runs. Credentials remain in Git's credential mechanism; the token is only for the local companion and changes each startup.

The UI presents Snapshot, History, Changes and Push. Restore is a future guarded workflow. Advanced Git operations remain in Git/VS Code/GitHub Desktop. Show local Snapshot success separately from Push failure so the user knows their saved version exists.

Before Snapshot, remind the musician to Save and Collect All and Save where needed. No current/open Set or unsaved-state detection is claimed. Live-awareness integration can later supply open-Set identity and save/collect state through a separate adapter, without taking ownership of ALS editing.

No M4L device is implemented in this milestone.
