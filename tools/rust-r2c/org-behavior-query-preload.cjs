'use strict';

// Followup-only preload. The first run's six source files remain unchanged.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { installQueryCapture } = require('./witness-query-core.cjs');
const { matchesBehaviorBarrier } = require('./org-behavior-query-match.cjs');
const runId = process.env.POMS_R2C_WITNESS_RUN_ID;
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(runId ?? '')) throw new Error('R2C behavior witness requires its exact run UUID');
const root = path.resolve(__dirname, '../..');
const directory = path.join(root, 'tmp/rust-r2c/witness', runId);
const stat = fs.lstatSync(directory);
if (!stat.isDirectory() || stat.isSymbolicLink() || (process.platform !== 'win32' && (stat.mode & 0o077) !== 0)) throw new Error('Behavior witness directory identity mismatch');
const file = fs.openSync(path.join(directory, 'sql.jsonl'), 'wx', 0o600);
const { Client } = createRequire(require.resolve('@mikro-orm/postgresql'))('pg');
const states = new Map();
function readControl(filename) {
    let value;
    try { value = fs.lstatSync(filename); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    if (!value.isFile() || value.isSymbolicLink() || value.size > 2048 || (process.platform !== 'win32' && (value.mode & 0o077) !== 0)) throw new Error('Invalid behavior control file');
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
}
installQueryCapture(Client, {
    append(row) { fs.writeSync(file, `${JSON.stringify(row)}\n`); },
    onFailure() { try { fs.writeSync(2, 'R2C_SQL_CAPTURE_INCOMPLETE\n'); } catch { /* Preserve driver behavior. */ } },
    barrierFor(phase, context) {
        const plan = readControl(path.join(directory, 'barrier.json'));
        if (!plan) return null;
        if (Object.keys(plan).sort().join(',') !== 'barrierId,formatVersion,kind,parties,runId' || plan.formatVersion !== 1 || plan.runId !== runId || !/^[a-z0-9-]{1,80}$/.test(plan.barrierId) || ![1, 2].includes(plan.parties)) throw new Error('Invalid behavior barrier');
        if (!['after-org-select', 'after-org-code-select', 'before-org-update', 'before-managed-session-update', 'after-org-version-precheck'].includes(plan.kind)) throw new Error('Unknown behavior barrier');
        if (!matchesBehaviorBarrier(plan.kind, phase, context)) return null;
        const state = states.get(plan.barrierId) ?? { claimed: 0, kind: plan.kind, parties: plan.parties };
        if (state.kind !== plan.kind || state.parties !== plan.parties) throw new Error('Behavior barrier identity changed');
        states.set(plan.barrierId, state);
        if (state.claimed >= plan.parties) return null;
        state.claimed++;
        return plan;
    },
    async pause(plan) {
        const deadline = Date.now() + 15000;
        while (Date.now() < deadline) {
            const value = readControl(path.join(directory, `${plan.barrierId}.release.json`));
            if (value) return Object.keys(value).sort().join(',') === 'barrierId,formatVersion,runId' && value.formatVersion === 1 && value.runId === runId && value.barrierId === plan.barrierId;
            await new Promise((resolve) => setTimeout(resolve, 10));
        }
        return false;
    }
});
