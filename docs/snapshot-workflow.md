# Snapshot workflow

1. Save in Live; Collect All and Save when portability matters.
2. Discover project root and select a Set. Require explicit ALS selection if several Sets exist.
3. Verify project-root repository, Git, Git LFS and local filters. Reject existing prepared files, conflicts, detached state and merge/rebase work.
4. Acquire the companion project lock. Read gzip/XML and generate deterministic semantic metadata.
5. Load the last committed metadata revision from first-parent project history; compare the current structured model. A repository without metadata gets an initial inventory diff.
6. Read Git working changes and audio inventory. Verify effective audio LFS rules. Print the musical diff and eligible file count before preparing files.
7. Prepare only ALS, WAV/AIF/AIFF/FLAC, Ableton Project Info, six semantic files, `.gitattributes` and `.gitignore`. Exclude Backup and unrelated project-root documents; honor Git ignores. Detect concurrent ALS changes by checksum.
8. Verify changed audio is represented by LFS pointers in the index. If there are no prepared changes, return `created: false` without a commit.
9. Commit the description as the subject, with up to 20 concise generated detail lines in the body. Return the hash and tracking status.
10. Push only when explicitly requested by `push` or `snapshot --push`. A configured tracking branch is required; no automatic repository creation, fetch, or upstream selection.

History lists up to 50 first-parent Git commits as Snapshots, including commits made with other Git tools. There is no separate Snapshot database. The semantic baseline is the newest first-parent revision that changed `.abletongit/project.json`; intervening commits that leave metadata unchanged do not erase the baseline. Ahead/behind uses locally cached remote tracking refs, not an online query.

## Failure and recovery

Analysis failure stops before preparing files. Commit failure or cancellation after preparation may leave eligible files staged; original ALS and audio remain on disk. Check `abletongit status --verbose`, then review and commit/unstage using Git tools before retrying. The companion refuses an already populated index and will not reset it automatically.

If cancellation happens while commit/push is finishing, the operation may already have completed. Check History and Status before retrying. A failed Push does not remove a successful local Snapshot; its structured result contains `created`, `hash`, `pushed` and `pushError`.

Init is idempotent and reports the operations performed. A failure may leave a repository or local LFS configuration installed; fix the stated issue and rerun Init. No remote, author identity or global Git configuration is changed.

Restore, checkout, reset, merge and automatic backups are not exposed in the first milestone. Future Restore must create a backup/current Snapshot and account for both ALS and project media.
