# R2IJ public evidence preservation

Only Root chooses the final freeze time. Run `capture` after all API, OBS and UI
owners have stopped through their owner protocols and all fixtures have passed
both cleanup checks. This tool does not certify G3/G4 or independently determine
whether a service is stopped. It validates Root's explicit freeze statement and
the hashes of the public evidence referenced by that statement.

No database, service, credential or Git operation is performed. The tool never
reads the private R2IJ state directory, an environment credential file or an old
batch's temporary evidence. Its outputs are exclusively new files/directories;
failed and partial attempts remain in place for review. Retag instead of deleting
or overwriting an earlier attempt.

## Freeze protocol

Create a new public JSON file under `tmp/rust-r2ij/`. The minimal fields are:

```json
{
  "formatVersion": 1,
  "batch": "rust-r2ij",
  "tag": "ROOT-CHOSEN-TAG",
  "ownersStopped": true,
  "fixturesDoubleZero": true,
  "evidence": [
    { "file": "tmp/rust-r2ij/ACTUAL-RECEIPT.json", "sha256": "ACTUAL_64_LOWERCASE_HEX" }
  ]
}
```

Use a lower-case letters/digits/hyphens tag of at most 49 characters. Evidence
must be an actual nonempty list of public receipt files with verified SHA-256.
The sample names and digest are schema examples, not evidence. Root may add
context fields; the complete original freeze statement is retained in the
embedded manifest.

## Capture on Linux

```sh
node tools/rust-r2ij/j-preserve-evidence.mjs capture \
  --tag TAG \
  --freeze tmp/rust-r2ij/FREEZE.json \
  --out tmp/rust-r2ij-preserved/TAG \
  --inputs tools/rust-r2ij/EXTRA-INPUTS.json
```

`--inputs` is optional. Its JSON format is
`{"formatVersion":1,"files":[{"file":"REPO_RELATIVE_FILE","reason":"Why this exact input is required"}]}`.
Each additional item must be an explicit regular file under apps/libs/tools/docs.
Use it for the canonical `libs/shared/api-spec/openapi.json`, relevant generated
client/source files, current migration plan/tracker/operation inventory, formal
G4 archive files and exact reused runtime/helper dependencies as applicable.
It cannot select an older batch's entire temporary evidence tree. The input
declaration itself is also captured and hashed.

Default selection preserves every admitted regular file under public `tmp/rust-r2ij`
(including failed/partial attempts, runtime source/binary capsules and SQL shape
witnesses), all `tools/rust-r2ij`, Cargo/lock/Rust source/tests/examples, original
Nest and shared/API contract sources, package/pnpm lock, and current
`docs/design/rust-r2ij*` formal files/directories. It rejects every symlink,
hard-linked file, special file, private/env path, path escape, Windows device/ADS
path, case/Unicode alias and pre-existing output. Snapshot/archives are outside
the selected public evidence directory, preventing recursive self-inclusion.
The exact `tmp/rust-r2ij/ROOT-CHECKPOINT.md` is excluded as internal execution
continuation scratch, retained in place, and its contents are not read by capture.
This exclusion is explicit in the manifest; actual raw/failed/partial/owner
receipts remain selected. No prefix or broad scratch-file exclusion is used.

The new output directory contains:

- `snapshot/`: immutable copies at their original repository-relative paths.
- `manifest.json`: each original path, byte length, raw SHA-256 and POSIX mode,
  plus selection, freeze statement and its hash.
- `evidence.tar.gz`: one GNU/PAX tar containing `_poms-r2ij_manifest.json` first,
  followed by exactly the sorted manifest file list at original relative paths.
- `receipt.json`: archive/manifest hashes and independent verification results.

Copying checks source identity and bytes. A separate streaming Node parser then
verifies the complete archive, including header checksums/PAX paths/entry types,
every payload hash and the exact listing. A fresh complete source inventory after
tar creation detects modifications, additions and removals; source inode/mtime/
ctime and snapshot bytes are rechecked. No private values are loaded for a secret
scan: the manifest explicitly records this limitation. Root remains responsible
for admission of the public evidence contents.

