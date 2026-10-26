// Exact owned loopback listener/client exception; every other network route and
// protected config read is denied before any original product import.
const fs = require('node:fs');
const path = require('node:path');
const { fileURLToPath } = require('node:url');
const { syncBuiltinESMExports } = require('node:module');
const net = require('node:net');
const http = require('node:http');
let listenerAllocated = false;
let ownedPort;
const evidence = {
    protectedReadAttempts: 0,
    rejectedNetworkAttempts: 0,
    listenerCount: 0,
    clientCount: 0,
    processAttempts: 0,
    inheritedSensitiveEnvironment: Object.keys(process.env).filter((key) => /^(DB_|PG|POMS_|JWT_|AUTH_|.*SECRET|.*PASSWORD)/i.test(key))
};
function deny(counter, detail) {
    evidence[counter] += 1;
    const error = new Error(`R1C HTTP oracle denied ${detail}`);
    error.code = 'R1C_HTTP_DENIED';
    throw error;
}
function protectedPath(value) {
    if (typeof value === 'number') return false;
    const raw = value instanceof URL ? fileURLToPath(value) : Buffer.isBuffer(value) ? value.toString() : String(value);
    const text = raw.replaceAll('\\', '/');
    return /^\.env(?:\.|$)/i.test(path.posix.basename(text)) || /(?:^|\/)deploy\/private(?:\/|$)/i.test(text) || /\/apps\/poms-api\/src\/config\/load-env\.[cm]?[jt]s$/i.test(text);
}
for (const name of ['readFileSync', 'readFile', 'openSync', 'open', 'createReadStream']) {
    const original = fs[name];
    fs[name] = function (...args) {
        if (protectedPath(args[0])) deny('protectedReadAttempts', 'protected file');
        return Reflect.apply(original, this, args);
    };
}
for (const name of ['readFile', 'open']) {
    const original = fs.promises[name];
    fs.promises[name] = async function (...args) {
        if (protectedPath(args[0])) deny('protectedReadAttempts', 'protected file');
        return Reflect.apply(original, this, args);
    };
}
const originalListen = net.Server.prototype.listen;
net.Server.prototype.listen = function (...args) {
    if (listenerAllocated || args[0] !== 0 || args[1] !== '127.0.0.1') deny('rejectedNetworkAttempts', 'listener outside owned loopback');
    listenerAllocated = true;
    evidence.listenerCount += 1;
    this.once('listening', () => {
        ownedPort = this.address().port;
    });
    return Reflect.apply(originalListen, this, args);
};
const originalConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
    const options = Array.isArray(args[0]) ? args[0][0] : args[0];
    if (!ownedPort || !options || typeof options !== 'object' || options.path || (options.host ?? options.hostname) !== '127.0.0.1' || Number(options.port) !== ownedPort) deny('rejectedNetworkAttempts', 'socket outside owned server');
    return Reflect.apply(originalConnect, this, args);
};
const originalRequest = http.request;
http.request = function (options, ...args) {
    if (!ownedPort || !options || typeof options !== 'object' || (options.host ?? options.hostname) !== '127.0.0.1' || Number(options.port) !== ownedPort || options.socketPath) deny('rejectedNetworkAttempts', 'HTTP outside owned server');
    evidence.clientCount += 1;
    return Reflect.apply(originalRequest, this, [options, ...args]);
};
const dns = require('node:dns');
const originalLookup = dns.lookup;
dns.lookup = function (hostname, ...args) {
    if (hostname !== '127.0.0.1' || !listenerAllocated) deny('rejectedNetworkAttempts', 'lookup outside numeric loopback');
    return Reflect.apply(originalLookup, this, [hostname, ...args]);
};
for (const [target, names] of [
    [require('node:tls'), ['connect']],
    [require('node:https'), ['request', 'get']],
    [require('node:dgram'), ['createSocket']],
    [dns, ['resolve', 'resolve4', 'resolve6']]
])
    for (const name of names) target[name] = () => deny('rejectedNetworkAttempts', name);
globalThis.fetch = () => deny('rejectedNetworkAttempts', 'fetch');
const child = require('node:child_process');
for (const name of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']) child[name] = () => deny('processAttempts', 'child process');
fs.__R1C_HTTP_HERMETIC__ = { evidence };
syncBuiltinESMExports();
