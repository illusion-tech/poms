// Command input blueprint only. Root executes HTTP, permission fixtures and
// comparisons, and supplies each actual parsed response through generator.next().
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const targetTypes = ['customer', 'lead', 'project', 'contract', 'sales-follow-up', 'project-handover'];
const reads = ['customer:read', 'lead:read', 'project:read'];
const adminKeys = [...reads, 'customer:write', 'lead:write', 'project:write', 'contract:finance:sensitive:read'];
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function id(value, label) { assert.equal(typeof value, 'string', label); assert(idPattern.test(value), `${label}: Root must provide an actual fixture UUID`); return value; }
const enc = value => encodeURIComponent(value);
const path = value => `/api/attachments/${enc(value)}`;

function attachment(ref, label, targets) {
    assert(ref && typeof ref === 'object', `Missing ${label} actual attachment reference`);
    const first = ref.links?.[0];
    const value = {
        id: id(ref.id ?? ref.attachmentId, `${label}.id`),
        linkId: id(ref.linkId ?? first?.id, `${label}.linkId`),
        targetType: ref.targetType ?? first?.targetType,
        targetId: ref.targetId ?? first?.targetId,
        relationType: ref.relationType ?? first?.relationType ?? 'normal'
    };
    assert(targetTypes.includes(value.targetType), `${label}.targetType must describe its actual original link`);
    id(value.targetId, `${label}.targetId`);
    assert.equal(value.targetId.toLowerCase(), targets[value.targetType].toLowerCase(), `${label}: original target must be one of the six real targets`);
    return value;
}
function request(name, method, url, json, expectedStatus = 200, session = 'admin', note) {
    return {
        name: `J command ${name}`, method, path: url, session,
        ...(json === undefined ? {} : { json, rawBody: JSON.stringify(json), contentType: 'application/json' }),
        ...(expectedStatus === 'native' ? { observeNative: true } : { expectedStatus }),
        ...(note ? { note } : {})
    };
}
function permissions(name, account, keys) {
    return { kind: 'fixture-permissions', name: `J permissions ${name}`, account, keys: [...keys] };
}
function bodyOf(response) {
    const value = response?.body ?? response?.json ?? response;
    return typeof value === 'string' ? JSON.parse(value) : value;
}
function writePermission(kind) {
    return kind === 'customer' || kind === 'lead' ? `${kind}:write` : kind === 'sales-follow-up' ? 'customer:write' : 'project:write';
}

/**
 * ctx contract (all references are Root-owned actual fixtures, not new objects):
 *   targets or targetIds: {customer,lead,project,contract,'sales-follow-up','project-handover'} UUIDs;
 *   png, txt: original successful first-version upload summaries, or
 *      {id,linkId,targetType,targetId,relationType:'normal'} with exactly one active original link;
 *   history: [olderId,newerId] or {olderId,newerId}; two legal active legacy
 *      versions in one group, both with real readable links, newer latest;
 *      Root inserts them through its isolated fixture SQL. No API version-success claim.
 *   categoryCode?: existing active dictionary code (default original seed demand);
 *   restorePermissions?: {admin:[...],viewer:[...]} for optional final fixture restores.
 * Admin/viewer are different actors; png/txt uploaders are admin. txt starts
 * normal/internal. Root journals every permission change and restores ownership.
 *
 * 33 HTTP inputs + 5 permission changes; optional restores make at most 40 steps.
 * Legacy multi-row final/void results are observed from native first. The known
 * create-version complete500 is already covered by Root critical acceptance;
 * this generator never creates or pretends to complete a successful API version.
 */
