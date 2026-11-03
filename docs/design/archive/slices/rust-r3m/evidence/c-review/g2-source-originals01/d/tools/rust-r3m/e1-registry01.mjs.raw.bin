// Frozen logical identities, not reads of the five active compatibility aliases.
// Importing this registry performs no IO. The 23 legacy source files stay intact.
const pin = (file, bytes, rawBytesSha256) => Object.freeze({ file, bytes, rawBytesSha256 });

export const ARCHIVE_AUTHORITY = pin(
    'docs/design/archive/slices/rust-r3cdefg/archive-origin-map.json',
    355382,
    '74246bb91c6bae9d9e3f9277351386264f1f8534acdbbf309f56eb952608bfc8',
);

export const NATIVE_OPENAPI = pin(
    'libs/shared/api-spec/openapi.json',
    1129410,
    'ea52612847ee2204c78e72979a798698d950f8486da667d8427111aea7c8e40a',
);

export const E1_INPUTS = Object.freeze({
    g1Manifest: pin(
        'docs/design/rust-r3cdefg/g1-input-manifest02.json',
        190930,
        '1a55e52076869b87d55de1f636b6e789cc0319525e29ac7bfcf70f36dc4d6f94',
    ),
    nativeManifest: pin(
        'docs/design/rust-r3cdefg/preflight-native-source-manifest01.json',
        180482,
        '998660f563f4d792c9e0146fde454a351c7d968f9f45df1059af0f9d9ce36661',
    ),
    operations: pin(
        'docs/design/rust-r3cdefg/g1-operation-slices-original.json',
        38863,
        '5fd7c80e1ccac5e3f8e9ac1ef5ebfbe5996b8d5c740ba0933f567dbea453269c',
    ),
    fixtureA: pin(
        'docs/design/rust-r3cdefg/input-a/native-fixture-draft01.mjs',
        4774,
        '041932f361cb4308ce7c854ac1506c53a6846dcf58cb0732c1d15519f8018a83',
    ),
    fixtureB: pin(
        'docs/design/rust-r3cdefg/input-b/native-fixture-draft01.mjs',
        4215,
        '7e5824cb04bda5a3ae38869b27d2f00a624b7d853875ec1ca8e0461773a14946',
    ),
});

export const E1_SCOPE = Object.freeze({
    owner: 'Root /root',
    originalDeadline: '2026-11-09',
    exitBefore: 'current batch G3 or original deadline, whichever is earlier',
    aliases: 5,
    aliasBytes: 419264,
    originalDirectLegacyConsumers: 23,
    newRegistryClassification: 'Logical identity registry; no direct alias payload read',
    unchangedLegacyCommandReplaySupported: false,
    oldPrivateOrEnvironmentReplaySupported: false,
});

export const FIXTURE_ARGUMENTS = Object.freeze({
    costId: '11111111-1111-4111-8111-111111111111',
    bidId: '22222222-2222-4222-8222-222222222222',
    marker: 'E1-replay01',
    navigationHint: '/projects/e1-replay/workspace/bid-commercial',
    classification: 'Pure constructor inputs only; not HTTP producers or database facts',
});
