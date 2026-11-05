// Real HTTP only. Cookies/passwords stay in the new namespace's private state.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';

export function createApiHarness({ tag = 'r4def32', edition = '32' } = {}) {
    assert.equal(process.platform, 'linux'); assert(/^[a-zA-Z0-9_-]{1,24}$/.test(tag));
    const win = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', priv = '/home/wangzishi/.local/share/poms-r4def/private';
    const root = '/home/wangzishi/projects/poms-rust-r4def', base = 'http://127.0.0.1:31341', origin = 'http://127.0.0.1:44451';
    const spec = JSON.parse(fs.readFileSync(win + '/libs/shared/api-spec/openapi.json'));
    const operations = new Map(); for (const [template, values] of Object.entries(spec.paths)) for (const [method, value] of Object.entries(values)) if (value.operationId) operations.set(value.operationId, { method: method.toUpperCase(), template, spec: value });
    const out = `${win}/tmp/rust-r4def/root/api${edition}`; fs.mkdirSync(out, { recursive: true });
    const stateFile = `${priv}/api-harness-${edition}.json`;
    const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile)) : { tag, edition, sequence: 0, actors: {} }; assert.equal(state.tag, tag);
    const persist = () => fs.writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 });
    function actorState(actor) { const key = actor?.key ?? actor?.id ?? actor; assert(typeof key === 'string' && key); if (!state.actors[key]) state.actors[key] = { key, cookies: {}, id: actor?.id ?? null, permissions: actor?.permissions ?? [] }; return state.actors[key]; }
    function safe(value, key = '') {
        if (/password|secret|accessToken|refreshToken|csrfToken|credential/i.test(key)) return '[private]';
        if (Array.isArray(value)) return value.map(v => safe(v)); if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, safe(v, k)])); return value;
    }
    async function request(operationId, id, body, actor, meta = {}) {
        const operation = operations.get(operationId); assert(operation, `Unknown current operation ${operationId}`);
        const a = actorState(actor); let concrete = operation.template;
        const placeholders = [...concrete.matchAll(/\{([^}]+)\}/g)].map(m => m[1]);
        for (const name of placeholders) { const value = typeof id === 'object' && id !== null ? id[name] : id; assert(typeof value === 'string' && value, `Missing real ${name} for ${operationId}`); concrete = concrete.replace('{' + name + '}', encodeURIComponent(value)); }
        if (meta.path) assert.equal(meta.path, concrete, 'Driver path must match the current canonical operation');
        if (meta.method) assert.equal(meta.method.toUpperCase(), operation.method);
        const url = new URL(base + concrete); for (const [key, value] of Object.entries(meta.query ?? {})) if (value !== undefined && value !== null) { if (Array.isArray(value)) value.forEach(v => url.searchParams.append(key, String(v))); else url.searchParams.set(key, String(value)); }
        const n = ++state.sequence, requestId = `${tag}-${String(n).padStart(5, '0')}-${randomUUID().slice(0, 8)}`;
        const headers = { Origin: origin, 'X-Request-Id': requestId };
        if (Object.keys(a.cookies).length) headers.Cookie = Object.entries(a.cookies).map(([k, v]) => k + '=' + v).join('; ');
        if (!['GET', 'HEAD', 'OPTIONS'].includes(operation.method) && a.cookies.poms_csrf && meta.csrf !== 'omit') headers['X-CSRF-Token'] = meta.csrf === 'wrong' ? 'deliberately-invalid-test-token' : decodeURIComponent(a.cookies.poms_csrf);
        let wireBody; if (body !== null && body !== undefined && !['GET', 'HEAD'].includes(operation.method)) { headers['Content-Type'] = 'application/json'; wireBody = JSON.stringify(body); }
        const startedAt = new Date().toISOString(); const response = await fetch(url, { method: operation.method, headers, body: wireBody, redirect: 'manual' });
        for (const cookie of response.headers.getSetCookie()) { const part = cookie.split(';', 1)[0], at = part.indexOf('='); if (at < 1) continue; const name = part.slice(0, at), value = part.slice(at + 1); if (/max-age=0/i.test(cookie)) delete a.cookies[name]; else a.cookies[name] = value; }
        const text = await response.text(); let value; try { value = text ? JSON.parse(text) : null; } catch { value = text; }
        const receiptId = `${String(n).padStart(5, '0')}-${operationId.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
        fs.writeFileSync(out + '/' + receiptId, JSON.stringify({ kind: 'actual-HTTP-receipt', startedAt, completedAt: new Date().toISOString(), operationId, method: operation.method, path: url.pathname, query: Object.fromEntries(url.searchParams), actorKey: a.key, actorId: a.id, requestId, requestBody: safe(body), status: response.status, responseBody: safe(value), responseContentType: response.headers.get('content-type'), secretsAndCookiesPublished: false }, null, 2) + '\n', { flag: 'wx' });
        persist(); return { status: response.status, body: value, receiptId: `tmp/rust-r4def/root/api${edition}/${receiptId}`, requestId };
    }
    // This shares the actual actor cookie jar, CSRF policy, sequence and persist
    // closure with JSON requests. Import never reads private state or sends HTTP.
    async function binaryRequest(operationId, id, bodyBytes, actor, meta = {}) {
        const binaryMethods = {
            AttachmentUploadSessionController_proxyUploadObject: 'PUT',
            AttachmentController_download: 'GET',
            AttachmentHandoverController_downloadPackage: 'GET'
        };
        assert(Object.hasOwn(binaryMethods, operationId), 'Binary operation must be a declared attachment PUT/download');
        const expectedMethod = binaryMethods[operationId];
        const operation = operations.get(operationId); assert(operation, `Unknown current operation ${operationId}`);
        assert.equal(operation.method, expectedMethod, 'Binary operation method must match current spec');
        assert(meta.csrf === undefined || meta.csrf === 'omit' || meta.csrf === 'wrong', 'CSRF metadata is only an omit/wrong test switch, never an injected token');
        assert(!Object.hasOwn(meta, 'headers') && !Object.hasOwn(meta, 'cookie') && !Object.hasOwn(meta, 'authorization'), 'Authentication headers come only from the actual private actor state');
        const a = actorState(actor); let concrete = operation.template;
        const placeholders = [...concrete.matchAll(/\{([^}]+)\}/g)].map(match => match[1]);
        for (const name of placeholders) {
            const value = typeof id === 'object' && id !== null ? id[name] : id;
            assert(typeof value === 'string' && value, `Missing real ${name} for ${operationId}`);
            concrete = concrete.replace('{' + name + '}', encodeURIComponent(value));
        }
        if (meta.path) assert.equal(meta.path, concrete, 'Driver path must match the current canonical operation');
        if (meta.method) assert.equal(meta.method.toUpperCase(), operation.method);
        const url = new URL(base + concrete);
        assert.equal(url.origin, base, 'Binary requests remain on the owned API origin');
        for (const [key, value] of Object.entries(meta.query ?? {})) if (value !== undefined && value !== null) {
            if (Array.isArray(value)) value.forEach(item => url.searchParams.append(key, String(item)));
            else url.searchParams.set(key, String(value));
        }
        const put = operation.method === 'PUT';
        if (put) {
            assert(bodyBytes instanceof Uint8Array, 'Proxy PUT requires actual Uint8Array bytes, not JSON/base64 text');
            assert(operation.spec.requestBody?.content?.['application/octet-stream'], 'Current spec must declare octet-stream PUT');
            if (meta.contentType !== undefined) assert.equal(meta.contentType, 'application/octet-stream');
        } else {
            assert(bodyBytes === null || bodyBytes === undefined, 'Binary GET has no request body');
            assert(meta.contentType === undefined, 'Binary GET does not invent a request content type');
        }
        const requestBody = put ? Buffer.from(bodyBytes) : Buffer.alloc(0);
        const editionKey = String(edition); assert(/^[a-zA-Z0-9_-]{1,24}$/.test(editionKey), 'Bounded binary receipt edition required');
        const privateStat = fs.lstatSync(priv);
        assert(privateStat.isDirectory() && !privateStat.isSymbolicLink(), 'Only the owned new-namespace private directory may preserve binary originals');
        const privateRoot = fs.realpathSync(priv); assert.equal(privateRoot, path.resolve(priv), 'Private namespace must not resolve through a redirected path');
        const privateBinary = path.join(privateRoot, `binary-api${editionKey}`);
        if (!fs.existsSync(privateBinary)) fs.mkdirSync(privateBinary, { mode: 0o700 });
        const binaryStat = fs.lstatSync(privateBinary);
        assert(binaryStat.isDirectory() && !binaryStat.isSymbolicLink() && fs.realpathSync(privateBinary) === privateBinary, 'Binary preservation directory must remain directly inside the new private root');
        assert(Number.isSafeInteger(state.sequence) && state.sequence >= 0 && state.sequence < Number.MAX_SAFE_INTEGER, 'Actual shared receipt sequence must be valid');
        const n = ++state.sequence, requestId = `${tag}-${String(n).padStart(5, '0')}-${randomUUID().slice(0, 8)}`;
        const slug = operationId.replace(/[^a-zA-Z0-9_-]/g, '_');
        const prefix = `${String(n).padStart(5, '0')}-${slug}-${requestId}`;
        const receiptName = `${String(n).padStart(5, '0')}-${slug}.json`;
        const receiptId = `tmp/rust-r4def/root/api${edition}/${receiptName}`;
        const digest = value => createHash('sha256').update(value).digest('hex');
        const artifact = (file, bytes) => ({ file, bytes: bytes.length, rawBytesSha256: digest(bytes) });
        const savePrivate = (suffix, value) => {
            const file = path.join(privateBinary, prefix + suffix), bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
            assert.equal(path.dirname(file), privateBinary);
            fs.writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 }); return artifact(file, bytes);
        };
        const headers = { Origin: origin, 'X-Request-Id': requestId, 'Accept-Encoding': 'identity' };
        if (Object.keys(a.cookies).length) headers.Cookie = Object.entries(a.cookies).map(([key, value]) => key + '=' + value).join('; ');
        if (put && a.cookies.poms_csrf && meta.csrf !== 'omit') headers['X-CSRF-Token'] = meta.csrf === 'wrong' ? 'deliberately-invalid-test-token' : decodeURIComponent(a.cookies.poms_csrf);
        if (put) headers['Content-Type'] = 'application/octet-stream';
        const startedAt = new Date().toISOString();
        const originals = {
            requestHeaders: savePrivate('-request-config-original.json', JSON.stringify({ method: operation.method, url: url.href, headers }, null, 2) + '\n'),
            requestBody: savePrivate('-request-body-original.bin', requestBody)
        };
        const responseFile = path.join(privateBinary, prefix + '-response-body-original.bin');
        let response, responseBytes = Buffer.alloc(0), actualHeaders = {}, headerCount = 0, responseComplete = false, failure;
        let responseDescriptor;
        // Reserve the same sequence before I/O. A failed transport must not let
        // a later fresh process reuse an already attempted binary receipt slot.
        persist();
        try {
            response = await fetch(url, { method: operation.method, headers, body: put ? requestBody : undefined, redirect: 'manual' });
            const headerPairs = [...response.headers], setCookies = response.headers.getSetCookie();
            headerCount = headerPairs.length;
            originals.responseHeaders = savePrivate('-response-headers-original.json', JSON.stringify({ entries: headerPairs, setCookie: setCookies }, null, 2) + '\n');
            for (const cookie of setCookies) {
                const part = cookie.split(';', 1)[0], at = part.indexOf('='); if (at < 1) continue;
                const name = part.slice(0, at), value = part.slice(at + 1);
                if (/max-age=0/i.test(cookie)) delete a.cookies[name]; else a.cookies[name] = value;
            }
            // Return only selected actual non-auth header values; no defaults.
            for (const key of ['content-type', 'content-length', 'content-disposition', 'cache-control', 'etag', 'last-modified', 'content-encoding', 'x-request-id']) {
                const value = response.headers.get(key); if (value !== null) actualHeaders[key] = value;
            }
            responseDescriptor = fs.openSync(responseFile, 'wx', 0o600);
            if (response.body) for await (const chunk of response.body) {
                const bytes = Buffer.from(chunk); let offset = 0;
                while (offset < bytes.length) {
                    const written = fs.writeSync(responseDescriptor, bytes, offset, bytes.length - offset);
                    assert(written > 0, 'Binary original write made no progress'); offset += written;
                }
            }
            responseComplete = true;
        } catch (error) {
            failure = error;
            originals.failure = savePrivate('-failure-original.json', JSON.stringify({ name: error?.name ?? 'Error', message: error?.message ?? String(error), stack: error?.stack ?? null, responseStatus: response?.status ?? null, responseBodyComplete: false }, null, 2) + '\n');
        } finally {
            if (responseDescriptor !== undefined) fs.closeSync(responseDescriptor);
            if (responseDescriptor !== undefined) {
                responseBytes = fs.readFileSync(responseFile);
                originals.responseBody = artifact(responseFile, responseBytes);
            }
            persist();
        }
        // Public index contains no request/response payload, cookies, CSRF,
        // password, header values or exception text. Originals are private only.
        fs.writeFileSync(out + '/' + receiptName, JSON.stringify({
            kind: 'actual-binary-HTTP-receipt', startedAt, completedAt: new Date().toISOString(), operationId,
            method: operation.method, path: url.pathname, actorKey: a.key, actorId: a.id, requestId,
            queryCount: [...url.searchParams].length, querySha256: digest(url.search),
            status: response?.status ?? null, responseComplete, transportFailure: Boolean(failure),
            requestHasBody: put, requestBytes: requestBody.length, requestSha256: digest(requestBody),
            responseBytes: responseBytes.length, responseSha256: originals.responseBody?.rawBytesSha256 ?? null,
            requestHeaderCount: Object.keys(headers).length, responseHeaderCount: headerCount, originals,
            bodyByteBoundary: 'Configured request body and WHATWG Fetch-delivered response body; transport wire bytes are not captured. Actual content-encoding headers remain private.',
            secretsCookiesHeadersAndPayloadPublished: false
        }, null, 2) + '\n', { flag: 'wx' });
        if (failure) {
            const error = new Error(`Binary HTTP transport/read failed; reconcile actual receipt ${receiptId}`);
            error.receiptId = receiptId; error.requestId = requestId; error.status = response?.status ?? null; throw error;
        }
        let body = null;
        if (put || /(?:^|\/)json(?:\s*;|$)|\+json(?:\s*;|$)/i.test(actualHeaders['content-type'] ?? '')) {
            const text = responseBytes.toString('utf8'); try { body = text ? JSON.parse(text) : null; } catch { body = text; }
        }
        return { status: response.status, body, bytes: new Uint8Array(responseBytes), headers: actualHeaders, contentType: actualHeaders['content-type'] ?? null, receiptId, requestId };
    }
    async function login({ key, username, password }) {
        const actor = actorState(key); actor.username = username;
        actor.cookies = {}; // A deliberate fresh login must not send an expired session cookie.
        const csrf = await request('AuthController_getCsrfToken', null, null, key); assert.equal(csrf.status, 200, 'CSRF bootstrap failed');
        const response = await request('AuthController_createPasswordAuthSession', null, { username, password }, key); assert.equal(response.status, 200, `Real login failed: ${response.status}`);
        const current = await request('AuthController_getCurrentAuthSession', null, null, key); assert.equal(current.status, 200);
        const data = current.body?.data ?? current.body; const user = data.user ?? data.currentUser ?? data;
        const id = user.id ?? user.userId ?? user.sub; assert(typeof id === 'string', 'Real session user ID missing');
        const permissions = user.permissions ?? data.permissions; assert(Array.isArray(permissions), 'Real session permission array missing');
        actor.id = id; actor.permissions = permissions; persist(); return { key, id, username, permissions };
    }
    function actor(key) { const a = actorState(key); return { key: a.key, id: a.id, username: a.username, permissions: a.permissions }; }
    return { root, win, priv, base, origin, out, spec, operations, request, binaryRequest, login, actor, persist, stateFile };
}
