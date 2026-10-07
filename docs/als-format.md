# ALS reader and project.json schema

ALS files normally contain gzip-compressed XML. The reader opens them with `FileAccess.Read`, requires gzip magic, uses a decompression stream and an async XML reader, prohibits DTDs/external resolution and caps decompressed XML at 256 Mi characters. No write, reserialize or patch operation exists for ALS. Invalid gzip/XML and missing `Ableton/LiveSet/Tracks` produce explicit friendly errors. Plain uncompressed XML disguised as ALS is rejected.

The prior-art investigation is recorded in [prior-art.md](prior-art.md). This file documents the implemented subset, not an authoritative Ableton specification.

## Source shapes

Track elements are direct children of `LiveSet/Tracks`; direct `MasterTrack` and `MainTrack` are also supported. Names prefer direct `Name/EffectiveName`, `Name/UserName`, `Name/@Value` and `UserName`. Tempo is read from the main/master `Tempo/Manual`. Unknown `*Track` elements are retained by type.

AudioClip/MidiClip descendants are read once in XML order. A surrounding ClipSlot with a ClipSlotList/ClipSlots parent determines Session location and zero-based scene position; other clips are Arrangement. Position uses `Time`, then CurrentStart. Length uses CurrentEnd minus CurrentStart, falling back to LoopEnd minus LoopStart, in beats; unavailable numbers are null rather than invented. Names are read from the clip itself.

Each child of a `Devices` container is a device, including unknown device tags. Nested device/branch ancestry supplies rack and chain context. Device display names prefer UserName/plugin name, then a small built-in display-name map. Categories are best effort; unknown devices are labelled Unknown. MacroControls.* nodes expose available names/manual values and target identifiers without pretending to decode all version-specific mappings. Track DeviceChain routing reads direct *Routing nodes, Target and display strings. Scenes preserve source order.

FileRef is inspected throughout the Set, including instruments. RelativePath and RelativePathElement/Dir plus Name are recognised, with Path as a fallback. Local file paths become project-relative forward-slash paths. External references expose a name and state, never an absolute library path. States are `local`, `external`, `missing` or `unresolved`. Opaque plugin sample references cannot be resolved reliably. An unresolved reference is a warning, not proof that a Set is portable.

## JSON schema version 1

UTF-8 without BOM, camelCase property names, LF newlines, stable source ordering, no generation timestamp or machine-specific project root.

| Property | Fields / meaning |
| --- | --- |
| `schemaVersion` | Integer `1`; incompatible versions are rejected during historical comparison |
| `project` | `name` (folder name), `sets` (sorted relative paths outside Backup), `media` (sorted local WAV/AIF/AIFF/FLAC paths) |
| `liveSet` | `path`, `creator`, `majorVersion`, `minorVersion`, `tempo` (number or null) |
| `tracks[]` | `id` (Ableton string or null), `order` (zero-based), `name`, `type` (original XML tag), `groupId` (string or null) |
| `scenes[]` | `id`, `order`, `name` |
| `clips[]` | `id`, `trackOrder`, per-track `order`, `name`, `type`, `location` (Session/Arrangement), `sceneOrder`, `position`, `length`, `loopStart`, `loopEnd`, `sample` |
| `devices[]` | `id`, `trackOrder`, per-track `order`, `name`, `type`, `category`, `chain` (human-readable ancestry), `chainId` (scoped chain ancestry), `parentId` (rack ID or null), `macros[]` |
| `macros[]` | `name`, `value` (raw string or null), `targets` (available target identifiers) |
| `routing[]` | `trackOrder`, `kind` (original routing tag), `target` (Ableton identifier), `display` (friendly route text or null) |
| `dependencies[]` | Distinct `name`/`state` pairs sorted ordinally |
| `warnings[]` | Deterministic limitations/dependency messages |

`trackOrder` and `sceneOrder` are references within this particular model, not persistent Ableton IDs. No random identity is invented. Source ID scope can vary: comparisons scope clips by track/type/location and devices by track/parent/chain. Missing IDs use positional fallback. Duplicate IDs are matched in queues, preserving entities instead of silently dropping them. Fallback matches can misidentify renamed/reordered ID-less entities; validation against more real Sets is needed.

`ProjectDiff.changes[]` contains `kind` (added/removed/changed), `category`, `context`, `description`, `before`, `after`. Track, scene, clip and device field changes expose musical values; routing includes the old/new destination. Media additions/removals come from inventories; changed tracked audio comes from Git status. No audio content hashes or generation timestamps are stored in semantic JSON.

Markdown reports are views of this model: tracks list clips and devices, clips include session/arrangement positions, scenes list their clips, devices include chain/macro context, and routing shows destinations. Markdown formatting characters in names are escaped. JSON is the comparison contract, not the generated Markdown.

## Known limits

No note-by-note MIDI, automation, all device parameters, warp-marker, plugin-state or musical content diff. Single-project mode analyses the selected Set; --all library mode analyses every discovered Set separately. XML uses local element names for namespace tolerance. Unknown fields are ignored, so a newer format may lose optional details; major required-structure failures are never hidden. Test fixtures are synthetic, not a claim of complete compatibility with every Live release.
