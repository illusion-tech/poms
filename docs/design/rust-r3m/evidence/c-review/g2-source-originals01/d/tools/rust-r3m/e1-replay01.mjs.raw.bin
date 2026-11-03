// Explicit read-only replay API for Root's adapter. No self-run or output IO.
import { createHash } from 'node:crypto';
import { E1_INPUTS, E1_SCOPE, FIXTURE_ARGUMENTS, NATIVE_OPENAPI } from './e1-registry01.mjs';
import { createE1Resolver, E1Error, normalizedPin, requireE1, verifyPinnedBytes } from './e1-resolver01.mjs';
import { expectedCost, expectedDirectPricing, expectedBidPricing, expectedBidWithChildren } from './e1-fixture-expectations01.mjs';

export function canonicalJSON(value) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
    if (typeof value === 'number') {
        requireE1(Number.isFinite(value), 'E1_BAD_JSON_VALUE', 'Non-finite JSON numbers are forbidden');
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) return `[${value.map(canonicalJSON).join(',')}]`;
    requireE1(value && typeof value === 'object' && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null), 'E1_BAD_JSON_VALUE', 'Only ordinary JSON values are supported');
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJSON(value[key])}`).join(',')}}`;
}

export const canonicalSHA256 = value => createHash('sha256').update(canonicalJSON(value), 'utf8').digest('hex');

function assertEqual(actual, expected, label) {
    requireE1(canonicalJSON(actual) === canonicalJSON(expected), 'E1_OUTPUT_MISMATCH', `Frozen semantic output mismatch: ${label}`);
}

function validatePinList(value, count, label) {
    requireE1(Array.isArray(value) && value.length === count, 'E1_SCHEMA_MISMATCH', `${label} count mismatch`);
    const normalized = value.map(row => normalizedPin(row));
    requireE1(new Set(normalized.map(row => row.file)).size === count, 'E1_SCHEMA_MISMATCH', `${label} paths must be unique`);
    return normalized;
}

export function projectFrozenOperations(frozen, nativeOpenAPI) {
    requireE1(Array.isArray(frozen.operations) && frozen.operations.length === 16, 'E1_SCHEMA_MISMATCH', 'The frozen slice has exactly 16 operations');
    const projection = frozen.operations.map(row => {
        requireE1(typeof row.method === 'string' && typeof row.path === 'string' && typeof row.operationId === 'string', 'E1_SCHEMA_MISMATCH', 'Incomplete frozen operation');
        const source = nativeOpenAPI.paths?.[row.path]?.[row.method.toLowerCase()];
        requireE1(source?.operationId === row.operationId, 'E1_OUTPUT_MISMATCH', `Native operation projection mismatch: ${row.operationId}`);
        return { method: row.method, path: row.path, operationId: row.operationId };
    }).sort((a, b) => a.operationId < b.operationId ? -1 : a.operationId > b.operationId ? 1 : 0);
    requireE1(new Set(projection.map(row => row.operationId)).size === 16 && new Set(projection.map(row => `${row.method} ${row.path}`)).size === 16, 'E1_SCHEMA_MISMATCH', 'Operation IDs and method/path rows must be unique');
    requireE1(new Set(projection.map(row => row.path)).size === 11, 'E1_SCHEMA_MISMATCH', 'The frozen projection has exactly 11 paths');
    return projection;
}

export function replayManifests(resolver, nativeOpenAPIRawBytes) {
    const nativeBytes = verifyPinnedBytes(NATIVE_OPENAPI, nativeOpenAPIRawBytes);
    let nativeOpenAPI;
    try {
        nativeOpenAPI = JSON.parse(nativeBytes.toString('utf8'));
    } catch {
        throw new E1Error('E1_BAD_JSON', 'Invalid pinned Native OpenAPI JSON');
    }
    const g1 = resolver.readJSON(E1_INPUTS.g1Manifest);
    const native = resolver.readJSON(E1_INPUTS.nativeManifest);
    const operations = resolver.readJSON(E1_INPUTS.operations);
    requireE1(g1.value.kind === 'R3CDEFG-joint-G1-immutable-input-manifest-revision02' && native.value.kind === 'R3CDEFG-pre-G1-current-Native-admission', 'E1_SCHEMA_MISMATCH', 'Unexpected historical manifest kind');
    requireE1(g1.value.base === native.value.base && g1.value.base === operations.value.base, 'E1_SCHEMA_MISMATCH', 'Historical bases differ');
    requireE1(g1.value.operations === 16 && g1.value.R3Total === 58, 'E1_SCHEMA_MISMATCH', 'Historical operation counts differ');
    const g1Native = validatePinList(g1.value.nativeFiles, 872, 'G1 Native input');
    const admittedNative = validatePinList(native.value.nativeFiles, 872, 'preflight Native input');
    const formal = validatePinList(g1.value.formalFiles, 44, 'G1 formal input');
    assertEqual(g1Native, admittedNative, 'the two frozen Native pin lists');
    const projection = projectFrozenOperations(operations.value, nativeOpenAPI);
    return {
        inputs: [g1, native, operations].map(row => ({ logical: row.logical, canonical: row.canonical, kind: row.kind, authority: row.authority })),
        historicalBase: g1.value.base,
        nativeInputPinsInspected: g1Native.length,
        formalInputPinsInspected: formal.length,
        nestedSourcePayloadsReadOrCertified: false,
        nativePinListSHA256: canonicalSHA256(g1Native),
        nativeOpenAPI: NATIVE_OPENAPI,
        projection,
        projectionSHA256: canonicalSHA256(projection),
        historicalCertificationFlagsNotRelabelled: true,
    };
}

