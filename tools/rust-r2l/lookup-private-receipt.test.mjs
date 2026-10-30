// Virtual filesystem and synthetic bytes only. No real private/environment file,
// connection, HTTP, Native process, browser or credential is used.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createLookupPrivateReceipt, lookupRequestEvidence } from './lookup-private-receipt.mjs';
const root = '/home/wangzishi/.local/share/poms-r2l/private';
const run = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', denied = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const sha = (value) => createHash('sha256').update(value).digest('hex');
function memory() {
    const files = new Map([[root, { kind: 'directory', mode: 0o700, link: false }]]), descriptors = new Map(), events = []; let fd = 0;
    const stat = (entry) => ({ mode: entry.mode, nlink: entry.nlink ?? 1, size: entry.bytes?.length ?? 0, isDirectory: () => entry.kind === 'directory', isFile: () => entry.kind === 'file', isSymbolicLink: () => !!entry.link });
    const filesystem = {
        existsSync: (file) => files.has(file), mkdirSync: (file, options) => { assert(!files.has(file)); files.set(file, { kind: 'directory', mode: options.mode, link: false }); events.push(['mkdir', file, options.mode]); },
        lstatSync: (file) => { assert(files.has(file)); return stat(files.get(file)); },
        openSync: (file, flags, mode) => { if (flags === 'wx') { assert(!files.has(file)); files.set(file, { kind: 'file', mode, link: false, nlink: 1, bytes: Buffer.alloc(0) }); } else assert(files.has(file)); descriptors.set(++fd, file); events.push(['open', file, flags, mode]); return fd; },
        writeFileSync: (descriptor, bytes) => { files.get(descriptors.get(descriptor)).bytes = Buffer.from(bytes); events.push(['write', descriptors.get(descriptor)]); },
        fsyncSync: (descriptor) => events.push(['fsync', descriptors.get(descriptor)]), closeSync: (descriptor) => { events.push(['close', descriptors.get(descriptor)]); descriptors.delete(descriptor); },
        renameSync: (from, to) => { assert(files.has(from)); files.set(to, files.get(from)); files.delete(from); events.push(['rename', from, to]); },
        readFileSync: (file) => Buffer.from(files.get(file).bytes)
    };
    return { files, events, filesystem };
}
function setup() { const mem = memory(), store = createLookupPrivateReceipt({ variant: 'current', backend: 'nest', tag: 'pure', runIds: [run, denied] }, { filesystem: mem.filesystem, platform: 'linux' }); return { mem, store, file: store.descriptor().file }; }
const pending = (store, requestJson = { username: 'fresh-only', password: 'unit-input-password-not-retained' }) => store.pending({ fixtureRunId: run, name: 'login', method: 'POST', path: '/api/auth/sessions', startedAt: '2026-10-30T00:00:00.000Z', context: { runId: run, caseId: 'login', index: 0, op: 'l.http' }, intents: [], before: { auth_session: [], local_credential: [{ password_hash: 'server-side-bcrypt-hash-retained-privately' }] }, requestJson, requestCookies: new Map([['poms_csrf', 'unit-input-cookie-not-retained']]) });
const response = () => ({ status: 200, contentType: 'application/json', bodyBytes: Buffer.from('{ "token" : "unit-response-token-private-only" }\n'), body: { token: 'unit-response-token-private-only' }, setCookie: ['poms_session=unit-response-cookie-private-only; HttpOnly; Path=/api'], parseError: null });

