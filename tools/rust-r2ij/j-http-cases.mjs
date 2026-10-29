// Input construction for Root's real HTTP runner. No requests, writes, fixture
// creation or database access. Unrepresentable finite Zod cases stay in j-golden.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const readJson = relative => JSON.parse(readFileSync(new URL(relative, import.meta.url), 'utf8'));
const source = readJson('./j-source.json');
const corpus = readJson('./j-golden.json');
const openapi = readJson('./j-openapi.json');
const operations = source.operations;
const defaultIds = Object.freeze({
    sessionId: '96000000-0000-4000-8000-000000000001',
    attachmentId: '96000000-0000-4000-8000-000000000002',
    linkId: '96000000-0000-4000-8000-000000000003',
    targetId: '96000000-0000-4000-8000-000000000004'
});

export const operationIds19 = Object.freeze(operations.map(row => row.operationId));

function concretePath(row, ids = defaultIds) {
    const id = row.path.startsWith('/api/attachment-upload-sessions') ? ids.sessionId : ids.attachmentId;
    return row.path.replace('{id}', encodeURIComponent(id)).replace('{linkId}', encodeURIComponent(ids.linkId));
}

/** All 19 actual routes. `access` is read/write; write bodies are valid JSON
 * syntax {}, or zero octet-stream bytes. Guard failures must precede DTO/domain
 * decisions; these bodies are not assertions of successful business commands. */
export function guardCases(ids = {}) {
    const actual = { ...defaultIds, ...ids };
    for (const key of Object.keys(defaultIds)) assert.equal(typeof actual[key], 'string', `${key} must be text`);
    return operations.map(row => {
        const access = row.method === 'GET' ? 'read' : 'write';
        let path = concretePath(row, actual);
        if (row.operationId === 'AttachmentController_list') {
            path += '?' + new URLSearchParams({ targetType: 'customer', targetId: actual.targetId });
        }
        return {
            name: `J guard ${row.operationId}`,
            method: row.method,
            path,
            canonicalPath: row.path,
            operationId: row.operationId,
            access,
            anyPermissions: ['customer', 'lead', 'project'].map(domain => `${domain}:${access}`),
            ...(row.method === 'PUT'
                ? { rawBody: Buffer.alloc(0), contentType: 'application/octet-stream' }
                : access === 'write'
                    ? { rawBody: '{}', contentType: 'application/json' }
                    : {})
        };
    });
}

const requestOperations = Object.freeze({
    AttachmentListQuery: 'AttachmentController_list',
    CreateAttachmentUploadSessionRequest: 'AttachmentUploadSessionController_create',
    CreateAttachmentUploadTargetRequest: 'AttachmentUploadSessionController_createUploadTarget',
    CompleteAttachmentUploadSessionRequest: 'AttachmentUploadSessionController_complete',
    AbortAttachmentUploadSessionRequest: 'AttachmentUploadSessionController_abort',
    UpdateAttachmentRequest: 'AttachmentController_update',
    MarkAttachmentFinalRequest: 'AttachmentController_markFinal',
    ClearAttachmentFinalRequest: 'AttachmentController_clearFinal',
    VoidAttachmentRequest: 'AttachmentController_void',
    CreateAttachmentLinkRequest: 'AttachmentController_link'
});

function jsonContainer(raw) {
    if (typeof raw !== 'string') return undefined;
    const value = JSON.parse(raw);
    return value !== null && typeof value === 'object' ? value : undefined;
}

function stringQuery(value) {
    if (Array.isArray(value) || value === undefined) return undefined;
    if (!Object.values(value).every(item => typeof item === 'string')) return undefined;
    const query = new URLSearchParams();
    for (const [key, item] of Object.entries(value)) query.append(key, item);
    const encoded = query.toString();
    const decoded = new URLSearchParams(encoded);
    // URLSearchParams replaces lone UTF-16 surrogates. Such finite inputs cannot
    // be claimed as identical real query values, even if errors would look alike.
    if (Object.entries(value).some(([key, item]) => decoded.get(key) !== item)) return undefined;
    return encoded;
}