async function importVerifiedPureFixture(resolved) {
    // The two allowlisted, raw-hash-verified originals have no imports. Loading
    // these exact bytes avoids a second path-based module read after hashing.
    const allowed = [E1_INPUTS.fixtureA, E1_INPUTS.fixtureB].some(pin => canonicalJSON(pin) === canonicalJSON(resolved.logical));
    requireE1(allowed, 'E1_UNSUPPORTED_MODULE', 'Only the two frozen pure fixture modules may be loaded');
    const bytes = verifyPinnedBytes(resolved.logical, resolved.rawBytes);
    const source = bytes.toString('utf8');
    requireE1(!/(?:^|\n)\s*import(?:\s|\()|\bexport\s+[^;]*\bfrom\s*['"]/.test(source), 'E1_UNSUPPORTED_MODULE', 'Fixture dependency imports are forbidden');
    return import(`data:text/javascript;base64,${bytes.toString('base64')}`);
}

export async function replayFixtures(resolver) {
    const a = resolver.read(E1_INPUTS.fixtureA);
    const b = resolver.read(E1_INPUTS.fixtureB);
    const [fixtureA, fixtureB] = await Promise.all([importVerifiedPureFixture(a), importVerifiedPureFixture(b)]);
    const modes = [
        { mode: 'cost', build: () => fixtureA.buildCostRequest(), expected: expectedCost },
        { mode: 'direct-pricing', build: () => fixtureA.buildDirectPricingRequest(FIXTURE_ARGUMENTS.costId), expected: expectedDirectPricing },
        { mode: 'bid-pricing', build: () => fixtureA.buildBidPricingRequest(FIXTURE_ARGUMENTS.costId, FIXTURE_ARGUMENTS.bidId), expected: expectedBidPricing },
        { mode: 'bid-with-children', build: () => fixtureB.bidCommercialRequestWithChildren(FIXTURE_ARGUMENTS.marker, 'publicTender', FIXTURE_ARGUMENTS.navigationHint), expected: expectedBidWithChildren },
    ];
    const results = modes.map(({ mode, build, expected }) => {
        const actual = build();
        assertEqual(actual, expected, mode);
        assertEqual(build(), actual, `${mode} repeated deterministic call`);
        return { mode, output: actual, expectedSHA256: canonicalSHA256(expected), actualSHA256: canonicalSHA256(actual), deterministicRepeatMatched: true };
    });
    return {
        inputs: [a, b].map(row => ({ logical: row.logical, canonical: row.canonical, kind: row.kind, authority: row.authority })),
        arguments: FIXTURE_ARGUMENTS,
        results,
        resultSHA256: canonicalSHA256(results),
        noHTTPDatabaseOrEnvironmentReplay: true,
    };
}

// Root owns the call, before/after receipts, alias removal, negatives and gates.
export async function replayE1({ repositoryRoot, nativeOpenAPIRawBytes, requireAliasesAbsent = true } = {}) {
    requireE1(typeof requireAliasesAbsent === 'boolean', 'E1_BAD_OPTION', 'requireAliasesAbsent must be boolean');
    const resolver = createE1Resolver({ repositoryRoot });
    const before = resolver.aliasesAbsent();
    if (requireAliasesAbsent) requireE1(before.allAbsent, 'E1_ALIAS_PRESENT', 'Remove exactly the five approved aliases before exit replay');
    const manifests = replayManifests(resolver, nativeOpenAPIRawBytes);
    const fixtures = await replayFixtures(resolver);
    const after = resolver.aliasesAbsent();
    requireE1(before.allAbsent === after.allAbsent && canonicalJSON(before.states) === canonicalJSON(after.states), 'E1_SOURCE_CHANGED', 'Alias presence changed during replay');
    // Re-read all canonical inputs and the pinned map after the actual calls.
    const finalResolver = createE1Resolver({ repositoryRoot });
    for (const pin of Object.values(E1_INPUTS)) finalResolver.read(pin);
    return {
        kind: 'R3-closeout-supported-E1-actual-replay-result',
        scope: E1_SCOPE,
        authority: resolver.authority,
        aliasStateBefore: before,
        aliasStateAfter: after,
        requireAliasesAbsent,
        manifests,
        fixtures,
        allReplayAssertionsPassed: true,
        canonicalInputsReadAgainAfterReplay: true,
        resultSHA256: canonicalSHA256({ manifests, fixtures }),
        E1ExitCertified: false,
        G3Certified: false,
        G4Certified: false,
    };
}
