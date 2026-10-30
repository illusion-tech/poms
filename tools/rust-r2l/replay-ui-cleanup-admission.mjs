// No GUI, DB or private reads: apply the new closeout predicate to old receipts.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { uiCleanupAdmission } from './l-ui-cleanup-admission.mjs';
const sha = value => createHash('sha256').update(value).digest('hex');
const output = process.argv[2]; assert(output && !fs.existsSync(output));
const inputs = ['ui-actual-nest-uinest02.json', 'ui-actual-rust-uirust03.json', 'ui-actual-nest-uicancel01.json', 'ui-actual-rust-uircancel01.json'];
const rows = inputs.map(name => {
    const file = 'tmp/rust-r2l/' + name, raw = fs.readFileSync(file), source = JSON.parse(raw);
    assert.equal(source.result, 'pass'); assert.equal(source.doubleZero, true);
    const passed = name => source.resources.some(row => row.name === name && row.result === 'pass');
    const value = { attempted: { proxy: true, native: true, rust: source.backend === 'rust', browser: true },
        closed: { proxy: passed('proxy-close'), native: passed('native-owner-close'), rust: passed('rust-owner-close'),
            browser: source.windowsLifecycle?.windowsStop?.result === 'owned-tree-stopped' }, windowsLifecycle: source.windowsLifecycle };
    const admission = uiCleanupAdmission(value); assert(admission.allowed);
    for (const name of ['proxy', 'native', 'browser', ...(value.attempted.rust ? ['rust'] : [])]) {
        const failed = structuredClone(value); failed.closed[name] = false; assert(!uiCleanupAdmission(failed).allowed);
    }
    return { file, rawBytesSha256: sha(raw), actualBrowserResult: source.browser.result, admission, failureVariantsRejected: Object.values(value.attempted).filter(Boolean).length };
});
const report = { formatVersion: 1, result: 'pass-read-only-predicate-replay', inputs: rows,
    source: { file: 'tools/rust-r2l/l-ui-cleanup-admission.mjs', rawBytesSha256: sha(fs.readFileSync('tools/rust-r2l/l-ui-cleanup-admission.mjs')) },
    newUIRunClaimed: false, DBOrPrivateRead: false, oldReceiptsModified: false };
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ result: report.result, records: rows.length, output }));
