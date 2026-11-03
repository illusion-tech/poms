// Pure negative/precedence definitions for Root's actual adapter; no runner.
const hashObject = '44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a';
const hashArray = '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945';
const old = { file: 'historical/input.json', bytes: 2, rawBytesSha256: hashObject };
const moved = { file: 'docs/design/archive/slices/e1-lab/moved.json', bytes: 2, rawBytesSha256: hashObject };
const snapshot = { file: 'docs/design/archive/slices/e1-lab/snapshot.json', bytes: 2, rawBytesSha256: hashObject };

export const e1IndexCases = [
    { name: 'mapped-source-destination', map: { records: [{ source: old, destination: moved }] }, input: old, expectedCanonical: moved, expectedKind: 'move' },
    { name: 'mapped-original-archive-schema', map: { records: [{ originalPath: old.file, archivePath: moved.file, bytes: old.bytes, rawBytesSha256: old.rawBytesSha256 }] }, input: old, expectedCanonical: moved, expectedKind: 'move' },
    { name: 'exact-snapshot-before-move', map: { records: [{ source: old, destination: moved }], immutableInputSnapshots: [{ original: old, snapshot }] }, input: old, expectedCanonical: snapshot, expectedKind: 'snapshot' },
    { name: 'distinct-hash-is-not-latest', map: { records: [{ source: old, destination: moved }, { source: { ...old, rawBytesSha256: hashArray }, destination: { ...moved, file: 'docs/design/archive/slices/e1-lab/array.json', rawBytesSha256: hashArray } }] }, input: old, expectedCanonical: moved, expectedKind: 'move' },
    { name: 'unknown-pin-no-active-fallback', map: { records: [{ source: old, destination: moved }] }, input: { ...old, rawBytesSha256: '0'.repeat(64) }, expectedCode: 'E1_UNKNOWN_PIN', activeAliasPayloadMustNotBeRead: true },
    { name: 'wrong-length-is-different-identity', map: { records: [{ source: old, destination: moved }] }, input: { ...old, bytes: 3 }, expectedCode: 'E1_UNKNOWN_PIN' },
    { name: 'conflicting-move-targets', map: { records: [{ source: old, destination: moved }, { source: old, destination: snapshot }] }, input: old, expectedCode: 'E1_MAP_CONFLICT' },
    { name: 'conflicting-snapshot-targets', map: { records: [], immutableInputSnapshots: [{ original: old, snapshot }, { original: old, snapshot: moved }] }, input: old, expectedCode: 'E1_MAP_CONFLICT' },
    { name: 'relocation-changes-content', map: { records: [{ source: old, destination: { ...moved, rawBytesSha256: hashArray } }] }, input: old, expectedCode: 'E1_MAP_CONFLICT' },
    { name: 'logical-traversal', map: { records: [{ source: { ...old, file: '../private/input.json' }, destination: moved }] }, input: old, expectedCode: 'E1_UNSAFE_PATH' },
    { name: 'target-traversal', map: { records: [{ source: old, destination: { ...moved, file: 'docs/design/archive/slices/../private/input.json' } }] }, input: old, expectedCode: 'E1_UNSAFE_PATH' },
    { name: 'absolute-target', map: { records: [{ source: old, destination: { ...moved, file: '/tmp/input.json' } }] }, input: old, expectedCode: 'E1_UNSAFE_PATH' },
    { name: 'windows-drive-target', map: { records: [{ source: old, destination: { ...moved, file: 'C:/private/input.json' } }] }, input: old, expectedCode: 'E1_UNSAFE_PATH' },
    { name: 'nonarchive-target', map: { records: [{ source: old, destination: { ...moved, file: 'historical/active.json' } }] }, input: old, expectedCode: 'E1_NOT_CANONICAL' },
];

export const e1RootReadCases = [
    { name: 'authority-hash-or-length-mismatch', API: 'buildArchiveIndex', expectedCode: 'E1_CONTENT_MISMATCH', definition: 'Root supplies bytes and a deliberately mismatching complete authority pin; parsing/record access must not proceed.' },
    { name: 'canonical-payload-hash-mismatch', API: 'verifyPinnedBytes', pin: old, rawUTF8: '[]', expectedCode: 'E1_CONTENT_MISMATCH' },
    { name: 'canonical-payload-length-mismatch', API: 'verifyPinnedBytes', pin: old, rawUTF8: '{}\n', expectedCode: 'E1_CONTENT_MISMATCH' },
    { name: 'symlink-or-junction-parent', API: 'readCanonicalPin', expectedCode: 'E1_UNSAFE_PATH', definition: 'Root uses only a new owned lab root and a tiny synthetic canonical path with a symlink/junction ancestor; never change the real archive.' },
    { name: 'directory-as-file', API: 'readCanonicalPin', expectedCode: 'E1_NOT_REGULAR', definition: 'Root uses only a new owned lab root with a directory at the synthetic target; never change the real archive.' },
    { name: 'aliases-before-exit', API: 'replayE1', requireAliasesAbsent: false, expectedAliasesAbsent: false, E1ExitCertified: false },
    { name: 'default-refuses-alias-present', API: 'replayE1', requireAliasesAbsent: true, expectedCode: 'E1_ALIAS_PRESENT' },
    { name: 'after-root-removes-exact-five-aliases', API: 'replayE1', requireAliasesAbsent: true, expectedAliasesAbsent: true, expectedBuilderModes: ['cost', 'direct-pricing', 'bid-pricing', 'bid-with-children'], E1ExitCertified: false },
];
