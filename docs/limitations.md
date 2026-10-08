# Status and limitations

This is an early project. The ALS reader handles an undocumented format and is tested with synthetic Live 11/12-shaped fixtures; broad real-project compatibility is still being validated. Native Max rendering, visibility detection and macOS operation need further hands-on validation.

Reports cover track names/types/order, tempo, scenes, session and arrangement clip names/positions/lengths, devices and nested rack/chain context, plus best-effort macros, routing and media references. They do not compare MIDI notes, automation, complete effect parameters, warp markers or opaque plugin state. Original ALS files remain in Git history.

Repository creation on GitHub and restoring project versions are manual. The companion uses Git's existing credentials and does not fetch automatically; ahead/behind counts use the last known remote state. Git LFS storage and transfer are governed by your hosting provider.

Staged changes, conflicts, detached HEAD and merge/rebase operations block snapshots. Failures after preparation can leave files staged for review; the companion does not discard them. Avoid another Git writer during an operation. Repository initialisation ignores Windows desktop.ini metadata at every depth, preserving existing ignore rules.

Project analysis uses up to four parallel workers. Git writes remain serial to protect the shared repository. The companion reads saved Sets and never rewrites them.

See the [ALS format notes](als-format.md) for extraction details, the [architecture](architecture.md) for implementation boundaries, and [Git LFS](git-lfs.md) for media storage.