export function* commandCases(ctx) {
    assert(ctx && typeof ctx === 'object', 'Actual Root command context required');
    const supplied = ctx.targets ?? ctx.targetIds;
    assert(supplied && typeof supplied === 'object', 'Six actual targets required');
    const targets = Object.fromEntries(targetTypes.map(kind => [kind, id(supplied[kind], `targets.${kind}`)]));
    const png = attachment(ctx.png, 'png', targets), txt = attachment(ctx.txt, 'txt', targets);
    assert.notEqual(png.id, txt.id, 'PNG and TXT must be independent actual first versions');
    const older = id(Array.isArray(ctx.history) ? ctx.history[0] : ctx.history?.olderId, 'history.olderId');
    const newer = id(Array.isArray(ctx.history) ? ctx.history[1] : ctx.history?.newerId, 'history.newerId');
    assert.equal(new Set([png.id, txt.id, older, newer]).size, 4, 'The first uploads and legacy history must be isolated');
    const category = ctx.categoryCode ?? 'demand';
    assert.match(category, /^[a-z][a-z0-9-]*$/);

    yield permissions('admin-read-write-sensitive', 'admin', adminKeys);
    for (const kind of targetTypes) yield request(`list-${kind}`, 'GET', `/api/attachments?${new URLSearchParams({ targetType: kind, targetId: targets[kind] })}`);
    yield request('get-png', 'GET', path(png.id));
    yield request('legacy-two-version-history', 'GET', `${path(older)}/versions`, undefined, 200, 'admin', 'Two versions are actual SQL fixture history, not API version-creation evidence.');
    yield request('center', 'GET', '/api/attachment-center-records');

    yield request('metadata-empty-noop', 'PATCH', path(png.id), {});
    yield request('metadata-empty-description', 'PATCH', path(png.id), { description: '   ' });
    yield request('metadata-active-category', 'PATCH', path(png.id), { category });

    yield request('legacy-mark-newer-final', 'POST', `${path(newer)}:mark-final`, { note: 'J legacy final transfer' }, 'native', 'admin', 'Observe native multi-attachment UPDATE/partial-unique result before Rust comparison.');
    yield request('legacy-repeat-mark-newer-final', 'POST', `${path(newer)}:mark-final`, { note: 'J legacy repeat' }, 'native');
    yield request('legacy-clear-final', 'POST', `${path(newer)}:clear-final`, { reason: 'J clear final' });
    yield request('legacy-repeat-clear-final', 'POST', `${path(newer)}:clear-final`, { reason: 'J repeat clear final' });

    yield request('duplicate-original-link', 'POST', `${path(png.id)}/links`, { targetType: png.targetType, targetId: png.targetId, relationType: png.relationType });
    const linkedType = png.targetType === 'project' ? 'customer' : 'project';
    const newLinkRequest = { targetType: linkedType, targetId: targets[linkedType], relationType: 'evidence' };
    const newLinkResponse = yield request('new-link-real-target', 'POST', `${path(png.id)}/links`, newLinkRequest);
    const newLink = bodyOf(newLinkResponse)?.links?.find(link => link.targetType === linkedType && typeof link.targetId === 'string' && link.targetId.toLowerCase() === targets[linkedType].toLowerCase() && link.relationType === 'evidence' && link.status === 'active' && link.id !== png.linkId);
    const newLinkId = id(newLink?.id, 'Actual new-link response links[].id');
    yield request('duplicate-new-link', 'POST', `${path(png.id)}/links`, newLinkRequest);
    yield request('unlink-new-link', 'DELETE', `${path(png.id)}/links/${enc(newLinkId)}`);

    yield permissions('viewer-read-only', 'viewer', reads);
    yield request('metadata-sensitive', 'PATCH', path(txt.id), { securityLevel: 'sensitive' });
    yield request('viewer-sensitive-readable', 'GET', path(txt.id), undefined, 200, 'viewer', 'Original sensitive level is readable without extra sensitive-read permission.');
    yield request('metadata-confidential', 'PATCH', path(txt.id), { securityLevel: 'confidential' });
    yield request('viewer-confidential-denied', 'GET', path(txt.id), undefined, 403, 'viewer');
    yield permissions('viewer-sensitive-read', 'viewer', [...reads, 'contract:finance:sensitive:read']);
    yield request('viewer-confidential-allowed', 'GET', path(txt.id), undefined, 200, 'viewer');
    yield request('metadata-restore-internal', 'PATCH', path(txt.id), { securityLevel: 'internal' });

    yield permissions('viewer-write-only', 'viewer', [writePermission(txt.targetType)]);
    yield request('viewer-write-then-readback-403', 'PATCH', path(txt.id), { description: 'J write-only persisted description' }, 403, 'viewer', 'Write and audit commit before getAttachment rejects target read; compare PG/audit, not a guard-only403.');
    yield permissions('viewer-restore-read-only', 'viewer', reads);
    yield request('viewer-read-persisted-description', 'GET', path(txt.id), undefined, 200, 'viewer');

    yield request('unlink-last-real-link-then-403', 'DELETE', `${path(txt.id)}/links/${enc(txt.linkId)}`, undefined, 403, 'admin', 'Actual link becomes unlinked and audit commits; uploader has no readable-link bypass.');
    yield request('get-no-active-link-403', 'GET', path(txt.id), undefined, 403);
    yield request('uploader-void-without-readable-link', 'POST', `${path(txt.id)}:void`, { reason: 'J isolated TXT void' });
    yield request('repeat-void-conflict', 'POST', `${path(txt.id)}:void`, { reason: 'J repeat TXT void' }, 409);
    yield request('legacy-void-latest-fallback', 'POST', `${path(newer)}:void`, { reason: 'J legacy latest fallback' }, 'native', 'admin', 'Observe native CASE-update/partial-unique order. No idealized fallback-success assumption.');

    for (const account of ['viewer', 'admin']) if (ctx.restorePermissions?.[account]) yield permissions(`restore-${account}`, account, ctx.restorePermissions[account]);
}

function verifyConstruction() {
    // In-memory references and generator-resume data test construction only;
    // no business rows or API success are created or certified here.
    let sequence = 1;
    const fakeId = () => `97000000-0000-4000-8000-${String(sequence++).padStart(12, '0')}`;
    const targets = Object.fromEntries(targetTypes.map(kind => [kind, fakeId()]));
    const ref = () => ({ id: fakeId(), linkId: fakeId(), targetType: 'customer', targetId: targets.customer });
    const ctx = { targets, png: ref(), txt: ref(), history: [fakeId(), fakeId()], restorePermissions: { admin: adminKeys, viewer: reads } };
    const iterator = commandCases(ctx), all = [];
    let item = iterator.next();
    while (!item.done) {
        const row = item.value; all.push(row);
        const response = row.name === 'J command new-link-real-target'
            ? { body: { links: [{ id: fakeId(), targetType: 'project', targetId: targets.project, relationType: 'evidence', status: 'active' }] } }
            : undefined;
        item = iterator.next(response);
    }
    const http = all.filter(row => row.kind !== 'fixture-permissions');
    assert.equal(http.length, 33);
    assert.equal(all.length, 40);
    assert.equal(new Set(all.map(row => row.name)).size, all.length);
    assert(http.every(row => ['admin', 'viewer'].includes(row.session)));
    assert.equal(http.filter(row => row.observeNative).length, 3);
    assert(!http.some(row => row.path.includes('attachment-upload-sessions') || row.path.includes('{')));
    for (const row of http) if (row.json !== undefined) assert.deepEqual(JSON.parse(row.rawBody), row.json);
    return { constructionOnly: true, httpCases: http.length, permissionSteps: all.length - http.length, nativeObservationCases: 3, requestsSent: 0, databaseWrites: 0 };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(verifyConstruction()));
