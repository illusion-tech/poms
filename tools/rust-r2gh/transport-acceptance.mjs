import assert from 'node:assert/strict';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline';
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync, brotliCompressSync, deflateSync } from 'node:zlib';
const tag = process.argv[2];
assert.equal(process.argv.length, 3);
assert(/^[a-z0-9-]{1,35}$/.test(tag));
assert.equal(process.platform, 'linux');
const out = `tmp/rust-r2gh/transport-${tag}.json`,
    privateDir = `/home/wangzishi/.local/share/poms-r2gh/private/transport-${tag}`;
assert(!existsSync(out) && !existsSync(privateDir));
mkdirSync(privateDir, { mode: 0o700 });
const keyFile = join(privateDir, 'synthetic.key'),
    certFile = join(privateDir, 'synthetic.crt');
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', keyFile, '-out', certFile, '-subj', '/CN=localhost', '-addext', 'subjectAltName=IP:127.0.0.1,DNS:localhost', '-days', '1'], { stdio: 'ignore' });
chmodSync(keyFile, 0o600);
chmodSync(certFile, 0o600);
const sha = (value) => createHash('sha256').update(value).digest('hex'),
    probe = '/home/wangzishi/.local/share/poms-r2gh/target/debug/examples/provider_transport_probe';
const report = {
    formatVersion: 1,
    kind: 'original-axios-versus-Rust-real-HTTP-TLS-proxy',
    tag,
    node: process.version,
    probeSha256: sha(readFileSync(probe)),
    startedAt: new Date().toISOString(),
    result: 'pending',
    cases: [],
    requests: [],
    proxyRequests: [],
    boundary: 'Ephemeral loopback protocol fixture with synthetic TLS CA, real original axios1.20 and Rust reqwest0.13.5; no external vendor account or PG'
};
const handler = async (request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1'),
        chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const text = Buffer.concat(chunks).toString('utf8');
    let data = null;
    try {
        data = JSON.parse(text);
    } catch {}
    report.requests.push({
        method: request.method,
        path: url.pathname,
        query: [...url.searchParams],
        accept: request.headers.accept ?? null,
        userAgent: request.headers['user-agent'] ?? null,
        authorizationPresent: Boolean(request.headers.authorization)
    });
    if (url.pathname === '/timeout') {
        await new Promise((resolve) => setTimeout(resolve, 250));
        if (!response.destroyed) {
            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.end('{}');
        }
        return;
    }
    if (url.pathname === '/loop') {
        response.writeHead(302, { Location: '/loop' });
        response.end();
        return;
    }
    if (url.pathname === '/redirect') {
        response.writeHead(302, { Location: '/echo?redirected=1' });
        response.end();
        return;
    }
    if (url.pathname === '/invalid') {
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end('{invalid controlled json');
        return;
    }
    if (url.pathname === '/raw-json') {
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end('{"overflow":1e999,"lone":"\\ud800"}');
        return;
    }
    if (url.pathname === '/status') {
        response.writeHead(503, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ code: 99991672, msg: 'controlled denial', data: { sentinel: 'gh-synthetic' } }));
        return;
    }
    const payload = Buffer.from(JSON.stringify({ method: request.method, path: url.pathname, query: [...url.searchParams], body: data, accept: request.headers.accept ?? null, userAgent: request.headers['user-agent'] ?? null }));
    const compression = url.pathname.slice(1),
        encoded = compression === 'gzip' ? gzipSync(payload) : compression === 'br' ? brotliCompressSync(payload) : compression === 'deflate' ? deflateSync(payload) : payload;
    response.writeHead(200, { 'Content-Type': 'application/json', ...(encoded !== payload ? { 'Content-Encoding': compression } : {}) });
    response.end(encoded);
};
const server = http.createServer(handler),
    secure = https.createServer({ key: readFileSync(keyFile), cert: readFileSync(certFile) }, handler),
    proxy = http.createServer((request, response) => {
        report.proxyRequests.push({ kind: 'http', method: request.method, absoluteUrl: request.url });
        const target = new URL(request.url);
        const forwarded = http.request(target, { method: request.method, headers: request.headers }, (upstream) => {
            response.writeHead(upstream.statusCode, upstream.headers);
            upstream.pipe(response);
        });
        forwarded.on('error', () => {
            response.writeHead(502);
            response.end();
        });
        request.pipe(forwarded);
    });
