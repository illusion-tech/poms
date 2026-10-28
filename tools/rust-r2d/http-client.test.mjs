import assert from 'node:assert/strict';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { NavigationHttpSession } from './http-client.mjs';

test('actual HTTP/1.1 sends Host and preserves duplicate header lines', async () => {
    const received = [];
    const server = http.createServer((request, response) => {
        received.push({ host: request.headers.host, raw: request.rawHeaders, joined: request.headers['x-request-id'], forwardedFor: request.headers['x-forwarded-for'] });
        response.writeHead(request.url === '/api/missing' ? 404 : 200, { 'content-type': request.url === '/api/missing' ? 'text/html' : 'application/json' });
        response.end(request.url === '/api/missing' ? '<pre>Cannot GET /api/missing</pre>' : '{}');
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
        const authority = `127.0.0.1:${server.address().port}`;
        const client = new NavigationHttpSession(`http://${authority}`, randomUUID());
        const response = await client.request('GET', '/api/health', { requestId: null, rawHeaders: ['X-Request-Id', 'first', 'X-Request-Id', 'second'] });
        assert.equal(response.status, 200);
        assert.equal(received.length, 1);
        assert.equal(received[0].host, authority);
        assert.equal(received[0].forwardedFor, '192.0.2.25');
        assert.equal(received[0].raw.filter((header) => header === 'X-Forwarded-For').length, 1);
        assert.equal(received[0].joined, 'first, second');
        assert.equal(received[0].raw.filter((header) => header === 'X-Request-Id').length, 2);
        assert.deepEqual(response.body, {});
        const missing = await client.request('GET', '/api/missing');
        assert.equal(missing.status, 404);
        assert.equal(missing.contentType, 'text/html');
        assert.equal(missing.body, '<pre>Cannot GET /api/missing</pre>');
        assert.equal(received[1].forwardedFor, '192.0.2.25');
    } finally {
        await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
});
