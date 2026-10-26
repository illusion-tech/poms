'use strict';
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { fixtureCommand } = require('./fixture-protocol.cjs');

function invokeFixture(request) {
    const command = fixtureCommand();
    return new Promise((resolve, reject) => {
        const child = spawn(command.executable, command.args, { cwd: command.cwd, env: command.env, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
        let stdout = '';
        let settled = false;
        const finish = (error, result) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (error) {
                child.kill();
                child.stdin.destroy();
                reject(error);
            } else resolve(result);
        };
        const timer = setTimeout(() => {
            child.kill();
            child.stdin.destroy();
            child.stdout.destroy();
            child.stderr.destroy();
            finish(new Error('R2A fixture timed out; preserve its run journal for cleanup'));
        }, 60000);
        child.on('error', () => finish(new Error('R2A fixture could not start')));
        child.stdin.on('error', () => finish(new Error('R2A fixture stdin failed')));
        child.stdout.on('data', (chunk) => {
            stdout += chunk.toString('utf8');
            if (stdout.length > 1024 * 1024) finish(new Error('R2A fixture exceeded protocol output limit'));
        });
        // pg/library errors may carry connection details; never reflect stderr.
        child.stderr.resume();
        child.on('close', (code) => {
            if (settled) return;
            if (code !== 0) return finish(new Error('R2A fixture rejected the guarded operation'));
            try {
                const result = JSON.parse(stdout);
                assert.equal(result.formatVersion, 1);
                for (const key of ['runId', 'backend', 'action']) assert.equal(result[key], request[key]);
                assert(Number.isSafeInteger(result.matched) && result.matched >= 0);
                assert(Number.isSafeInteger(result.changed) && result.changed >= 0);
                assert.equal(typeof result.state, 'string');
                assert(Object.keys(result).every((key) => ['formatVersion', 'runId', 'backend', 'action', 'matched', 'changed', 'state', 'snapshot'].includes(key)));
                if (request.action === 'snapshot') assert(result.snapshot?.session && Array.isArray(result.snapshot.audits) && Array.isArray(result.snapshot.securityEvents));
                else assert(!Object.hasOwn(result, 'snapshot'));
                finish(null, result);
            } catch {
                finish(new Error('R2A fixture returned invalid protocol output'));
            }
        });
        child.stdin.end(JSON.stringify(request));
    });
}
module.exports = { invokeFixture };
