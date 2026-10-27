import assert from 'node:assert/strict';
import http from 'node:http';

export const responseHeaderNames = ['content-type', 'content-length', 'content-security-policy', 'x-content-type-options', 'allow', 'transfer-encoding'];

export function wireRequest(session, method, route, options = {}) {
    const origin = new URL(session.origin);
    assert(origin.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname));
    assert(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].includes(method));
    assert(/^\/(?:api|%61pi)\//i.test(route) && !/[\r\n#]/.test(route), 'Only explicit raw API spelling probes are admitted');
    const headers = ['Host', origin.host, 'User-Agent', session.identity.userAgent, 'X-Request-Id', session.identity.requestId];
    if (session.cookies.size) headers.push('Cookie', [...session.cookies].map(([key, value]) => `${key}=${value}`).join('; '));
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && options.csrf !== false && session.cookies.has('poms_csrf')) headers.push('X-CSRF-Token', typeof options.csrf === 'string' ? options.csrf : session.cookies.get('poms_csrf'));
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
    return { origin: origin.origin, options: { method, path: route, headers, timeout: 20000 }, body };
}

// No URL construction for the route: Express's raw spelling policy is tested
// before percent-decoding. Credential and Set-Cookie bytes never enter reports.
export async function requestWire(session, method, route, options = {}) {
    const wire = wireRequest(session, method, route, options);
    const response = await new Promise((resolve, reject) => {
        const request = http.request(wire.origin, wire.options, (result) => {
            const chunks = [];
            let length = 0;
            result.on('data', (chunk) => {
                length += chunk.length;
                if (length > 2 * 1024 * 1024) request.destroy(new Error('R2C response exceeded limit'));
                else chunks.push(chunk);
            });
            result.on('error', () => reject(new Error('R2C response failed')));
            result.on('end', () => {
                try {
                    const text = Buffer.concat(chunks).toString('utf8');
                    const headers = Object.fromEntries(responseHeaderNames.filter((name) => result.headers[name] !== undefined).map((name) => [name, result.headers[name]]));
                    const contentType = result.headers['content-type'] ?? '';
                    if (method === 'HEAD') assert.equal(length, 0);
                    else if (headers['content-length'] !== undefined) assert.equal(Number(headers['content-length']), length, 'Response Content-Length must match its actual bytes');
                    resolve({ status: result.statusCode, body: text ? (contentType.includes('application/json') ? JSON.parse(text) : text) : null, bodyByteLength: length, contentType, headers, setCookie: result.headers['set-cookie'] ?? [] });
                } catch {
                    reject(new Error('R2C response representation invalid'));
                }
            });
        });
        request.on('timeout', () => request.destroy(new Error('R2C HTTP timeout')));
        request.on('error', () => reject(new Error('R2C HTTP request failed')));
        request.end(wire.body);
    });
    for (const cookie of response.setCookie) {
        const pair = cookie.split(';', 1)[0],
            index = pair.indexOf('=');
        if (index < 1) continue;
        const name = pair.slice(0, index),
            value = pair.slice(index + 1);
        if (value) session.cookies.set(name, value);
        else session.cookies.delete(name);
    }
    return response;
}
