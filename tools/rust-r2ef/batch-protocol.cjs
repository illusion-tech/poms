'use strict';
const { FixtureError, parseFixtureRequest } = require('./fixture-protocol.cjs');
function parseBatchRequest(bytes) {
    if (!Buffer.isBuffer(bytes) || bytes.length < 1 || bytes.length > 16384) throw new FixtureError('invalid_input_size');
    let request;
    try { request = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
    catch { throw new FixtureError('invalid_json'); }
    if(request?.action==='setting-absent'){
        const parsed=parseFixtureRequest(Buffer.from(JSON.stringify({...request,action:'facts'})));
        return Object.freeze({...parsed,action:'setting-absent'});
    }
    if (request?.action !== 'permissions') return parseFixtureRequest(bytes);
    if (!request || typeof request !== 'object' || Array.isArray(request) || Object.keys(request).some(k => !['formatVersion','runId','backend','action','account','permissions'].includes(k))) throw new FixtureError('invalid_request');
    parseFixtureRequest(Buffer.from(JSON.stringify({ ...request, action:'restore', permissions:undefined })));
    if (!Array.isArray(request.permissions) || request.permissions.length > 37 || request.permissions.some(p => typeof p !== 'string') || new Set(request.permissions).size !== request.permissions.length) throw new FixtureError('invalid_permissions');
    return Object.freeze(request);
}
module.exports = { parseBatchRequest };
