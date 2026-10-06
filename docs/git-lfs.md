# Git LFS and project media

Default audio rules are `.wav`, `.aif`, `.aiff` and `.flac`, with case-insensitive character-class variants for uppercase/mixed-case extensions. Init appends missing rules, preserving existing files and rejecting conflicting rules for the same default pattern. Nested attributes or later overrides can still win; Snapshot checks effective attributes for every inventoried audio file.

```gitattributes
*.wav filter=lfs diff=lfs merge=lfs -text
*.aif filter=lfs diff=lfs merge=lfs -text
*.aiff filter=lfs diff=lfs merge=lfs -text
*.flac filter=lfs diff=lfs merge=lfs -text
```

`git lfs install --local` sets project-local filters and installs/verifies hooks. Existing custom hooks may cause Git LFS to refuse installation; review them in Git instead of overwriting them. Snapshot verifies newly prepared audio has a small LFS pointer in the index, not a raw audio blob. LFS availability is mandatory for Init/Snapshot; read-only analysis itself does not require Git or LFS.

Git LFS stores pointers in commits and audio objects separately. It is not an automatic migration of earlier raw audio history, compression service, or deletion of old audio versions. Remote LFS limits/billing and credentials are handled by your hosting service and Git tools. Clone/download media using ordinary Git LFS workflows.

Only project-local files are enumerated; external libraries, junctions and symbolic links are never traversed. Use Live's **File → Collect All and Save** before a portable Snapshot. References are best effort and opaque plugin state may hide dependencies. Copyrighted stems and unreleased music can be present even when metadata looks innocuous: use an existing private remote appropriate for your rights and collaborators. The companion never creates or automatically publishes a repository.

The first milestone adds no history migration or destructive cleanup commands. If a previously tracked raw audio file needs conversion, use Git LFS tools separately and review history implications before rewriting anything.