const sockets = new Set();
proxy.on('connect', (request, socket, head) => {
    report.proxyRequests.push({ kind: 'connect', target: request.url });
    const [host, port] = request.url.split(':');
    assert(['127.0.0.1', 'localhost'].includes(host));
    const upstream = net.connect(Number(port), host, () => {
        socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        if (head.length) upstream.write(head);
        socket.pipe(upstream);
        upstream.pipe(socket);
    });
    for (const stream of [socket, upstream]) {
        sockets.add(stream);
        stream.on('close', () => sockets.delete(stream));
        stream.on('error', () => {
            socket.destroy();
            upstream.destroy();
        });
    }
});
for (const owned of [server, secure, proxy])
    await new Promise((resolve, reject) => {
        owned.once('error', reject);
        owned.listen(0, '127.0.0.1', resolve);
    });
const origin = 'http://127.0.0.1:' + server.address().port,
    tlsOrigin = 'https://127.0.0.1:' + secure.address().port,
    proxyOrigin = 'http://127.0.0.1:' + proxy.address().port;
const baseEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^((?:npm_config_)?(?:http|https|all|no)_proxy|npm_config_proxy|NODE_EXTRA_CA_CERTS|NODE_TLS_REJECT_UNAUTHORIZED|NODE_OPTIONS)$/i.test(key)));
const normal = (value) => JSON.parse(JSON.stringify(value, (_key, item) => (typeof item === 'number' && !Number.isFinite(item) ? { $number: String(item) } : item)));
function worker(input) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, ['tools/rust-r2gh/transport-axios-worker.mjs'], { env: { ...baseEnv, ...input.settings }, stdio: ['pipe', 'pipe', 'pipe'] });
        let text = '',
            error = '';
        child.stdout.on('data', (chunk) => (text += chunk));
        child.stderr.on('data', (chunk) => (error += chunk));
        child.on('error', reject);
        child.on('close', (code) => {
            if (code !== 0) reject(new Error('Axios worker failed ' + code));
            else {
                try {
                    resolve(JSON.parse(text));
                } catch {
                    reject(new Error('Invalid axios worker output'));
                }
            }
        });
        child.stdin.end(JSON.stringify(input));
    });
}
const rust = spawn(probe, [], { env: baseEnv, stdio: ['pipe', 'pipe', 'pipe'] }),
    reader = createInterface({ input: rust.stdout }),
    waiting = [];
let rustError = '';
rust.stderr.on('data', (chunk) => (rustError += chunk));
reader.on('line', (line) => {
    const current = waiting.shift();
    if (!current) return;
    try {
        current.resolve(JSON.parse(line));
    } catch (error) {
        current.reject(error);
    }
});
rust.on('error', (error) => {
    for (const current of waiting.splice(0)) current.reject(error);
});
const invokeRust = (input) =>
    new Promise((resolve, reject) => {
        waiting.push({ resolve, reject });
        rust.stdin.write(JSON.stringify(input) + '\n');
    });
