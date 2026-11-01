# Source02 outer-owner diagnostics correction

Source01's single-journey deadlines, original ownership protocol and callbacks
are unchanged. Its104-source snapshot and original manifest remain preserved.

The c01 CLI now catches the actual `runOwnedCommand` failure before the existing
generic final catch. `windows-ui-owner-failure.mjs` retains only the original
name, message, stack, primitive code and own property names. It does not serialize
the unknown error object, its custom fields, environment or children. The fixed
path is the new c01 private root plus
`ui-windows-owner-{backend}-{tag}-{actualRunId}-failure.json`.

All parent components must be actual nonsymlink directories, the private root
must be0700 and resolve to the exact admitted root. The writer creates one
exclusive no-follow0600 file, checks regular/single-link/empty opened state,
writes and syncs on that descriptor, then checks fd/leaf identity, metadata and
unchanged parents. It closes the descriptor on failure. No previous file is
overwritten. Public output contains only the fixed category, reference, byte
count and SHA, or a fixed `retentionFailed:true`; either path exits with failure.

The production writer and CLI callsite tests use a Fake filesystem/process,
including private-mode rejection before open, linked-file rejection before
write, leaf replacement after write and exclusive-existing-file failure. No
actual private path or owner process is accessed. Root still executes future
single-journey runs only after the exact current source review and capsule.
