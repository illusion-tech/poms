import assert from 'node:assert/strict';
import http from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { fixtureCredentials, fixtureRequestIdentity } = require('./fixture-protocol.cjs');

// Native HTTP preserves duplicate request-header lines for the Nest/Rust witness.
// Tokens and credential bodies stay in memory and are never part of evidence.
export class NavigationHttpSession {
    constructor(origin, runId) {
        const url = new URL(origin);
        assert(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname));
        this.origin = url.origin;
        this.identity = fixtureRequestIdentity(runId);
        this.cookies = new Map();
        this.runId = runId;
        this.userId = null;
    }
    async request(method, route, options = {}) {
        assert(route.toLowerCase().startsWith('/api'));
        // Node's flat-header-array branch does not synthesize the HTTP/1.1 Host.
        // Equal controlled client identity despite IPv4-mapped listener differences.
        const headers = ['Host', new URL(this.origin).host, 'User-Agent', this.identity.userAgent, 'X-Forwarded-For', '192.0.2.25'];
        if (options.requestId !== null) headers.push('X-Request-Id', options.requestId ?? this.identity.requestId);
        if (options.correlationId !== undefined) headers.push('X-Correlation-Id', options.correlationId);
        if (this.cookies.size) headers.push('Cookie', [...this.cookies].map(([key, value]) => `${key}=${value}`).join('; '));
        if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && options.csrf !== false && this.cookies.has('poms_csrf')) headers.push('X-CSRF-Token', typeof options.csrf === 'string' ? options.csrf : this.cookies.get('poms_csrf'));
        if (options.rawHeaders) headers.push(...options.rawHeaders);
        let body;
        if (Object.hasOwn(options, 'json')) {
            body = Buffer.from(JSON.stringify(options.json));
            headers.push('Content-Type', 'application/json');
        } else if (Object.hasOwn(options, 'body')) {
            body = Buffer.from(options.body);
            if (options.contentType) headers.push('Content-Type', options.contentType);
        }
        if (body) headers.push('Content-Length', String(body.length));
        headers.push('Connection', 'close');
        const response = await new Promise((resolve, reject) => {
            const request = http.request(new URL(route, this.origin), { method, headers, timeout: 20000 }, (result) => {
                const chunks = [];
                let length = 0;
                result.on('data', (chunk) => {
                    length += chunk.length;
                    if (length > 2 * 1024 * 1024) request.destroy(new Error('HTTP response exceeded limit'));
                    else chunks.push(chunk);
                });
                result.on('error', () => reject(new Error('HTTP response failed')));
                result.on('end', () => {
                    try {
                        const bodyBytes = Buffer.concat(chunks);
                        const text = bodyBytes.toString('utf8');
                        const contentType = result.headers['content-type'] ?? '';
                        const binaryHeaders=Object.fromEntries(['content-disposition','cache-control','etag','last-modified','accept-ranges','content-range','transfer-encoding'].map(key=>[key,result.headers[key]??null]));
                        resolve({ status: result.statusCode, body: text ? (contentType.includes('application/json') ? JSON.parse(text) : text) : null, bodyBytes, binaryHeaders, contentType, contentLength: result.headers['content-length'] ?? null, location: result.headers.location ?? null, vary: result.headers.vary ?? null, setCookie: result.headers['set-cookie'] ?? [] });
                    } catch {
                        reject(new Error('Expected a JSON HTTP response'));
                    }
                });
            });
            request.on('timeout', () => request.destroy(new Error('HTTP request timeout')));
            request.on('error', () => reject(new Error('HTTP request failed')));
            request.end(body);
        });
        for (const cookie of response.setCookie) {
            const pair = cookie.split(';', 1)[0];
            const index = pair.indexOf('=');
            if (index < 1) continue;
            const name = pair.slice(0, index),
                value = pair.slice(index + 1);
            if (value) this.cookies.set(name, value);
            else this.cookies.delete(name);
        }
        return response;
    }
    async login(account) {
        const csrf = await this.request('GET', '/api/auth/csrf-token');
        assert.equal(csrf.status, 200, `R2L1_LOGIN_CSRF_STATUS_${csrf.status}`);
        const response = await this.request('POST', '/api/auth/sessions', { json: fixtureCredentials(this.runId, account) });
        assert.equal(response.status, 200, `R2L1_LOGIN_POST_STATUS_${response.status}_${String(response.body?.code ?? 'no-code')}`);
        assert.equal(response.body.authenticated, true);
        assert.equal(response.body.user.username, fixtureCredentials(this.runId, account).username);
        assert(/^[A-Za-z0-9_-]{43}$/.test(this.cookies.get('poms_session') ?? ''));
        this.userId = response.body.user.id;
        assert(/^[0-9a-f-]{36}$/.test(this.userId));
        return response.body.permissions;
    }
}