const cases = [
    {
        id: 'axios-object-encoding',
        path: '/echo',
        query: [
            ['department_id_type', 'open_department_id'],
            ['fetch_child', 'false'],
            ['q', "a+b $:[], !'()雪"]
        ]
    },
    {
        id: 'url-search-params-repeated',
        path: '/echo',
        queryEncoding: 'url-search-params',
        query: [
            ['user_ids', 'a+b /雪'],
            ['user_ids', 'second'],
            ['user_id_type', 'open_id']
        ]
    },
    { id: 'json-post', path: '/echo', method: 'POST', json: { client_id: 'gh-synthetic', client_secret: 'gh-synthetic-only', code: 'gh-controlled-code' } },
    { id: 'silent-invalid-json', path: '/invalid' },
    { id: 'http-503-full-body', path: '/status' },
    { id: 'redirect-get', path: '/redirect' },
    { id: 'redirect-post-to-get', path: '/redirect', method: 'POST', json: { controlled: true } },
    { id: 'redirect-limit-21', path: '/loop' },
    { id: 'timeout-default-error', path: '/timeout', timeoutMs: 50 },
    ...['gzip', 'br', 'deflate'].map((encoding) => ({ id: 'decompress-' + encoding, path: '/' + encoding })),
    { id: 'tls-with-explicit-extra-ca', path: '/echo', origin: tlsOrigin, settings: { NODE_EXTRA_CA_CERTS: certFile } },
    { id: 'tls-untrusted-rejected', path: '/echo', origin: tlsOrigin },
    { id: 'http-proxy-env', path: '/echo', settings: { http_proxy: proxyOrigin } },
    { id: 'http-proxy-no-proxy-bypass', path: '/echo', settings: { http_proxy: proxyOrigin, no_proxy: '127.0.0.1' } },
    { id: 'https-connect-proxy-env', path: '/echo', origin: tlsOrigin, settings: { https_proxy: proxyOrigin, NODE_EXTRA_CA_CERTS: certFile } },
    { id: 'raw-js-json-retained', path: '/raw-json', rawRetention: true },
    { id: 'unsupported-ftp-before-network', origin: origin.replace(/^http:/, 'ftp:'), path: '/oauth/token', noNetwork: true },
    { id: 'unsupported-ws-before-network', origin: origin.replace(/^http:/, 'ws:'), path: '/oauth/token', noNetwork: true }
];
try {
    for (const entry of cases) {
        const input = {
            method: entry.method ?? 'GET',
            url: (entry.origin ?? origin) + entry.path,
            headers: [],
            query: entry.query ?? [],
            queryEncoding: entry.queryEncoding ?? 'axios-object',
            json: entry.json ?? null,
            timeoutMs: entry.timeoutMs ?? 1000,
            settings: entry.settings ?? {}
        };
        const beforeProxy = report.proxyRequests.length, beforeRequests = report.requests.length;
        const original = await worker(input),
            candidate = await invokeRust(input);
        let comparable = candidate;
        if (candidate.response) {
            comparable = { ...candidate, response: { status: candidate.response.status, data: entry.rawRetention ? normal(JSON.parse(candidate.response.rawData)) : candidate.response.data } };
        }
        const row = { id: entry.id, original, candidate: comparable, rawRetention: entry.rawRetention === true, proxyRequests: report.proxyRequests.slice(beforeProxy), result: 'pending' };
        report.cases.push(row);
        try {
            assert.deepEqual(comparable, original);
            if (entry.noNetwork) {
                assert.equal(report.requests.length, beforeRequests);
                assert.equal(report.proxyRequests.length, beforeProxy);
                row.noOwnedHttpOrProxyRequestObserved = true;
            }
            if (entry.rawRetention) assert.equal(candidate.response.rawData, '{"overflow":1e999,"lone":"\\ud800"}');
            row.result = 'pass';
        } catch (error) {
            row.result = 'fail';
            row.assertion = error.message.slice(0, 1000);
        }
        console.log(JSON.stringify({ id: entry.id, result: row.result }));
    }
    report.result = report.cases.every((row) => row.result === 'pass') ? 'pass' : 'fail';
} finally {
    rust.stdin.end();
    await new Promise((resolve) => rust.on('close', resolve));
    for (const socket of sockets) socket.destroy();
    for (const owned of [server, secure, proxy]) await new Promise((resolve) => owned.close(resolve));
    report.stopped = true;
    report.finishedAt = new Date().toISOString();
    report.sourceFiles = ['tools/rust-r2gh/transport-acceptance.mjs', 'tools/rust-r2gh/transport-axios-worker.mjs', 'apps/poms-api-rust/src/provider_support/upstream.rs', 'apps/poms-api-rust/examples/provider_transport_probe.rs'].map((file) => ({
        file,
        rawBytesSha256: sha(readFileSync(file))
    }));
    writeFileSync(out, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ result: report.result, out, cases: report.cases.length, failed: report.cases.filter((row) => row.result === 'fail').map((row) => row.id), stopped: true }));
    if (report.result !== 'pass') process.exitCode = 1;
}