/** Only original failing object/array bodies that Express's strict JSON parser
 * can deliver to Zod. Query cases are original scalar-string objects with an
 * exact URL encoding round trip; absent root/primitive/typed/nested cases remain
 * finite schema evidence and are deliberately not HTTP validation assertions. */
export function validationCases() {
    const result = [];
    for (const [index, item] of corpus.cases.entries()) {
        if (item.expected.success) continue;
        const operationId = requestOperations[item.schema];
        assert(operationId, `Unmapped original J schema ${item.schema}`);
        const row = operations.find(operation => operation.operationId === operationId);
        assert(row, operationId);
        const value = jsonContainer(item.inputRaw);
        if (value === undefined) continue;
        const expected = item.expected.response;
        assert.equal(expected.statusCode, 400);
        assert.equal(expected.message, 'Validation failed');
        assert(Array.isArray(expected.errors), `Missing original issues: ${item.schema}/${item.name}`);
        let path = concretePath(row);
        let request;
        if (item.schema === 'AttachmentListQuery') {
            const query = stringQuery(value);
            if (query === undefined) continue;
            if (query) path += '?' + query;
            request = { inputKind: 'string-query' };
        } else {
            request = { inputKind: 'json-body', rawBody: item.inputRaw, contentType: 'application/json' };
        }
        result.push({
            name: `J DTO ${index} ${item.schema} ${item.name}`,
            schema: item.schema,
            sourceCase: item.name,
            sourceIndex: index,
            operationId,
            method: row.method,
            path,
            canonicalPath: row.path,
            ...request,
            status: 400,
            body: structuredClone(expected)
        });
    }
    return result;
}

function verify() {
    assert.equal(corpus.cases.length, 660);
    assert.equal(operationIds19.length, 19);
    assert.equal(new Set(operationIds19).size, 19);
    assert.equal(new Set(operations.map(row => `${row.method} ${row.path}`)).size, 19);
    const full = readJson('../../libs/shared/api-spec/openapi.json');
    const inventory = readJson('../../docs/design/rust-r2-operation-slices.json').operations.filter(row => row.slice === 'RUST-R2J');
    assert.equal(inventory.length, 19);
    for (const row of operations) {
        assert.equal(openapi.paths[row.path]?.[row.method.toLowerCase()]?.operationId, row.operationId);
        assert.deepEqual(openapi.paths[row.path][row.method.toLowerCase()], full.paths[row.path][row.method.toLowerCase()]);
        const canonical = inventory.find(item => item.method === row.method && item.path === row.path && item.operationId === row.operationId);
        assert(canonical, row.operationId);
        assert.equal(canonical.canonicalInventoryStatus, 'canonical-match');
    }
    const guards = guardCases();
    assert.equal(guards.length, 19);
    assert.equal(new Set(guards.map(row => `${row.method} ${row.path}`)).size, 19);
    for (const row of guards) {
        assert(!row.path.includes('{'));
        if (row.method === 'PUT') assert.equal(row.rawBody.byteLength, 0);
        else if (row.access === 'write') assert.equal(row.rawBody, '{}');
        else assert.equal(row.rawBody, undefined);
    }
    const validation = validationCases();
    const counts = { 'json-body': 0, 'string-query': 0 };
    for (const row of validation) {
        counts[row.inputKind]++;
        const original = corpus.cases[row.sourceIndex];
        assert.deepEqual(row.body, original.expected.response);
        if (row.inputKind === 'json-body') {
            assert.notEqual(jsonContainer(row.rawBody), undefined);
            const expectedRef = `#/components/schemas/${row.schema}`;
            assert.equal(openapi.paths[row.canonicalPath][row.method.toLowerCase()].requestBody.content['application/json'].schema.$ref, expectedRef);
        } else {
            assert.equal(row.method, 'GET');
            assert.equal(row.rawBody, undefined);
            assert.deepEqual(Object.fromEntries(new URL(row.path, 'http://case.invalid').searchParams), jsonContainer(original.inputRaw));
        }
    }
    assert(counts['json-body'] > 0 && counts['string-query'] > 0);
    return { sourceHead: source.sourceHead, operationIds: 19, canonicalMatches: 19, guardCases: 19, finiteCases: 660, validationCases: validation.length, counts, requestsSent: 0, writes: 0 };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(verify()));