GNU/PAX compatibility is limited to a regular-file header with an already strict,
portable full PAX path, an all-zero raw 155-byte legacy prefix, and exactly 100
non-NUL legacy name bytes equal to the full path's first 100 UTF-8 bytes, where
the full UTF-8 path is longer than 100 bytes. This predicate is checked before
decoding the legacy name. The cut can produce a Windows device word or an
incomplete UTF-8 character; that field is metadata and never a filesystem path.
Complete directory components up to the last raw slash are also checked with an
ASCII placeholder. Extraction and manifest identity always use only the strict
complete PAX path. Type-x headers, names without PAX, short or mismatched legacy
bytes, nonempty prefix, final paths, links, escapes and duplicate aliases retain
their original strict rejection rules. Diagnostics use raw SHA and replacement
display, bounded to 32 examples while all members are verified.

## One-copy Windows verification

Copy only `evidence.tar.gz` from Linux and retain its receipt SHA-256 separately
as the trusted transfer anchor. Run the same Node tool from the Windows checkout:

```powershell
node tools/rust-r2ij/j-preserve-evidence.mjs verify `
  --archive E:/NEW-LOCATION/evidence.tar.gz `
  --expected-sha256 ACTUAL_ARCHIVE_SHA256 `
  --destination E:/NEW-LOCATION/NEW-VERIFIED-DIRECTORY
```

The entire listing, resolved destination paths, duplicate aliases, embedded
manifest, payload hashes and compressed-file hash pass before the destination is
created. Extraction only creates new files with exclusive creation, rejects
symlink parents, and then independently rescans all extracted bytes/hashes.
Tar modes are checked against the manifest on both platforms. Linux also checks
extracted POSIX modes; Windows reports `extractedPosixModesVerified:false` because
NTFS does not preserve those POSIX mode bits. Omitting `--destination` performs a
read-only archive verification. Keep the tool source hash with the final receipt.

## Controlled tests only

```sh
node tools/rust-r2ij/j-preserve-evidence.mjs self-test
```

This creates only a new controlled tree under
`tmp/rust-r2ij-preserve-selftest/UUID`, outside live public batch evidence. It
tests an empty file, a preserved failed report, long Unicode/PAX paths, executable
mode and a 2 MiB binary spanning stream/block boundaries. The original nineteen negative
checks include actual forged traversal, symlink, duplicate/case-alias, corrupt
payload and PAX-traversal archives, plus pre-existing outputs and linked parents.
Four additional negative archives reject mismatched fallback bytes, nonempty
legacy prefix, missing PAX path and a short unsafe fallback. Three actual GNU tar
positive cases cut exactly at byte 100 on dot, space and slash; the dot case uses
the exact original client filename that exposed the compatibility bug.
Four further negative archives reject missing/mismatched PAX for device-word and
incomplete-UTF-8 fallbacks. Actual GNU tar also tests the exact `contract...` ->
`con` cut and a Chinese character split at byte 100.
The Windows `verify` CLI is also tested against the real Linux-produced archive.

The first Windows test (`windows02`) exposed a CLI option-parser bug accepting no
digits in `--expected-sha256`. Its exact JSON stderr is preserved in a separately
labelled failure receipt; stdout-only Tee-Object created no receipt file. The
parser was corrected; final Linux/Windows `04` tests pass. All self-test receipts
are labelled controlled tests and do not freeze or certify live batch evidence.

The `06` controlled Linux/Windows round passes eight files, all three GNU/PAX
boundary cases and all twenty-three negative checks. The earlier 995951af tool
is retained byte-for-byte as `tmp/rust-r2ij/j-preserve-tool-995951af.mjs`.
Root's failed `final22d` snapshot/tar/manifest and delivery01/02 are untouched;
these controlled tests do not relabel that failed live capture. Root uses a new
tag for the corrected capture.

The `07` controlled Linux/Windows round passes ten files and all twenty-seven
negative checks, retaining every earlier twenty-three check. Tool 22021d86 and
delivery03 are retained, as is the failed `final22e` snapshot/tar/manifest. The
exact final22e header was diagnosed read-only at entry10551 as a byte-exact
100-byte fallback ending in `con`; its full 133-byte PAX path and snapshot bytes
match the manifest. Root chooses a fresh final capture tag after this tool delta.
