'use strict';
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { fixtureCommand, parseFixtureRequest } = require('./fixture-protocol.cjs');
function invokeFixture(request) {
    parseFixtureRequest(Buffer.from(JSON.stringify(request)));
    const command = fixtureCommand();
    return new Promise((resolve, reject) => {
        const child = spawn(command.executable, command.args, { cwd: command.cwd, env: command.env, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
        let out = '',
            settled = false;
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
            finish(new Error('R2IJ fixture timed out; preserve run journal for cleanup'));
        }, 60000);
        child.on('error', () => finish(new Error('R2IJ fixture could not start')));
        child.stdin.on('error', () => finish(new Error('R2IJ fixture stdin failed')));
        child.stdout.setEncoding('utf8');
        child.stdout.on('data', (chunk) => {
            out += chunk;
            if (out.length > 8 * 1024 * 1024) finish(new Error('R2IJ fixture exceeded output limit'));
        });
        let codeOnly = '';
        child.stderr.on('data', (chunk) => {
            const text = chunk.toString('utf8');
            for (const match of text.matchAll(/"code":"([a-z_]+)"/g)) codeOnly = match[1];
        });
        child.on('close', (code) => {
            if (settled) return;
            if (code !== 0) return finish(new Error(`R2IJ fixture rejected guarded operation${codeOnly ? `: ${codeOnly}` : ''}`));
            try {
                const result = JSON.parse(out);
                assert.equal(result.formatVersion, 1);
                for (const k of ['runId', 'backend', 'action']) assert.equal(result[k], request[k]);
                assert(Number.isSafeInteger(result.matched) && result.matched >= 0);
                assert(Number.isSafeInteger(result.changed) && result.changed >= 0);
                assert.equal(typeof result.state, 'string');
                assert(Object.keys(result).every((k) => ['formatVersion', 'runId', 'backend', 'action', 'matched', 'changed', 'state', 'fixture', 'user', 'snapshot', 'facts', 'cleanup'].includes(k)));
                if (request.action === 'snapshot') assert(result.snapshot?.session && Array.isArray(result.snapshot.audits) && Array.isArray(result.snapshot.securityEvents));
                finish(null, result);
            } catch {
                finish(new Error('R2IJ fixture returned invalid protocol output'));
            }
        });
        child.stdin.end(JSON.stringify(request));
    });
}
module.exports = { invokeFixture };
