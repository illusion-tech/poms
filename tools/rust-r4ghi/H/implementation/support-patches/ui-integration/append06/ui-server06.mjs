import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.jpg': 'image/jpeg', '.map': 'application/json' };

export function buildManifest(directory) {
  const root = fs.realpathSync(directory), files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name), stat = fs.lstatSync(file);
      assert(!stat.isSymbolicLink(), 'A build member is a symlink');
      if (stat.isDirectory()) walk(file);
      else {
        assert(stat.isFile(), 'A build member is not a regular file');
        const bytes = fs.readFileSync(file);
        files.push({ file: path.relative(root, file).replaceAll('\\', '/'), bytes: bytes.length, rawBytesSha256: sha256(bytes) });
      }
    }
  };
  walk(root);
  files.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0);
  assert(files.some((file) => file.file === 'index.html'), 'No real browser index.html');
  return { directory: root, files, memberCount: files.length, manifestSha256: sha256(Buffer.from(JSON.stringify(files))) };
}

export function publicPath(raw) {
  const url = new URL(raw, 'http://127.0.0.1:44551');
  const pathname = url.pathname.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '{uuid}');
  return pathname + (url.search ? `?${[...new Set(url.searchParams.keys())].sort().join('&')}` : '');
}

/** Real, immutable dist/browser files and a transparent, read-only, owned proxy.
 * Raw headers/bodies stay exclusively in the caller's new private directory.
 * Does not own, launch, stop, or modify the backend process.
 */
export async function startUiServer({ directory, privateDirectory, afterResponse, backendPort = 31441, port = 44551 }) {
  assert.equal(backendPort, 31441); assert.equal(port, 44551);
  const build = buildManifest(directory), members = new Map(build.files.map((member) => [member.file, member]));
  assert(!fs.existsSync(privateDirectory), 'Never reuse a private HTTP tape directory');
  fs.mkdirSync(privateDirectory, { recursive: true, mode: 0o700 });
  const exchanges = [], pending = new Set(), failures = [];
  const privateWrite = (file, value) => fs.writeFileSync(path.join(privateDirectory, file), value, { flag: 'wx', mode: 0o600 });
  const server = http.createServer((request, response) => {
    const work = (async () => {
      const raw = request.url || '/', parsed = new URL(raw, 'http://127.0.0.1:44551');
      assert.equal(parsed.origin, 'http://127.0.0.1:44551', 'Absolute upstream URLs are forbidden');
      if (parsed.pathname === '/api' || parsed.pathname.startsWith('/api/')) {
        const index = exchanges.length, item = { index, method: request.method, path: publicPath(raw), status: null };
        exchanges.push(item);
        assert(['GET', 'HEAD', 'OPTIONS'].includes(request.method), 'Read-only DOM tool attempted an API write');
        const chunks = [];
        for await (const chunk of request) chunks.push(chunk);
        const body = Buffer.concat(chunks);
        let upstream;
        await new Promise((resolve, reject) => {
          const forwarded = http.request({ host: '127.0.0.1', port: backendPort, method: request.method, path: raw, headers: { ...request.headers, host: `127.0.0.1:${backendPort}` }, timeout: 30_000 }, (incoming) => {
            const received = [];
            incoming.on('data', (chunk) => received.push(chunk));
            incoming.on('error', reject);
            incoming.on('end', async () => {
              try {
                const bytes = Buffer.concat(received);
                upstream = { status: incoming.statusCode, headers: incoming.headers, bodyBase64: bytes.toString('base64'), bodySha256: sha256(bytes), bodyBytes: bytes.length };
                const file = `http-${String(index).padStart(4, '0')}.json`;
                const record = Buffer.from(JSON.stringify({ request: { method: request.method, path: raw, headers: request.headers, bodyBase64: body.toString('base64') }, response: upstream }, null, 2) + '\n');
                privateWrite(file, record);
                item.status = upstream.status; item.privateRaw = { file, bytes: record.length, rawBytesSha256: sha256(record) };
                // Root may supply its existing ownership observer; raw values never enter a public result.
                if (afterResponse) await afterResponse({ method: request.method, path: raw, status: item.status });
                response.writeHead(incoming.statusCode, incoming.headers); response.end(bytes); resolve();
              } catch (error) { reject(error); }
            });
          });
          forwarded.on('error', reject); forwarded.on('timeout', () => forwarded.destroy(new Error('Owned backend timeout'))); forwarded.end(body);
        });
        return;
      }
      assert(['GET', 'HEAD'].includes(request.method), 'Unexpected static request method');
      const decoded = decodeURIComponent(parsed.pathname);
      assert(!decoded.includes('\\') && !decoded.split('/').includes('..'), 'Unsafe static path');
      let relative = decoded.replace(/^\//, '');
      if (!members.has(relative) && !path.extname(relative)) relative = 'index.html';
      const member = members.get(relative);
      if (!member) { response.writeHead(404); response.end(); return; }
      const bytes = fs.readFileSync(path.join(build.directory, ...relative.split('/')));
      assert.equal(sha256(bytes), member.rawBytesSha256, 'A served dist member changed');
      response.writeHead(200, { 'Content-Type': mime[path.extname(relative)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      response.end(request.method === 'HEAD' ? undefined : bytes);
    })().catch((error) => {
      failures.push({ index: failures.length, stage: 'static-or-forwarding', name: error.name });
      privateWrite(`server-error-${failures.length}.log`, error.stack || String(error));
      if (!response.headersSent) response.writeHead(502);
      response.end();
    });
    pending.add(work); void work.finally(() => pending.delete(work));
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return {
    origin: 'http://127.0.0.1:44551', build, exchanges, failures,
    async settle() { await Promise.all([...pending]); },
    async close() {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      await Promise.all([...pending]);
      assert.equal(buildManifest(build.directory).manifestSha256, build.manifestSha256, 'Dist changed during the run');
      return { serverClosed: true, pending: pending.size, allRawExchangesRetained: exchanges.every((item) => item.privateRaw), failures: failures.length };
    }
  };
}
