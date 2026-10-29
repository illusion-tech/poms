// Source-only K business matrix. Root owns admission, setup, dispatch, certificates and cleanup.
// Importing this module does not construct a client, send HTTP, access PG or modify files.
import assert from 'node:assert/strict';
import { request as describeRequest } from './k-protocol.mjs';

const service = 'apps/poms-api/src/app/features/attachment/attachment.service.ts';
const controller = 'apps/poms-api/src/app/features/attachment/attachment-handover.controller.ts';
const source = (start, end) => `${service}:${start}-${end}`;
const ref = name => ({ $ref: name });
const op = Object.freeze({ checklist: 'AttachmentHandoverController_getChecklist', refresh: 'AttachmentHandoverController_refreshChecklist', create: 'AttachmentHandoverController_createDownloadPackage', get: 'AttachmentHandoverController_getDownloadPackage', download: 'AttachmentHandoverController_downloadPackage' });
const step = (name, operation, id, options = {}) => ({ name, operationId: op[operation], id: ref(id), role: 'admin', ...options });
const expect = (status, behavior, extra = {}) => ({ statusFromSource: status, behavior, ...extra });

export const roles = Object.freeze({
    admin: ['project:read', 'project:write'], reader: ['project:read'], writer: ['project:write'],
    foreignReader: ['project:read'], leadOnly: ['lead:read', 'lead:write'], anonymous: []
});

