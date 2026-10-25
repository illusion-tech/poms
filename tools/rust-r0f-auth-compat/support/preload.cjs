// Loaded before Jest and every product import. Never delegates rejected calls.
const fs = require('node:fs');
const path = require('node:path');
const { fileURLToPath } = require('node:url');
const { syncBuiltinESMExports } = require('node:module');

const evidence = {
    protectedReadAttempts: 0,
    networkAttempts: 0,
    processAttempts: 0,
    selfTests: {},
    inheritedSensitiveEnvironment: Object.keys(process.env).filter((key) => /^(DB_|PG|POMS_|JWT_|AUTH_|.*SECRET|.*PASSWORD)/i.test(key))
};

function protectedPath(value) {
    if (typeof value === 'number') return false;
    const raw = value instanceof URL ? fileURLToPath(value) : Buffer.isBuffer(value) ? value.toString() : String(value);
    const normalized = raw.replaceAll('\\', '/');
    const name = path.posix.basename(normalized);
    return /^\.env(?:\.|$)/i.test(name) || /(?:^|\/)deploy\/private(?:\/|$)/i.test(normalized) || /\/apps\/poms-api\/src\/config\/load-env\.[cm]?[jt]s$/i.test(normalized);
}

function reject(kind, name, selfTest = false) {
    if (!selfTest) evidence[kind] += 1;
    const error = new Error(`R0F hermetic guard rejected ${name}`);
    error.code = 'R0F_HERMETIC_REJECTED';
    throw error;
}

for (const name of ['readFileSync', 'readFile', 'openSync', 'open', 'createReadStream']) {
    const original = fs[name];
    fs[name] = function (...args) {
        if (protectedPath(args[0])) reject('protectedReadAttempts', 'protected file read');
        return Reflect.apply(original, this, args);
    };
}
for (const name of ['readFile', 'open']) {
    const original = fs.promises[name];
    fs.promises[name] = async function (...args) {
        if (protectedPath(args[0])) reject('protectedReadAttempts', 'protected file read');
        return Reflect.apply(original, this, args);
    };
}
const blockers = [
    [require('node:net'), ['connect', 'createConnection']],
    [require('node:net').Socket.prototype, ['connect']],
    [require('node:net').Server.prototype, ['listen']],
    [require('node:tls'), ['connect']],
    [require('node:http'), ['request', 'get']],
    [require('node:https'), ['request', 'get']],
    [require('node:dgram'), ['createSocket']],
    [require('node:dns'), ['lookup', 'resolve', 'resolve4', 'resolve6']]
];
for (const [target, names] of blockers) {
    for (const name of names) target[name] = () => reject('networkAttempts', `network:${name}`);
}
globalThis.fetch = () => reject('networkAttempts', 'network:fetch');
const childProcess = require('node:child_process');
for (const name of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']) {
    childProcess[name] = () => reject('processAttempts', `child-process:${name}`);
}
syncBuiltinESMExports();

globalThis.__R0F_HERMETIC__ = {
    evidence,
    selfTest() {
        const checks = {
            environment: evidence.inheritedSensitiveEnvironment.length === 0,
            protectedPath: protectedPath('/synthetic/.env.r0f-deny') && protectedPath('/synthetic/deploy/private/example') && !protectedPath('/synthetic/source.ts')
        };
        for (const [name, fn, counter] of [
            ['fileRead', () => fs.readFileSync('/synthetic/.env.r0f-deny'), 'protectedReadAttempts'],
            ['socket', () => require('node:net').connect({ port: 1 }), 'networkAttempts'],
            ['listener', () => require('node:net').createServer().listen(1), 'networkAttempts'],
            ['fetch', () => globalThis.fetch('http://synthetic.invalid'), 'networkAttempts'],
            ['childProcess', () => childProcess.spawn('synthetic-denied'), 'processAttempts']
        ]) {
            const before = evidence[counter];
            try {
                fn();
                checks[name] = false;
            } catch (error) {
                checks[name] = error.code === 'R0F_HERMETIC_REJECTED';
            }
            // Explicit rejection self-tests are separate from oracle attempts.
            evidence[counter] = before;
        }
        evidence.selfTests = checks;
        if (Object.values(checks).some((value) => !value)) throw new Error('R0F hermetic self-test failed');
        return checks;
    }
};
fs.__R0F_HERMETIC__ = globalThis.__R0F_HERMETIC__;
