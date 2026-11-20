import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { buildManifest, publicPath } from '../append06/ui-server06.mjs';
import { fixed, sha, writeNew } from './dom-common14.mjs';

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.jpg': 'image/jpeg', '.map': 'application/json' };

/** Owned Linux proxy. Serial API forwarding isolates each real before/after ledger observation. */
export async function startRecordedServer({ directory, privateDirectory, nonce, beforeRequest, afterResponse, publish }) {
  const build = buildManifest(directory), members = new Map(build.files.map(member => [member.file, member]));
  assert(/^[0-9a-f]{64}$/.test(nonce) && !fs.existsSync(privateDirectory)); fs.mkdirSync(privateDirectory, { mode: 0o700 });
  const exchanges = [], failures = [], pending = new Set(); let serial = Promise.resolve();
  const fail = (error, response) => {
    failures.push({ index: failures.length, kind: 'owned-proxy-or-observer', name: error.name });
    writeNew(path.join(privateDirectory, `error-${failures.length}.log`), Buffer.from(error.stack || String(error)));
    if (!response.headersSent) response.writeHead(502, { 'X-Poms-R4ghi-Ui-Run': nonce }); response.end(); publish({ exchanges, failures });
  };
  const server = http.createServer((request, response) => {
    const raw = request.url || '/', url = new URL(raw, fixed.origin);
    const apiRequest = url.pathname === '/api' || url.pathname.startsWith('/api/');
    const run = async () => {
      assert.equal(url.origin, fixed.origin); assert((apiRequest ? ['GET', 'HEAD', 'POST', 'PUT'] : ['GET', 'HEAD']).includes(request.method), 'Only exact admitted case writes may reach the private observer');
      if (apiRequest) {
        const chunks = []; for await (const chunk of request) chunks.push(chunk); const body = Buffer.concat(chunks); if(['GET','HEAD'].includes(request.method)) assert.equal(body.length,0);
        const index = exchanges.length, item = { index, method: request.method, path: publicPath(raw), status: null }; exchanges.push(item);
        const observation = await beforeRequest({ method: request.method, path: raw, headers: request.headers, body });
        const configuredHeaders = { ...request.headers, host: `127.0.0.1:${fixed.apiPort}`, 'accept-encoding': 'identity', 'x-request-id': observation.requestId };
        let upstream = { status: null, headers: {}, complete: false }, failure = null; const received = [];
        try {
          await new Promise((resolve, reject) => {
            const forwarded = http.request({ host: '127.0.0.1', port: fixed.apiPort, method: request.method, path: raw, headers: configuredHeaders, timeout: 45_000 }, incoming => {
              upstream = { status: incoming.statusCode, headers: incoming.headers, complete: false };
              incoming.on('data', chunk => received.push(Buffer.from(chunk))); incoming.once('aborted', () => reject(new Error('Actual API response aborted'))); incoming.once('error', reject);
              incoming.once('end', () => { upstream.complete = incoming.complete; resolve(); });
            });
            forwarded.once('error', reject); forwarded.once('timeout', () => forwarded.destroy(new Error('Actual API transport deadline'))); forwarded.end(body.length ? body : undefined);
          });
        } catch (error) { failure = { name: error.name, message: error.message }; }
        const bytes = Buffer.concat(received), record = { request: { method: request.method, path: raw, headers: configuredHeaders, originalIncomingHeaders: request.headers, bodyBase64: body.toString('base64') }, response: { ...upstream, bodyBase64: bytes.toString('base64'), bodySHA256: sha(bytes), bodyBytes: bytes.length }, failure };
        const file = `http-${String(index).padStart(4, '0')}.json`, recordBytes = Buffer.from(JSON.stringify(record, null, 2) + '\n'); writeNew(path.join(privateDirectory, file), recordBytes);
        item.status = upstream.status; item.privateRaw = { file, bytes: recordBytes.length, rawBytesSha256: sha(recordBytes) };
        // Observe actual committed effects even for a missing ACK; never infer rollback.
        const ledger = await afterResponse({ observation, configuredHeaders, upstream, bytes, failure }); item.ledger = ledger;
        publish({ exchanges, failures });
        assert(!failure && upstream.complete, 'Actual API transport was incomplete');
        response.writeHead(upstream.status, { ...upstream.headers, 'X-Poms-R4ghi-Ui-Run': nonce }); response.end(bytes); return;
      }
      const decoded = decodeURIComponent(url.pathname); assert(!decoded.includes('\\') && !decoded.split('/').includes('..'));
      let relative = decoded.replace(/^\//, ''); if (!members.has(relative) && !path.extname(relative)) relative = 'index.html';
      const member = members.get(relative); if (!member) { response.writeHead(404, { 'X-Poms-R4ghi-Ui-Run': nonce }); response.end(); return; }
      const bytes = fs.readFileSync(path.join(build.directory, ...relative.split('/'))); assert.equal(sha(bytes), member.rawBytesSha256);
      response.writeHead(200, { 'Content-Type': mime[path.extname(relative)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Poms-R4ghi-Ui-Run': nonce }); response.end(request.method === 'HEAD' ? undefined : bytes);
    };
    const work = (apiRequest ? serial.then(run) : run()).catch(error => fail(error, response));
    if (apiRequest) serial = work; pending.add(work); void work.finally(() => pending.delete(work));
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(fixed.uiPort, '127.0.0.1', resolve); });
  publish({ exchanges, failures });
  return { build, exchanges, failures, async settle() { await serial; await Promise.all([...pending]); }, async close() { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); await serial; await Promise.all([...pending]); assert.equal(buildManifest(build.directory).manifestSha256, build.manifestSha256); return { serverClosed: true, pending: pending.size, failures: failures.length, allRawExchangesRetained: exchanges.every(item => item.privateRaw) }; } };
}
