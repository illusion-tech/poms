// Pure evidence interpretation only: no imports, IO, env, process or self-run.
const SHA = /^[a-f0-9]{64}$/;
const UUID = '[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}';
const JOURNEYS = Object.freeze(['customerJourney', 'projectJourney', 'leadJourney', 'intelligenceDiscussionJourney']);
const CELLS = Object.freeze([
    { key: 'linux/native/linux', browserPlatform: 'linux', backend: 'native', serverPlatform: 'linux', role: 'reference' },
    { key: 'linux/rust/linux', browserPlatform: 'linux', backend: 'rust', serverPlatform: 'linux', role: 'business' },
    { key: 'win32/native/win32', browserPlatform: 'win32', backend: 'native', serverPlatform: 'win32', role: 'reference' },
    { key: 'win32/rust/linux', browserPlatform: 'win32', backend: 'rust', serverPlatform: 'linux', role: 'business' },
]);

export class CoverageInputError extends Error {
    constructor(message) { super(message); this.name = 'CoverageInputError'; }
}
const requireInput = (value, message) => { if (!value) throw new CoverageInputError(message); };
const validPin = pin => Boolean(pin && typeof pin.file === 'string' && pin.file.length && Number.isSafeInteger(pin.bytes) && pin.bytes >= 0 && typeof pin.rawBytesSha256 === 'string' && SHA.test(pin.rawBytesSha256));
const copyPin = pin => ({ file: pin.file, bytes: pin.bytes, rawBytesSha256: pin.rawBytesSha256 });
const samePin = (a, b) => validPin(a) && validPin(b) && a.file === b.file && a.bytes === b.bytes && a.rawBytesSha256 === b.rawBytesSha256;
const pinKey = pin => JSON.stringify([pin.file, pin.bytes, pin.rawBytesSha256]);
const escapeRegex = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const uuidEqual = (a, b) => typeof a === 'string' && typeof b === 'string' && new RegExp(`^${UUID}$`).test(a) && new RegExp(`^${UUID}$`).test(b) && a.toLowerCase() === b.toLowerCase();
const stable = value => Array.isArray(value) ? `[${value.map(stable).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}` : JSON.stringify(value);

function candidateInput(finalArtifactSha, immutableCandidatePin) {
    requireInput(typeof finalArtifactSha === 'string' && SHA.test(finalArtifactSha), 'finalArtifactSha must be a lowercase SHA256');
    requireInput(validPin(immutableCandidatePin), 'immutableCandidatePin must contain file, bytes and rawBytesSha256');
}

function sourceReasons(report, expectedPin, label) {
    if (!Array.isArray(report.sources)) return [`${label}:sources-missing`];
    const matchingFile = report.sources.filter(row => row?.file === expectedPin.file);
    if (!matchingFile.length) return [`${label}:pin-missing`];
    if (matchingFile.some(row => !samePin(row, expectedPin))) return [`${label}:pin-conflict`];
    return [];
}

function wrapped(entry, index) {
    if (!entry || !validPin(entry.pin) || !entry.report || typeof entry.report !== 'object') {
        return { index, pin: validPin(entry?.pin) ? copyPin(entry.pin) : null, reasons: ['report-wrapper-or-provenance-pin-missing'] };
    }
    return { index, pin: copyPin(entry.pin), report: entry.report, reasons: [] };
}

function parts(requestPath) {
    if (typeof requestPath !== 'string' || !requestPath.startsWith('/') || requestPath.includes('#')) return null;
    const pathname = requestPath.split('?')[0];
    try {
        const decoded = pathname.split('/').map(segment => decodeURIComponent(segment));
        if (decoded.some(segment => /[/\\\0]/.test(segment) || segment === '.' || segment === '..')) return null;
        return decoded;
    } catch { return null; }
}

