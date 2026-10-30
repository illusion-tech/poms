// Derived from K's native flat-header client. No request is made on import.
// Cookies/credentials remain in memory; Root must redact CSRF token response
// bodies before putting HTTP observations in public evidence.
import assert from 'node:assert/strict';
import http from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { fixtureCredentials, fixtureRequestIdentity } = require('./fixture-protocol.cjs');

export class NavigationHttpSession {
    constructor(origin, runId) {
        const url = new URL(origin);
        assert(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname));
        assert(!url.username && !url.password && !url.search && !url.hash && url.pathname === '/');
        this.origin = url.origin; this.runId = runId; this.identity = fixtureRequestIdentity(runId); this.cookies = new Map(); this.userId = null;
    }
    async request(method, route, options = {}) {
        assert(typeof route === 'string' && route.startsWith('/api'));
        const url = new URL(route, this.origin); assert.equal(url.origin, this.origin);
        const headers = ['Host', url.host, 'User-Agent', this.identity.userAgent, 'X-Forwarded-For', '192.0.2.25'];
        if (options.requestId !== null) headers.push('X-Request-Id', options.requestId ?? this.identity.requestId);
        if (options.correlationId !== undefined) headers.push('X-Correlation-Id', options.correlationId);
        if (this.cookies.size) headers.push('Cookie', [...this.cookies].map(([key, value]) => key + '=' + value).join('; '));
        if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && options.csrf !== false && this.cookies.has('poms_csrf')) headers.push('X-CSRF-Token', typeof options.csrf === 'string' ? options.csrf : this.cookies.get('poms_csrf'));
        if (options.rawHeaders) headers.push(...options.rawHeaders);
        let body;
        if (Object.hasOwn(options, 'json')) { body = Buffer.from(JSON.stringify(options.json)); headers.push('Content-Type', 'application/json'); }
        else if (Object.hasOwn(options, 'body')) { body = Buffer.from(options.body); if (options.contentType) headers.push('Content-Type', options.contentType); }
        if (body) headers.push('Content-Length', String(body.length));
        headers.push('Connection', 'close');
        const response = await new Promise((resolve, reject) => {
            const request = http.request(url, { method, headers, timeout: 20000 }, (result) => {
                const chunks = []; let length = 0;
                result.on('data', (chunk) => { length += chunk.length; if (length > 4 * 1024 * 1024) request.destroy(new Error('HTTP response exceeded limit')); else chunks.push(chunk); });
                result.on('error', () => reject(new Error('HTTP response failed')));
                result.on('end', () => {
                    const bodyBytes = Buffer.concat(chunks), text = bodyBytes.toString('utf8'), contentType = result.headers['content-type'] ?? '';
                    let parsed = text || null, parseError = null;
                    if (text && contentType.includes('application/json')) { try { parsed = JSON.parse(text); } catch { parseError = 'invalid-json-response'; } }
                    resolve({ status: result.statusCode, body: parsed, bodyBytes, contentType, parseError, setCookie: result.headers['set-cookie'] ?? [] });
                });
            });
            request.on('timeout', () => request.destroy(new Error('HTTP request timeout')));
            request.on('error', () => reject(new Error('HTTP request failed'))); request.end(body);
        });
        for (const cookie of response.setCookie) {
            const pair = cookie.split(';', 1)[0], index = pair.indexOf('='); if (index < 1) continue;
            const name = pair.slice(0, index), value = pair.slice(index + 1); if (value) this.cookies.set(name, value); else this.cookies.delete(name);
        }
        return response;
    }
    async login(account) {
        assert.equal((await this.request('GET', '/api/auth/csrf-token')).status, 200);
        const response = await this.request('POST', '/api/auth/sessions', { json: fixtureCredentials(this.runId, account) });
        assert.equal(response.status, 200); assert.equal(response.body.authenticated, true);
        assert.equal(response.body.user.username, fixtureCredentials(this.runId, account).username);
        assert(/^[A-Za-z0-9_-]{43}$/.test(this.cookies.get('poms_session') ?? ''));
        this.userId = response.body.user.id; return response.body.permissions;
    }
}
