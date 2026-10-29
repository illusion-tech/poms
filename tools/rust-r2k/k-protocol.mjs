// Shared finite request/source protocol. This module never sends HTTP or touches fixtures.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '../..');
const frozen = JSON.parse(readFileSync(resolve(root, 'docs/design/rust-r2k/k-sources.json'), 'utf8'));
export const version = 1;
export const operations = Object.freeze(frozen.operations.map(({ operationId, method, path, permission }) => Object.freeze({ operationId, method, path, permission })));
export const rustMethods = Object.freeze({
    AttachmentHandoverController_getChecklist: 'handover_checklist',
    AttachmentHandoverController_refreshChecklist: 'refresh_handover_checklist',
    AttachmentHandoverController_createDownloadPackage: 'create_handover_download_package',
    AttachmentHandoverController_getDownloadPackage: 'get_download_package',
    AttachmentHandoverController_downloadPackage: 'download_package'
});

export function request({ operationId, id, body }) {
    const operation = operations.find(operation => operation.operationId === operationId);
    assert(operation, 'Unknown K operation');
    assert.equal(typeof id, 'string', 'The original path capture is a plain string');
    const output = { operationId, method: operation.method, path: operation.path.replace('{id}', encodeURIComponent(id)), ...(body === undefined ? {} : { body }) };
    return output;
}

export const observations = Object.freeze({
    transport: ['status', 'headers', 'rawBodyBase64', 'streamOutcome'],
    persistence: ['before', 'after', 'auditRows', 'nativeSqlOrder', 'stepTimeBounds'],
    archive: ['wholeSha256', 'headersAndOffsets', 'entryNameBytes', 'entryCrc32', 'entryBytesSha256', 'rawManifestUtf8'],
    scope: 'Only actual K HTTP/service observations; callbacks may not manufacture API, PG, storage or producer success'
});

if (process.argv.includes('--check')) {
    assert.equal(operations.length, 5);
    assert.equal(new Set(operations.map(operation => operation.operationId)).size, 5);
    for (const operation of operations) assert(rustMethods[operation.operationId]);
    assert.equal(request({ operationId: operations[0].operationId, id: 'a/b' }).path.includes('a%2Fb'), true);
    console.log(JSON.stringify({ protocol: version, operations: operations.length, execution: 'pure request protocol assertions; no HTTP/PG/storage' }));
}