function routePattern(canonicalPath) {
    requireInput(typeof canonicalPath === 'string' && canonicalPath.startsWith('/') && !/[?#%\\]/.test(canonicalPath), 'Inventory requires an unencoded canonical path');
    const segments = canonicalPath.split('/').map(segment => {
        const matches = [...segment.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/g)];
        requireInput(matches.length <= 1, 'At most one UUID placeholder is supported per canonical segment');
        if (!matches.length) {
            requireInput(!/[{}]/.test(segment), 'Malformed canonical placeholder');
            return { literal: segment };
        }
        const match = matches[0], start = match.index, end = start + match[0].length;
        const prefix = segment.slice(0, start), suffix = segment.slice(end);
        requireInput(!/[{}]/.test(prefix + suffix), 'Malformed canonical placeholder');
        return { parameter: match[1], pattern: new RegExp(`^${escapeRegex(prefix)}(${UUID})${escapeRegex(suffix)}$`) };
    });
    return requestPath => {
        const actual = parts(requestPath);
        if (!actual || actual.length !== segments.length) return null;
        const bindings = {};
        for (let i = 0; i < segments.length; i += 1) {
            const segment = segments[i];
            if (segment.literal !== undefined) { if (segment.literal !== actual[i]) return null; }
            else {
                const match = segment.pattern.exec(actual[i]);
                if (!match || (bindings[segment.parameter] !== undefined && !uuidEqual(bindings[segment.parameter], match[1]))) return null;
                bindings[segment.parameter] = match[1];
            }
        }
        return bindings;
    };
}

function inventoryRows(inventory58) {
    requireInput(Array.isArray(inventory58) && inventory58.length === 58, 'inventory58 must contain exactly 58 operations');
    const rows = inventory58.map(row => {
        const canonicalPath = row.canonicalPath ?? row.path;
        requireInput(typeof row.method === 'string' && /^[A-Z]+$/.test(row.method) && typeof row.operationId === 'string' && row.operationId.length, 'Every inventory row needs method and operationId');
        requireInput(row.path === undefined || row.canonicalPath === undefined || row.path === row.canonicalPath, 'Conflicting canonical path fields');
        return { operationId: row.operationId, method: row.method, canonicalPath, match: routePattern(canonicalPath) };
    });
    requireInput(new Set(rows.map(row => row.operationId)).size === 58, 'Inventory operationIds must be unique');
    requireInput(new Set(rows.map(row => `${row.method} ${row.canonicalPath.replace(/\{[^}]+\}/g, '{UUID}')}`)).size === 58, 'Inventory method/canonical routes must be unique');
    return rows;
}

export function auditM0Coverage({ inventory58, finalArtifactSha, immutableCandidatePin, apiReports } = {}) {
    candidateInput(finalArtifactSha, immutableCandidatePin);
    requireInput(Array.isArray(apiReports), 'apiReports must be an array of {pin,report}');
    const rows = inventoryRows(inventory58), byId = new Map(rows.map(row => [row.operationId, row]));
    const found = new Map(rows.map(row => [row.operationId, []]));
    const excludedReports = [], excludedCases = [], excludedEvents = [], acceptedReports = [], seen = new Set();
    for (const [reportIndex, entry] of apiReports.entries()) {
        const input = wrapped(entry, reportIndex), report = input.report;
        const reasons = [...input.reasons];
        if (report) {
            if (report.evidenceKind !== 'candidate-business') reasons.push('not-candidate-business-evidence');
            if (report.completed !== true || report.partial === true) reasons.push('report-not-completed');
            if (report.backend !== 'rust') reasons.push('not-Rust-business-evidence');
            if (report.runtime?.artifactSha256 !== finalArtifactSha) reasons.push('wrong-runtime-artifact');
            reasons.push(...sourceReasons(report, immutableCandidatePin, 'candidate'));
            if (!Array.isArray(report.events) || !Array.isArray(report.cases)) reasons.push('events-or-cases-missing');
        }
        if (input.pin && seen.has(pinKey(input.pin))) reasons.push('duplicate-report-pin');
        if (reasons.length) { excludedReports.push({ reportIndex, pin: input.pin, reasons }); continue; }
        seen.add(pinKey(input.pin)); acceptedReports.push({ reportIndex, pin: input.pin });
        const ranges = new Map(), nonBusinessIndexes = new Set();
        for (const [caseIndex, item] of report.cases.entries()) {
            const range = item?.validatedEventRange;
            const validRange = range && range.exclusive === true && Number.isSafeInteger(range.start) && Number.isSafeInteger(range.end) && range.start >= 0 && range.end > range.start && range.end <= report.events.length;
            if (item?.kind !== 'business' && validRange) for (let i = range.start; i < range.end; i += 1) nonBusinessIndexes.add(i);
            let reason = null;
            if (!item || typeof item.name !== 'string' || !item.name.length) reason = 'case-name-missing';
            else if (item.kind !== 'business') reason = 'case-not-business';
            else if (item.completed !== true) reason = 'case-not-completed';
            else if (!validRange) reason = 'invalid-or-empty-validated-event-range';
            if (reason) { excludedCases.push({ reportIndex, pin: input.pin, caseIndex, caseName: item?.name ?? null, reason }); continue; }
            for (let i = range.start; i < range.end; i += 1) {
                const owners = ranges.get(i) ?? [];
                owners.push({ caseIndex, caseName: item.name, validatedEventRange: { start: range.start, end: range.end, exclusive: true } }); ranges.set(i, owners);
            }
        }
        for (const [eventIndex, event] of report.events.entries()) {
            const owners = ranges.get(eventIndex), reject = reason => excludedEvents.push({ reportIndex, pin: input.pin, eventIndex, reason });
            if (nonBusinessIndexes.has(eventIndex)) { reject('inside-non-business-case-range'); continue; }
            if (!owners) { reject('outside-completed-business-case-range'); continue; }
            if (!event || !Number.isInteger(event.status) || event.status < 200 || event.status > 299) { reject('not-2xx-success'); continue; }
            if ((event.kind !== undefined && event.kind !== 'business') || (event.backend !== undefined && event.backend !== 'rust')) { reject('event-not-Rust-business'); continue; }
            if (event.runtimeArtifactSha256 !== undefined && event.runtimeArtifactSha256 !== finalArtifactSha) { reject('event-wrong-artifact'); continue; }
            if (typeof event.method !== 'string') { reject('event-method-missing'); continue; }
            const method = event.method.toUpperCase();
            let candidates, matching;
            if (Object.hasOwn(event, 'operationId')) {
                const explicit = byId.get(event.operationId);
                if (!explicit) { reject('unknown-explicit-operation-id'); continue; }
                candidates = explicit.method === method && explicit.match(event.path) ? [explicit] : [];
                matching = 'explicit-operation-id-cross-checked';
            } else { candidates = rows.filter(row => row.method === method && row.match(event.path)); matching = 'exact-method-canonical-UUID'; }
            if (candidates.length !== 1) { reject(candidates.length ? 'ambiguous-canonical-route' : Object.hasOwn(event, 'operationId') ? 'operation-id-method-path-mismatch' : 'no-canonical-route'); continue; }
            const row = candidates[0];
            found.get(row.operationId).push({ reportIndex, reportPin: input.pin, eventIndex, operationId: row.operationId, method, rawPath: event.path, status: event.status, bindings: row.match(event.path), matching, completedCases: owners, runtimeArtifactSha256: finalArtifactSha, immutableCandidatePin: copyPin(immutableCandidatePin) });
        }
    }
    const coverage = rows.map(({ match, ...row }) => ({ ...row, proven: found.get(row.operationId).length > 0, provenance: found.get(row.operationId) }));
    const missing = coverage.filter(row => !row.proven).map(({ provenance, proven, ...row }) => row);
    return { kind: 'pure-M0-coverage-interpretation', required: 58, covered: 58 - missing.length, coverageComplete: missing.length === 0, finalArtifactSha, immutableCandidatePin: copyPin(immutableCandidatePin), coverage, missing, acceptedReports, excludedReports, excludedCases, excludedEvents, rawReportBytesVerifiedHere: false, G3Certified: false, G4Certified: false };
}

const NATIVE_FAILURES = Object.freeze({
    'contact-female-to-unknown': { journey: 'customerJourney', table: 'customer_contact', route: '/api/customer-contacts' },
    'bid-second-version-500': { journey: 'projectJourney', table: 'project_bid_commercial_process', route: '/api/projects/{projectId}/bid-commercial-processes', constraint: 'uq_project_bid_commercial_process_current' },
    'pricing-second-version-500': { journey: 'projectJourney', table: 'project_pricing_margin_review', route: '/api/projects/{projectId}/pricing-margin-reviews', constraint: 'uq_project_pricing_margin_review_current' },
});

function observation(report, index, table) {
    if (!Number.isSafeInteger(index) || index < 0) return null;
    const row = report.pgObservations?.[index];
    return row && row.table === table && Array.isArray(row.rows) && row.rows.every(value => value && typeof value === 'object' && !Array.isArray(value)) ? row : null;
}

function knownNativeFailure(report, witness) {
    const rule = Object.hasOwn(NATIVE_FAILURES, witness?.id) ? NATIVE_FAILURES[witness.id] : null;
    if (!rule || witness.journeyName !== rule.journey) return { accepted: false, reason: 'unknown-native-failure-id-or-journey' };
    const network = report.network, match = routePattern(rule.route);
    const after = observation(report, witness.afterPgIndex, rule.table);
    if (!after) return { accepted: false, reason: 'known-failure-PG-after-observation-missing' };
    if (witness.id === 'contact-female-to-unknown') {
        const event = Number.isSafeInteger(witness.networkIndex) && witness.networkIndex >= 0 ? network[witness.networkIndex] : null;
        if (!event || event.method !== 'POST' || event.status !== 201 || !match(event.path) || event.requestBody?.gender !== 'female' || event.responseBody?.gender !== 'unknown' || !after.rows.some(row => uuidEqual(row.id, event.responseBody?.id) && row.gender === 'unknown')) return { accepted: false, reason: 'contact-known-failure-does-not-match-real-network-and-PG' };
    } else {
        const first = Number.isSafeInteger(witness.firstNetworkIndex) && witness.firstNetworkIndex >= 0 ? network[witness.firstNetworkIndex] : null;
        const second = Number.isSafeInteger(witness.failedNetworkIndex) && witness.failedNetworkIndex >= 0 ? network[witness.failedNetworkIndex] : null;
        const history = Number.isSafeInteger(witness.historyNetworkIndex) && witness.historyNetworkIndex >= 0 ? network[witness.historyNetworkIndex] : null;
        const before = observation(report, witness.beforePgIndex, rule.table);
        const firstBinding = first && match(first.path), secondBinding = second && match(second.path);
        if (!first || !second || witness.firstNetworkIndex >= witness.failedNetworkIndex || witness.beforePgIndex >= witness.afterPgIndex || first.method !== 'POST' || second.method !== 'POST' || first.status !== 201 || second.status !== 500 || !firstBinding || !secondBinding || !uuidEqual(firstBinding.projectId, secondBinding.projectId) || first.responseBody?.version !== 1 || !before || before.rows.length !== 1 || after.rows.length !== 1 || !uuidEqual(before.rows[0].id, first.responseBody?.id) || !uuidEqual(before.rows[0].project_id, firstBinding.projectId) || before.rows[0].version !== 1 || before.rows[0].is_current !== true || stable(before.rows) !== stable(after.rows)) return { accepted: false, reason: 'version-known-failure-does-not-match-real-201-500-and-unchanged-v1' };
        const historyBinding = history && match(history.path);
        if (!history || witness.historyNetworkIndex <= witness.failedNetworkIndex || history.method !== 'GET' || history.status !== 200 || !historyBinding || !uuidEqual(historyBinding.projectId, firstBinding.projectId) || !Array.isArray(history.responseBody) || history.responseBody.length !== 1 || !uuidEqual(history.responseBody[0]?.id, first.responseBody.id) || history.responseBody[0]?.version !== 1) return { accepted: false, reason: 'version-known-failure-after-history-not-proven' };
        if (witness.validRequestVerified !== true || witness.cause?.sqlState !== '23505' || witness.cause?.constraint !== rule.constraint || !validPin(witness.cause?.evidencePin)) return { accepted: false, reason: 'specific-version-failure-cause-not-proven' };
    }
    return { accepted: true, id: witness.id, journeyName: witness.journeyName, networkIndexes: witness.id === 'contact-female-to-unknown' ? [witness.networkIndex] : [witness.firstNetworkIndex, witness.failedNetworkIndex, witness.historyNetworkIndex], beforePgIndex: witness.beforePgIndex ?? null, afterPgIndex: witness.afterPgIndex, cause: witness.cause?.evidencePin ? { sqlState: witness.cause.sqlState, constraint: witness.cause.constraint, evidencePin: copyPin(witness.cause.evidencePin) } : null, businessPass: false };
}

export function auditUICoverage({ finalArtifactSha, immutableCandidatePin, passedIndependentMatrixClarificationPin, uiReports } = {}) {
    candidateInput(finalArtifactSha, immutableCandidatePin);
    requireInput(Array.isArray(uiReports), 'uiReports must be an array of {pin,report}');
    const hardMissing = [], excludedReports = [], excludedJourneys = [], knownNativeBusinessFailures = [], seen = new Set();
    const covered = new Map(CELLS.flatMap(cell => JOURNEYS.map(name => [`${cell.key}/${name}`, []])));
    const clarificationValid = validPin(passedIndependentMatrixClarificationPin);
    if (!clarificationValid) hardMissing.push('passedIndependentMatrixClarificationPin-missing-or-invalid');
    for (const [reportIndex, entry] of uiReports.entries()) {
        const input = wrapped(entry, reportIndex), report = input.report, reasons = [...input.reasons];
        let cell, validatedKnown = [];
        if (!clarificationValid) reasons.push('independent-matrix-clarification-pin-required');
        if (report) {
            cell = CELLS.find(row => row.backend === report.backend && row.browserPlatform === report.browserPlatform && row.serverPlatform === report.serverPlatform);
            if (!cell) reasons.push('unapproved-browser-backend-server-cell');
            reasons.push(...sourceReasons(report, immutableCandidatePin, 'candidate'));
            if (clarificationValid) reasons.push(...sourceReasons(report, passedIndependentMatrixClarificationPin, 'matrix-clarification'));
            if (!Array.isArray(report.journeys) || !Array.isArray(report.network) || !report.network.length) reasons.push('actual-journeys-or-network-missing');
            for (const flag of ['network', 'postgres', 'sourceStable', 'noMocksOrStateInjection', 'noFailureFallback']) if (report.validation?.[flag] !== true) reasons.push(`validation-${flag}-not-proven`);
            if (cell?.role === 'business') {
                if (report.evidenceKind !== 'candidate-ui' || report.completed !== true || report.partial === true) reasons.push('not-completed-Rust-business-UI');
                if (report.runtime?.artifactSha256 !== finalArtifactSha) reasons.push('wrong-Rust-UI-runtime-artifact');
            } else if (cell?.role === 'reference') {
                if (report.evidenceKind !== 'native-reference-ui' || report.captureCompleted !== true || report.partial === true || report.NativeBusinessAcceptance !== false) { reasons.push('Native-reference-and-business-outcomes-not-separated'); hardMissing.push(`${cell.key}:Native-reference-and-business-outcomes-not-separated`); }
                if (!Array.isArray(report.knownFailures) || !report.knownFailures.length) reasons.push('known-Native-failure-witnesses-missing');
                else if (Array.isArray(report.network)) {
                    validatedKnown = report.knownFailures.map(witness => knownNativeFailure(report, witness));
                    if (validatedKnown.some(row => !row.accepted)) reasons.push(...validatedKnown.filter(row => !row.accepted).map(row => row.reason));
                    if (!Object.keys(NATIVE_FAILURES).every(id => validatedKnown.some(row => row.accepted && row.id === id))) reasons.push('three-specific-known-Native-witnesses-not-complete');
                }
            }
        }
        if (input.pin && seen.has(pinKey(input.pin))) reasons.push('duplicate-report-pin');
        if (reasons.length) { excludedReports.push({ reportIndex, pin: input.pin, reasons }); continue; }
        seen.add(pinKey(input.pin));
        knownNativeBusinessFailures.push(...validatedKnown.map(row => ({ ...row, reportIndex, reportPin: input.pin, cell: cell.key, passedIndependentMatrixClarificationPin: copyPin(passedIndependentMatrixClarificationPin) })));
        for (const [journeyIndex, journey] of report.journeys.entries()) {
            let reason = null;
            if (!JOURNEYS.includes(journey?.name)) reason = 'unknown-journey-function-name';
            else if (journey.role !== cell.role) reason = 'journey-business-reference-role-not-separated';
            else if (cell.role === 'business' && (journey.completed !== true || journey.businessPass !== true)) reason = 'Rust-journey-business-pass-not-proven';
            else if (cell.role === 'reference' && journey.captureCompleted !== true) reason = 'Native-reference-journey-capture-not-completed';
            if (reason) { excludedJourneys.push({ reportIndex, pin: input.pin, journeyIndex, name: journey?.name ?? null, reason }); hardMissing.push(`${cell.key}:${journey?.name ?? journeyIndex}:${reason}`); continue; }
            covered.get(`${cell.key}/${journey.name}`).push({ reportIndex, reportPin: input.pin, journeyIndex, name: journey.name, role: cell.role, cell: cell.key, browserPlatform: report.browserPlatform, serverPlatform: report.serverPlatform, backend: report.backend, runtimeArtifactSha256: report.runtime?.artifactSha256 ?? null, immutableCandidatePin: copyPin(immutableCandidatePin), passedIndependentMatrixClarificationPin: copyPin(passedIndependentMatrixClarificationPin) });
        }
    }
    const coverage = CELLS.flatMap(cell => JOURNEYS.map(name => ({ cell: cell.key, journey: name, role: cell.role, proven: covered.get(`${cell.key}/${name}`).length > 0, provenance: covered.get(`${cell.key}/${name}`) })));
    const missing = coverage.filter(row => !row.proven).map(({ provenance, proven, ...row }) => row);
    return { kind: 'pure-layered-UI-evidence-interpretation', requiredJourneyCells: 16, coveredJourneyCells: 16 - missing.length, coverageComplete: missing.length === 0 && !hardMissing.length, rustBusinessPassed: coverage.filter(row => row.role === 'business' && row.proven).length, rustBusinessRequired: 8, nativeReferenceCaptured: coverage.filter(row => row.role === 'reference' && row.proven).length, nativeReferenceRequired: 8, NativeBusinessAcceptance: false, knownNativeBusinessFailures, coverage, missing, hardMissing, excludedReports, excludedJourneys, passedIndependentMatrixClarificationPin: clarificationValid ? copyPin(passedIndependentMatrixClarificationPin) : null, rawReportBytesAndIndependentSignatureVerifiedHere: false, WindowsNativeRustServerCertified: false, G3Certified: false, G4Certified: false };
}

export const G3_CLOSEOUT_CHECKLIST = Object.freeze([
    { id: 'candidate-integrity', required: 'Root actual final source/artifact/runtime pins, protected1371+declaredUI2, full173/138/585 and Native291/237/585,client579,migrations92; fmt/clippy/test/release and impacted frontend results; no unsupported pass claim.' },
    { id: 'M0', required: '58 unique successful candidate-business operations inside completed validated business-case ranges plus separate full guard/envelope/no-side-effect evidence.' },
    { id: 'M1-M3', required: 'Actual same converted-Project producer-consumer graph, six frozen product corrections, one materialized score tuple/stored tuple/fallback, exact required-write rollback/recovery, real CAS and F lock wait; no prepared fact relabelled producer success.' },
    { id: 'M4-clarification', required: 'Root passes the exact approved independent matrix clarification pin; Rust derived business assertions, unchanged Native original defect witnesses and sources stay distinct.' },
    { id: 'M4-layered', required: '16 complete journey cells =8 Rust business passes+8 Native reference captures; specific actual known Native network/PG defects listed; NativeBusinessAcceptance=false; filled-date4 and blank/null/date-only regression separately proven.' },
    { id: 'ignored', required: '53 controlled DB opt-in+1 parent-invoked child remain classified; default ignored is not pass; actual current parent receipt and affected DB/dependency decision explicitly recorded.' },
    { id: 'E1', required: 'Root actual before/after replay, exact5alias419264B removal, canonical/23legacy raw preservation and Linux/main landing; independent review remains required. Windows local result is not whole E1 certification.' },
    { id: 'terminal', required: 'Root full owned graph/seed/privilege/logging restoration, second-zero cleanup, owned runtime/ports/PG stopped, retained volume/new private originals; all failed/partial/stopped/uncertified records preserved.' },
    { id: 'governance', required: 'No unresolved P0/P1/P2, independent G3 then exact commit/main/archive and actual G4 separately;100/97/85 close only after all required conditions,57 remainsOpen.' },
]);

export function auditCandidateEvidence(input = {}) {
    return { M0: auditM0Coverage(input), UI: auditUICoverage(input), ignored: { DBOptIn: 53, explicitParentInvokedChild: 1, passed: null, defaultIgnoredNotPass: true }, closeoutChecklist: G3_CLOSEOUT_CHECKLIST, interpretationOnly: true, G3Certified: false, G4Certified: false };
}