export const scenarios = Object.freeze([
    {
        name: 'candidate-source-and-persistence', source: [source(927, 1022), source(1497, 1659)],
        manualSetup: ['Fresh owned handover; no selections or handover links.', 'Use actual J uploads/links: project, source lead, project contracts, matching project OR lead followups; at least two ordinary groups and confidential/restricted groups. A group has a real historical final and latest version.', 'Record attachment bytes/IDs/group IDs and existing PG facts. No mocked facts or provider.'],
        steps: [
            step('checklist.candidates', 'checklist', 'handoverId', { expected: expect(200, 'Final preferred; multi-source group deduplicated; ordinary eligible, sensitive excluded; null selectionId/rowVersion/updatedAt; only viewed audit is written.'), observe: ['all sourceRefs in original order', 'counts', 'PG selections remain absent', 'viewed audit before candidate SQL'] }),
            step('checklist.refresh', 'refresh', 'handoverId', { body: {}, creates: ['selection for each candidate group', 'active project-handover/handover link for each included attachment'], expected: expect(200, 'Persist selections/links; actual returned IDs/versions become bindings. Capture intermediate AUTO flush and CREATE group ordering.') }),
            step('checklist.persisted', 'checklist', 'handoverId', { expected: expect(200, 'All stored selections returned ordered by updatedAt DESC/createdAt DESC, with actual positive versions and timestamps.') })
        ]
    },
    {
        name: 'refresh-manual-exclusion-and-history', source: [source(944, 1022), source(1640, 1659)],
        manualSetup: ['Root conditionally assigns one exact owned selection status=excluded and its reason under a durable fixture fault intent; this is fixture state, not an implemented public exclusion command.', 'Keep a separately owned missing/stale historical selection absent from the current candidate set; retain actual before facts.'],
        steps: [
            step('refresh.preserve-manual', 'refresh', 'handoverId', { body: { preserveManualExclusions: true, includeHistoricalSelections: false }, expected: expect(200, 'The matched manual excluded selection retains fields; includeHistoricalSelections does not remove old rows. Response only covers current candidates.') }),
            step('history.stored-get', 'checklist', 'handoverId', { expected: expect(200, 'GET includes stored historical rows that the refresh response omitted; missing/stale statuses map directly.') }),
            step('refresh.replace-manual', 'refresh', 'handoverId', { body: { preserveManualExclusions: false, includeHistoricalSelections: true }, expected: expect(200, 'Matched manual exclusion is replaced with current candidate selection; old rows and old links are not deleted.') })
        ]
    },
    {
        name: 'package-success-subset-and-zip', source: [source(1024, 1136), source(1662, 1834)],
        manualSetup: ['Existing ordinary/sensitive selections from actual refresh. Bind normalSelectionId/internalSelectionId and their actual versions.', 'Root records closed creation intent before each POST, then accepts only actual committed creation certificates, never arbitrary returned DTOs.'],
        steps: [
            step('package.normal-subset', 'create', 'handoverId', { body: { selectionIds: [ref('normalSelectionId')], expectedSelectionVersions: [{ selectionId: ref('normalSelectionId'), rowVersion: ref('normalSelectionVersion') }], confirmedSensitiveExclusion: true, note: '源输入中的 note 不进入包或审计' }, creates: ['download package', 'included subset items plus ALL non-included selection items', 'real stored ZIP'], bindBody: 'readyPackage', expected: expect(200, 'Ready package; only selected ordinary attachment is included. All non-included selections are excluded; an unselected eligible attachment is neither included nor counted as excluded.'), zipChecks: ['manifest.json first', 'method=0 and UTF8 flag=0x0800', 'each local/central CRC and offsets', 'raw manifest property order and UTF8', 'entry name sanitization/UTF16 truncation', 'entry bytes hash equals known real final attachment', 'sensitive source bytes absent', 'TTL=createdAt+86400000ms', 'items/manifest/PG/audit IDs agree'] }),
            step('package.summary', 'get', 'readyPackageId', { expected: expect(200, 'Summary has no storage location or rowVersion field, unchanged downloadCount and no new package audit.') }),
            step('package.download', 'download', 'readyPackageId', { expected: expect(200, 'Real ZIP bytes; open precedes count/date save and success audit.'), binary: true }),
            step('package.HEAD', 'download', 'readyPackageId', { method: 'HEAD', expected: expect(200, 'Body is empty; original GET handler still opens/drains, increments count and records audit.'), binary: true }),
            step('package.Range-is-not-supported', 'download', 'readyPackageId', { rawHeaders: ['Range', 'bytes=0-3'], expected: expect(200, 'Full ZIP, no accept-ranges/content-range; original controller has no range handling.'), binary: true }),
            step('package.read-after-downloads', 'get', 'readyPackageId', { expected: expect(200, 'downloadCount advanced by each successful GET/HEAD and downloadedAt matches its recorded step/PG bounds.') })
        ]
    },
    {
        name: 'create-selection-version-boundaries', source: [source(1034, 1053), source(1662, 1686)],
        manualSetup: ['Use existing selections; bind normalSelectionVersionPlus1 as actual+1 and a selection belonging to another handover. These requests must not cause new packages/objects.'],
        steps: [
            step('selection.unknown', 'create', 'handoverId', { body: { selectionIds: [ref('missingSelectionId')] }, expected: expect(400, 'Some attachment checklist selections do not exist for this handover') }),
            step('selection.other-handover', 'create', 'handoverId', { body: { selectionIds: [ref('otherSelectionId')] }, expected: expect(400, 'Some attachment checklist selections do not exist for this handover') }),
            step('expectation.unselected', 'create', 'handoverId', { body: { selectionIds: [ref('normalSelectionId')], expectedSelectionVersions: [{ selectionId: ref('internalSelectionId'), rowVersion: ref('internalSelectionVersion') }] }, expected: expect(400, 'Attachment selection is not part of this package request') }),
            step('expectation.stale', 'create', 'handoverId', { body: { selectionIds: [ref('normalSelectionId')], expectedSelectionVersions: [{ selectionId: ref('normalSelectionId'), rowVersion: ref('normalSelectionVersionPlus1') }] }, expected: expect(409, 'Attachment selection version mismatch') }),
            step('selection.non-downloadable', 'create', 'handoverId', { body: { selectionIds: [ref('sensitiveSelectionId')] }, expected: expect(400, 'No downloadable handover attachment selections are available; this precedes sensitive-confirm rejection.') }),
            step('sensitive.confirm-required', 'create', 'handoverId', { body: { selectionIds: [ref('normalSelectionId')], confirmedSensitiveExclusion: false }, expected: expect(400, 'Sensitive exclusions must be confirmed, including non-selected sensitive selections.') }),
            step('selection.duplicate-is-set', 'create', 'handoverId', { body: { selectionIds: [ref('normalSelectionId'), ref('normalSelectionId')], expectedSelectionVersions: [] }, creates: ['download package/items/ZIP'], expected: expect(200, 'Duplicate equal IDs deduplicate through JS Set; expected versions need not cover selections.') }),
            step('selection.uppercase-literal', 'create', 'handoverId', { body: { selectionIds: [ref('normalSelectionUppercaseId')] }, expected: expect(400, 'Set membership uses raw literal equality against returned canonical IDs; do not lowercase the request.') })
        ]
    },
    {
        name: 'read-write-and-guard-boundaries', source: [`${controller}:15-62`, source(1024, 1031), source(1468, 1495)],
        manualSetup: ['Root supplies logged-in sessions with exact roles above, plus an anonymous session; this module does not log in or alter permissions.', 'emptyHandoverId is fresh with real ordinary source attachments but no selections; handoverId has existing selections.'],
        steps: [
            step('guard.anonymous', 'checklist', 'handoverId', { role: 'anonymous', expected: expect(401, 'Session guard before service.') }),
            ...['checklist', 'refresh', 'create', 'get', 'download'].map(operation => step(`guard.lead-only.${operation}`, operation, ['get', 'download'].includes(operation) ? 'readyPackageId' : 'handoverId', { role: 'leadOnly', ...(['refresh', 'create'].includes(operation) ? { body: {} } : {}), expected: expect(403, 'K requires project permission; J any(customer,lead,project) policy must not leak into K.') })),
            step('guard.csrf', 'refresh', 'handoverId', { body: {}, csrf: false, expected: expect(403, 'Original CSRF guard before DTO/service.') }),
            step('reader.get', 'checklist', 'handoverId', { role: 'reader', expected: expect(200, 'project:read suffices.') }),
            step('reader.existing-create', 'create', 'handoverId', { role: 'reader', body: { selectionIds: [ref('normalSelectionId')] }, creates: ['download package/items/ZIP'], expected: expect(200, 'No implicit write permission check when selections already exist.') }),
            step('reader.empty-create', 'create', 'emptyHandoverId', { role: 'reader', body: {}, expected: expect(403, 'Read guard passes, nested refresh throws Missing project write permission; no package/object is created.') }),
            step('writer.refresh', 'refresh', 'handoverId', { role: 'writer', body: {}, expected: expect(200, 'project:write is sufficient for refresh; do not additionally require read.') }),
            step('foreign-reader.no-owner-gate', 'checklist', 'handoverId', { role: 'foreignReader', expected: expect(200, 'No owner restriction beyond original project:read.') })
        ]
    },
    {
        name: 'implicit-refresh-and-minimal-invalid-dto', source: [source(1024, 1031), 'libs/shared/contracts/src/lib/shared-contracts.ts:4268-4305'],
        manualSetup: ['A separate fresh implicitHandoverId with real ordinary sources, no selections; do not reuse the reader.empty-create case state blindly.'],
        steps: [
            step('dto.empty-selection-list', 'create', 'handoverId', { body: { selectionIds: [] }, expected: expect(400, 'Original Zod min(1), before service; no business creation.') }),
            step('dto.refresh-null-flag', 'refresh', 'handoverId', { body: { preserveManualExclusions: null }, expected: expect(400, 'Original boolean schema; no business creation.') }),
            step('create.implicit-refresh', 'create', 'implicitHandoverId', { body: {}, creates: ['selections', 'handover links', 'download package/items/ZIP'], expected: expect(200, 'Refresh and its audit commit before package generation; re-query selection IDs has no orderBy.') })
        ]
    },
    {
        name: 'package-ttl-lazy-state', source: [source(1133, 1167)],
        manualSetup: ['Root creates a real ready expiredPackageId and conditionally changes only its owned expires_at to a known past instant with durable before/fault proof.', 'Capture product outcomes before any fixture restoration; retain real expired transition until final owned cleanup.'],
        steps: [
            step('ttl.summary-before', 'get', 'expiredPackageId', { expected: expect(200, 'Still ready: status read does not enforce TTL or audit.') }),
            step('ttl.first-download', 'download', 'expiredPackageId', { expected: expect(409, 'Expired message, status=expired persisted before rejected expiry audit; count unchanged.') }),
            step('ttl.summary-after', 'get', 'expiredPackageId', { expected: expect(200, 'Now expired; reflects real committed transition.') }),
            step('ttl.second-download', 'download', 'expiredPackageId', { expected: expect(409, 'Not ready message, no second expiry transition/audit.') })
        ]
    },
    {
        name: 'exact-owned-generation-read-failure', source: [source(1104, 1130), source(1689, 1734)],
        manualSetup: ['Root installs a precise owned missing-file OR directory-read fault on the selected normal attachment, with original path/bytes/hash/restoration intent.', 'No DB/audit fault in this group; preserve raw failedReason and actual SQL, then restore exact file bytes/hash.'],
        steps: [
            step('failure.create-from-missing-source', 'create', 'handoverId', { body: { selectionIds: [ref('normalSelectionId')] }, creates: ['failed package and its items only if real commit certified'], bindBody: 'failedPackage', expected: expect(200, 'Generation catch saves failed package with the real storage Error.message; no forged ready/ZIP success.') }),
            step('failure.summary', 'get', 'failedPackageId', { expected: expect(200, 'Failed summary has original failedReason, preserved expiry/items and actual storage fields.') }),
            step('failure.failed-package-download', 'download', 'failedPackageId', { expected: expect(409, 'Not ready; no download count/audit.') })
        ]
    },
    {
        name: 'exact-owned-put-db-audit-faults', source: [source(1055, 1130), source(2180, 2189)],
        manualSetup: ['Run each step in an independent fresh package creation subcase; Root provides scoped closed intent, exact fault, and finally catalog/file restore.', 'put-failure: controlled real default provider rejects put. DB-failure: exact owned package INSERT CHECK rejects (not broad table poison). audit-failure: exact event/target audit CHECK rejects after business save.', 'Record response/PG/audit/object residual before restore; do not erase business outcomes or orphan ZIPs to make equality pass.'],
        steps: [
            step('failure.actual-put', 'create', 'handoverId', { manualFault: 'real-default-provider-put-rejection', body: { selectionIds: [ref('normalSelectionId')] }, expected: expect(200, 'Failed package with real put message; capture partial/absent object state without pretending atomic delete.') }),
            step('failure.package-insert', 'create', 'handoverId', { manualFault: 'exact-owned-package-insert-check', body: { selectionIds: [ref('normalSelectionId')] }, expected: expect(500, 'DB error is outside generation catch; capture real early running/items commits, final rollback and stored ZIP residual.') }),
            step('failure.created-audit', 'create', 'handoverId', { manualFault: 'exact-owned-created-audit-check', body: { selectionIds: [ref('normalSelectionId')] }, expected: expect(500, 'Separate audit failure must not roll back committed package/items or remove already stored ZIP.') })
        ]
    },
    {
        name: 'stored-package-read-failure-and-terminal-states', source: [source(1138, 1167)],
        manualSetup: ['Each ID is an actual created owned package. Root precisely faults only its registered ZIP or status/key with admission and restoration proof.', 'read failure: ready, unexpired package storage object missing/directory. missingKeyReadyPackageId: ready with storage_key null. failedPackageId/expiredPackageId preserve their real outcomes.'],
        steps: [
            step('failure.ready-missing-object', 'download', 'missingObjectPackageId', { expected: { behavior: 'Capture Native status/raw typed message as authority; open failure occurs before counter/save/audit. Do not assume every storage failure is 404.' } }),
            step('failure.ready-directory-GET', 'download', 'directoryPackageId', { expected: expect(400, 'Shared binary early read error; source open/count/audit already succeeded. Exact MIME/cache/length/ETag and raw message must match Native.'), binary: true }),
            step('failure.ready-directory-HEAD', 'download', 'directoryPackageId', { method: 'HEAD', expected: expect(400, 'Same original handler effects and error headers, empty body; retain each actual counter/audit.'), binary: true }),
            step('failure.ready-no-key', 'download', 'missingKeyReadyPackageId', { expected: expect(409, 'Not ready despite persisted ready status; no open/count/audit.') })
        ]
    },
    {
        name: 'real-r4-facts-consumption-without-new-gates', source: [source(1468, 1539), 'docs/design/rust-r2kr4/facts-route-input.md:4'],
        manualSetup: ['Root alone establishes remapped original named prepared-state recipe, then actual Nest confirm and optional receipt freeze; keeps producer HTTP/SQL/summary/confirmation facts separate from Rust K delivery.', 'draftHandoverId and confirmedHandoverId are real rows with genuine sources; K only reads id/projectId. No fake handover success and no new EvidenceFact product API.'],
        steps: [
            step('facts.draft-readable', 'checklist', 'draftHandoverId', { expected: expect(200, 'No confirmed/freeze gate in original K.') }),
            step('facts.confirmed-consumed', 'refresh', 'confirmedHandoverId', { body: {}, creates: ['selections and links tied to actual confirmed source row'], expected: expect(200, 'Real four-getter source consumption; does not certify a Rust R4 confirmation command.') }),
            step('facts.missing-handover', 'checklist', 'missingHandoverId', { expected: expect(404, 'Project handover not found before project lookup.') }),
            step('facts.missing-package', 'get', 'missingPackageId', { expected: expect(404, 'Package lookup precedes handover/project service checks.') })
        ]
    },
    {
        name: 'default-switch-retains-old-package-location', source: [source(1104, 1115), source(1853, 1870)],
        manualSetup: ['Root creates real local OR controlled-loopback OBS ready package, records exact provider/bucket/key and archive hash.', 'Root switches global default through real existing provider API with prior-state restore proof; old config stays available or disabled as original read authority permits. Never change stored package location.'],
        steps: [step('location.old-package-download', 'download', 'beforeDefaultSwitchPackageId', { binary: true, expected: expect(200, 'Reads stored location with identical archive hash, without reselecting the new default.') })]
    }
]);

