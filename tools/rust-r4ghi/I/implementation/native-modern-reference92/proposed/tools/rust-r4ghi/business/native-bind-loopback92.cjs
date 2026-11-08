'use strict';
// Task-only process preload. The full Native main/guards/DB/clock stay original.
const assert = require('node:assert/strict');
const net = require('node:net');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
assert(/^[a-f0-9]{64}$/.test(process.env.POMS_R4GHI_NATIVE_REFERENCE_RUN ?? ''), 'Explicit Native92 owned process nonce required');
const envFile = process.env.POMS_ENV_FILE, envSHA = process.env.POMS_R4GHI_NATIVE_ENV_SHA256;
assert(typeof envFile === 'string' && /^\/home\/wangzishi\/\.local\/share\/poms-r4ghi\/private\/native-reference92\/[A-Za-z0-9][A-Za-z0-9_-]{0,47}\/native\.env$/.test(envFile), 'Explicit owned Native92 env file required before Native bootstrap');
assert(/^[a-f0-9]{64}$/.test(envSHA ?? '')); const stat = fs.lstatSync(envFile);
assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && fs.realpathSync(envFile) === envFile);
const envBytes = fs.readFileSync(envFile); assert(createHash('sha256').update(envBytes).digest('hex') === envSHA, 'Reviewed Native env bytes changed');
// Mirror explicit dotenv override without mutating process.env: an inherited
// DATABASE_URL absent from the file must not send startup to another database.
const env = { ...process.env, ...require('dotenv').parse(envBytes) };
for (const [key, value] of Object.entries({ PORT: '31442', DB_CONNECT: 'true', DB_HOST: '127.0.0.1', DB_PORT: '25434', DB_DATABASE: 'poms_r4ghi_native', DB_USER: 'poms_r4ghi_native_app', DB_SCHEMA: 'poms' })) assert(env[key] === value, `Owned Native env predicate failed for ${key}`);
assert(typeof env.DB_PASSWORD === 'string' && env.DB_PASSWORD.length > 0, 'Explicit Native app credential required');
if (env.DATABASE_URL) {
    try { const url = new URL(env.DATABASE_URL); assert(['postgres:', 'postgresql:'].includes(url.protocol) && url.hostname === '127.0.0.1' && url.port === '25434' && decodeURIComponent(url.pathname.slice(1)) === 'poms_r4ghi_native' && decodeURIComponent(url.username) === 'poms_r4ghi_native_app'); }
    catch { throw new Error('Owned Native DATABASE_URL predicate failed'); }
}
function normalizeListen92(input) {
    const args = [...input]; assert(args.length > 0);
    if (typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
        const options = args[0]; assert(!Object.hasOwn(options, 'path') && !Object.hasOwn(options, 'fd') && !Object.hasOwn(options, 'handle'));
        assert(options.port === 31442 || options.port === '31442', 'Only the reviewed Native31442 listener is allowed');
        assert(options.host == null || options.host === '127.0.0.1', 'An explicit host must already be loopback');
        args[0] = { ...options, port: 31442, host: '127.0.0.1' }; return args;
    }
    assert(args[0] === 31442 || args[0] === '31442', 'No other TCP port/pipe/fd listener is permitted'); args[0] = 31442;
    if (typeof args[1] === 'string') assert.equal(args[1], '127.0.0.1');
    else if (args.length > 1 && args[1] == null) args[1] = '127.0.0.1';
    else args.splice(1, 0, '127.0.0.1');
    return args;
}
const descriptor = Object.getOwnPropertyDescriptor(net.Server.prototype, 'listen');
assert(descriptor && typeof descriptor.value === 'function'); const original = descriptor.value;
Object.defineProperty(net.Server.prototype, 'listen', { ...descriptor, value: function (...args) { return original.apply(this, normalizeListen92(args)); } });
module.exports = { normalizeListen92 };
