// Root-only launcher. Transparent same-origin proxy; no fake API or fixture data.
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { isIP } from 'node:net';
import { createHash } from 'node:crypto';

const backend = process.argv[2], buildTag = process.argv[3], requestedContext = process.argv[4];
assert(['nest', 'rust'].includes(backend) && /^[a-z0-9-]{1,30}$/.test(buildTag ?? '') && process.argv.length === 5);
const root = path.resolve(`dist/tools/rust-r2k-k-ui-host-${buildTag}/browser`);
assert(fs.lstatSync(root).isDirectory() && !fs.lstatSync(root).isSymbolicLink());
const contextRoot = path.resolve('tmp/rust-r2k'), contextFile = path.resolve(requestedContext);
assert(contextFile.startsWith(contextRoot + path.sep) && contextFile.endsWith('.json'));
assert(!/(?:^|[\\/])(?:private|secrets|ROOT-CHECKPOINT\.md)(?:[\\/]|$)/i.test(contextFile));
let ancestor = path.parse(contextFile).root;
for (const part of contextFile.slice(ancestor.length).split(path.sep).filter(Boolean)) {
    ancestor = path.join(ancestor, part); assert(!fs.lstatSync(ancestor).isSymbolicLink());
}
assert(fs.lstatSync(contextFile).isFile());
const contextBytes = fs.readFileSync(contextFile), context = JSON.parse(contextBytes);
assert.deepEqual(Object.keys(context).sort(), ['backend', 'backendPort', 'correlationId', 'formatVersion', 'forwardedIP', 'origin', 'requestId', 'userAgent'].sort());
assert.equal(context.formatVersion, 1); assert.equal(context.backend, backend);
assert(Number.isInteger(context.backendPort) && context.backendPort >= 1024 && context.backendPort <= 65535 && context.backendPort !== 8800);
const parsedOrigin = new URL(context.origin);
assert.equal(parsedOrigin.protocol, 'http:'); assert.equal(parsedOrigin.hostname, '127.0.0.1');
assert.equal(parsedOrigin.port, String(context.backendPort));
assert.equal(parsedOrigin.pathname, '/'); assert(!parsedOrigin.search && !parsedOrigin.hash && !parsedOrigin.username && !parsedOrigin.password);
assert.equal(parsedOrigin.origin, context.origin);
for (const name of ['requestId', 'correlationId']) assert(typeof context[name] === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$/.test(context[name]));
assert(typeof context.userAgent === 'string' && context.userAgent.length > 0 && context.userAgent.length <= 512);
assert(typeof context.forwardedIP === 'string' && isIP(context.forwardedIP) !== 0);
const observabilityHeaders = {
    'x-request-id': context.requestId, 'user-agent': context.userAgent,
    'x-forwarded-for': context.forwardedIP, 'x-correlation-id': context.correlationId
};
for (const [name, value] of Object.entries(observabilityHeaders)) http.validateHeaderValue(name, value);
const contextSha256 = createHash('sha256').update(contextBytes).digest('hex'), upstream = context.origin;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.png': 'image/png', '.ico': 'image/x-icon' };

const server = http.createServer((request, response) => {
    if (request.url === '/api' || request.url.startsWith('/api/')) {
        const target = new URL(request.url, upstream); assert.equal(target.origin, upstream);
        const proxy = http.request(target, { method: request.method, headers: { ...request.headers, ...observabilityHeaders, host: target.host }, timeout: 25000 }, (actual) => {
            response.writeHead(actual.statusCode, actual.headers); actual.pipe(response);
            console.log(JSON.stringify({ method: request.method, path: target.pathname, status: actual.statusCode, upstream, contextSha256 }));
        });
        proxy.on('timeout', () => proxy.destroy());
        proxy.on('error', () => { if (!response.headersSent) { response.writeHead(502); response.end(); } else response.destroy(); });
        request.on('aborted', () => proxy.destroy()); response.on('close', () => { if (!response.writableEnded) proxy.destroy(); });
        request.pipe(proxy); return;
    }
    try {
        assert(['GET', 'HEAD'].includes(request.method));
        const url = new URL(request.url, 'http://127.0.0.1:8800');
        let file = path.resolve(root, '.' + decodeURIComponent(url.pathname)); assert(file === root || file.startsWith(root + path.sep));
        if (!fs.existsSync(file) || fs.lstatSync(file).isDirectory()) file = path.join(root, 'index.html');
        assert(fs.lstatSync(file).isFile() && !fs.lstatSync(file).isSymbolicLink());
        const bytes = fs.readFileSync(file);
        response.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream', 'Content-Length': bytes.length, 'Cache-Control': 'no-store' });
        response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch { response.writeHead(404); response.end(); }
});
server.listen(8800, '127.0.0.1', () => console.log(JSON.stringify({ ready: 'Original K-section host at loopback8800', backend, upstream, contextFile, contextSha256 })));