function resolveValue(value, bindings) {
    if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 1 && Object.hasOwn(value, '$ref')) {
        assert(Object.hasOwn(bindings, value.$ref), 'Root binding missing: ' + value.$ref);
        return bindings[value.$ref];
    }
    if (Array.isArray(value)) return value.map(value => resolveValue(value, bindings));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, value]) => [key, resolveValue(value, bindings)]));
    return value;
}

export function requestDescription(step, bindings) {
    const input = resolveValue({ operationId: step.operationId, id: step.id, ...(Object.hasOwn(step, 'body') ? { body: step.body } : {}) }, bindings);
    const request = describeRequest(input);
    const options = {
        ...(Object.hasOwn(request, 'body') ? { json: request.body } : {}),
        ...(step.rawHeaders ? { rawHeaders: step.rawHeaders } : {}),
        ...(Object.hasOwn(step, 'csrf') ? { csrf: step.csrf } : {})
    };
    return { method: step.method ?? request.method, route: request.path, options };
}

export function createKCaller(sessions, { send } = {}) {
    assert.equal(typeof send, 'function', 'Root must provide its admitted fixture request wrapper; no automatic HTTP dispatch');
    return async function call(step, bindings) {
        const session = sessions[step.role ?? 'admin'];
        assert(session && typeof session.request === 'function', 'Root must supply the already logged-in NavigationHttpSession');
        const { method, route, options } = requestDescription(step, bindings);
        // Root's send owns preintent/admission/actual dispatch/commit certificates/reporting.
        return send(session, method, route, options, step);
    };
}

if (process.argv.includes('--check')) {
    const steps = scenarios.flatMap(group => group.steps), names = new Set();
    const bindings = {};
    function bind(value) { if (value && typeof value === 'object') { if (Object.keys(value).length === 1 && Object.hasOwn(value, '$ref')) bindings[value.$ref] = value.$ref.includes('Version') ? 1 : 'a0000000-0000-4000-8000-000000000001'; else Object.values(value).forEach(bind); } }
    for (const group of scenarios) { assert(group.source.length && group.manualSetup.length); for (const value of group.steps) { assert(!names.has(value.name)); names.add(value.name); bind(value); } }
    for (const step of steps) { const request = requestDescription(step, bindings); assert(request.route.startsWith('/api/')); assert(['GET', 'POST', 'HEAD'].includes(request.method)); }
    assert.throws(() => createKCaller({}), /fixture request wrapper/);
    console.log(JSON.stringify({ scope: 'pure K business matrix/request materialization only; no HTTP/PG/fixture writes', scenarios: scenarios.length, requests: steps.length, bindings: Object.keys(bindings).length }));
}