test('pending request and raw owned facts are durable before sending; request plaintext and cookie values never persist', () => {
    const { mem, store, file } = setup(); pending(store); const text = mem.files.get(file).bytes.toString(), raw = JSON.parse(text);
    assert.equal(raw.requests[0].state, 'pending-before-send'); assert.equal(raw.requests[0].certification.state, 'pending');
    assert.equal(raw.requests[0].before.local_credential[0].password_hash, 'server-side-bcrypt-hash-retained-privately');
    assert(!text.includes('unit-input-password-not-retained')); assert(!text.includes('unit-input-cookie-not-retained'));
    assert.equal(raw.requests[0].request.body.rawRequestBodyRetained, false); assert.equal(raw.requests[0].request.cookies[0].rawValueRetained, false);
    assert.equal(mem.files.get(file).mode, 0o600); assert.equal(mem.files.get(root + '/lookup-actual').mode, 0o700);
    const rename = mem.events.findLastIndex(([event]) => event === 'rename'); assert(rename >= 0);
    assert(mem.events.slice(0, rename).some(([event, name]) => event === 'fsync' && name.endsWith('.tmp')));
    assert(mem.events.slice(rename + 1).some(([event, name]) => event === 'fsync' && name === root + '/lookup-actual'));
});
test('received original byte sequence and Set-Cookie are persisted before proof rejection without becoming certified', () => {
    const { mem, store, file } = setup(), index = pending(store), actual = response(); const observed = store.received(index, actual, '2026-10-30T00:00:01.000Z');
    assert.equal(observed.wireBodySha256, sha(actual.bodyBytes)); assert.equal(observed.rawOriginalRetainedPrivately, true);
    assert(!JSON.stringify(observed).includes('unit-response-token')); assert(!JSON.stringify(store.descriptor()).includes('unit-response-cookie'));
    store.failed(index, new Error('actual certificate rejected'), { sdkSnapshotAtFailure: { complete: false } });
    const raw = JSON.parse(mem.files.get(file).bytes); assert.equal(raw.requests[0].state, 'failed-uncertified'); assert.equal(raw.requests[0].certification.state, 'pending');
    assert.deepEqual(Buffer.from(raw.requests[0].response.bodyBytesBase64, 'base64'), actual.bodyBytes); assert.deepEqual(raw.requests[0].response.setCookie, actual.setCookie);
    assert.notEqual(Buffer.from(JSON.stringify(actual.body)).toString('base64'), raw.requests[0].response.bodyBytesBase64);
});
test('request-password echo is withheld rather than stored or labelled a complete raw original', () => {
    const { mem, store, file } = setup(), index = pending(store), actual = response(); actual.bodyBytes = Buffer.from('{"echo":"unit-input-password-not-retained"}');
    const observed = store.received(index, actual); assert.equal(observed.rawOriginalRetainedPrivately, false); assert.equal(observed.credentialPrivacyClass, 'request-password-echo-withheld-by-policy');
    const text = mem.files.get(file).bytes.toString(); assert(!text.includes('unit-input-password-not-retained')); const raw = JSON.parse(text);
    assert.equal(raw.requests[0].response.bodyBytesBase64, null); assert.equal(raw.requests[0].response.bodySha256, sha(actual.bodyBytes));
});
test('parser error, later failure message and nested diagnostics cannot retain request-password echoes', () => {
    const { mem, store, file } = setup(), index = pending(store), actual = response(), password = 'unit-input-password-not-retained';
    actual.parseError = { message: 'Unexpected input near ' + password, detail: { input: password } };
    const observed = store.received(index, actual); assert.equal(observed.rawOriginalRetainedPrivately, false); assert(!JSON.stringify(observed).includes(password));
    store.failed(index, new Error('parser rejected ' + password), { nested: { message: password } });
    store.checkpoint('after-parser-failure', { error: new Error(password) }); store.finish('fail', { failure: password });
    const text = mem.files.get(file).bytes.toString(); assert(!text.includes(password)); const raw = JSON.parse(text);
    assert.equal(raw.requests[0].response.parseError.withheld, true); assert.equal(raw.requests[0].failure.message.withheld, true); assert.equal(raw.requests[0].nested.message.withheld, true);
});
test('unsafe directory/file permissions, symlinks, hardlinks and stale private contents fail closed', () => {
    const unsafe = memory(); unsafe.files.get(root).mode = 0o755;
    assert.throws(() => createLookupPrivateReceipt({ variant: 'legacy', backend: 'rust', tag: 'pure', runIds: [run, denied] }, { filesystem: unsafe.filesystem, platform: 'linux' }), /Unsafe/);
    for (const mutation of [(entry) => { entry.mode = 0o644; }, (entry) => { entry.link = true; }, (entry) => { entry.nlink = 2; }, (entry) => { entry.bytes = Buffer.from('{}'); }]) {
        const { mem, store, file } = setup(); mutation(mem.files.get(file)); assert.throws(() => store.descriptor());
    }
});
test('certified after facts retain all raw fields; a later assertion failure keeps actual certification distinct', () => {
    const { mem, store, file } = setup(), index = pending(store); store.received(index, response());
    store.certified(index, { after: { auth_session: [{ id: run, row_version: 3, csrf_token_hash: 'actual-private-db-hash' }] }, certificates: { actual: true } });
    store.failed(index, new Error('expected status assertion failed')); store.finish('fail', { doubleZero: false });
    const raw = JSON.parse(mem.files.get(file).bytes); assert.equal(raw.requests[0].state, 'failed-after-certification'); assert.equal(raw.requests[0].certification.state, 'complete');
    assert.equal(raw.requests[0].after.auth_session[0].row_version, 3); assert.equal(raw.requests[0].after.auth_session[0].csrf_token_hash, 'actual-private-db-hash'); assert.equal(raw.closeout.doubleZero, false);
    assert.equal(raw.evidencePolicy.replacesEarlierTokenMemoryOnlyForResponses, true);
});
test('request projection hashes exact JSON bytes and recursively redacts nested passwords', () => {
    const input = { nested: { password: 'not-real-unit-password' }, ordinary: 'kept' }, observed = lookupRequestEvidence(input);
    assert.equal(observed.body.sha256, sha(Buffer.from(JSON.stringify(input)))); assert.equal(observed.body.typedRedacted.ordinary, 'kept'); assert(!JSON.stringify(observed).includes('not-real-unit-password'));
});
