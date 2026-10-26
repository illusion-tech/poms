// Synthetic lifecycle fixture. It never reads application env or a database.
const http = require('node:http');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const path = require('node:path');
const [port, mode = 'ready', report] = process.argv.slice(2);
let descendant;
if (mode === 'tree') descendant = spawn(process.execPath, [path.join(__dirname, 'stubborn.cjs')], { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
if (report) fs.writeFileSync(report, JSON.stringify({ anchor: process.ppid, server: process.pid, descendant: descendant?.pid }));
if (mode === 'early') process.exit(7);
const server = http.createServer((_request, response) => {
    if (mode === 'stall') return;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify(mode === 'fake' ? { status: 'ready' } : { service: 'poms-api', status: 'ready', checks: { process: { status: 'pass' }, database: { status: 'pass' } } }));
});
// Do not race the descendant's SIGTERM-handler installation. The tree test
// becomes ready only after that separate child confirms its real startup.
if (descendant) descendant.once('message', () => server.listen(Number(port), '127.0.0.1'));
else server.listen(Number(port), '127.0.0.1');
