'use strict';

const { createHash } = require('node:crypto');

// Values and rows never enter SQL evidence. Keep a structural SQL witness plus
// a digest of the exact original statement, including casts and batch shape.
function sqlShape(text) {
    let result = '';
    for (let index = 0; index < text.length;) {
        const tail = text.slice(index);
        if (tail.startsWith('--')) {
            const end = text.indexOf('\n', index + 2);
            index = end < 0 ? text.length : end + 1;
            result += ' ';
        } else if (tail.startsWith('/*')) {
            let depth = 1;
            index += 2;
            while (index < text.length && depth) {
                if (text.startsWith('/*', index)) { depth++; index += 2; }
                else if (text.startsWith('*/', index)) { depth--; index += 2; }
                else index++;
            }
            result += ' ';
        } else if (text[index] === "'") {
            index++;
            while (index < text.length) {
                if (text[index] === '\\') index += 2;
                else if (text[index] === "'" && text[index + 1] === "'") index += 2;
                else if (text[index++] === "'") break;
            }
            result += '?text';
        } else if (/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/.test(tail)) {
            const delimiter = /^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/.exec(tail)[0];
            const end = text.indexOf(delimiter, index + delimiter.length);
            index = end < 0 ? text.length : end + delimiter.length;
            result += '?text';
        } else if (text[index] === '"') {
            const start = index++;
            while (index < text.length) {
                if (text[index] === '"' && text[index + 1] === '"') index += 2;
                else if (text[index++] === '"') break;
            }
            result += text.slice(start, index);
        } else {
            const number = /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i.exec(tail);
            if (number && !/[A-Za-z0-9_$]/.test(text[index - 1] ?? '')) { result += '?number'; index += number[0].length; }
            else result += text[index++];
        }
    }
    return result.replace(/\s+/g, ' ').trim();
}

function describeSql(text) {
    const shape = sqlShape(text);
    const unquoted = shape.replaceAll('"', '');
    const command = /^(?:\s*\(?\s*)?(BEGIN|START\s+TRANSACTION|COMMIT|ROLLBACK\s+TO|ROLLBACK|SAVEPOINT|RELEASE|SELECT|UPDATE|INSERT|DELETE|WITH|SET|SHOW)\b/i.exec(unquoted)?.[1]?.toUpperCase().replace(/\s+/g, ' ') ?? 'UNRECOGNIZED';
    const relations = [...new Set([...unquoted.matchAll(/\bpoms\.([a-z_][a-z0-9_]*)\b/gi)].map((match) => match[1].toLowerCase()))];
    return {
        command: command === 'START TRANSACTION' ? 'BEGIN' : command,
        statement: `${command}${relations.length ? ` poms.${relations.join(',poms.')}` : ''}`,
        sqlShape: shape,
        sqlSha256: createHash('sha256').update(text).digest('hex'),
        relations
    };
}

function matchesBarrier(kind, phase, description) {
    const shape = description.sqlShape.replaceAll('"', '').toLowerCase();
    if (kind === 'after-org-select') return phase === 'after' && description.command === 'SELECT' && description.relations.includes('org_unit') && /order by/.test(shape) && /display_order/.test(shape) && /created_at/.test(shape) && !/\bwhere\b/.test(shape);
    if (kind === 'after-org-code-select') return phase === 'after' && description.command === 'SELECT' && description.relations.includes('org_unit') && /\bwhere\b.*\bcode\b/.test(shape);
    if (kind === 'before-org-update') return phase === 'before' && description.command === 'UPDATE' && description.relations.includes('org_unit');
    if (kind === 'before-managed-session-update') return phase === 'before' && description.command === 'UPDATE' && description.relations.includes('auth_session') && /\bwhere\b.*\brow_version\b/.test(shape);
    return false;
}

function installQueryCapture(Client, { append, onFailure = () => undefined, barrierFor = () => null, pause = async () => undefined, shouldCapture = () => true }) {
    const original = Client.prototype.query;
    const connections = new WeakMap();
    let connectionSequence = 0;
    let querySequence = 0;
    let sequence = 0;
    let incomplete = false;
    function fail() {
        incomplete = true;
        try { onFailure(); } catch { /* Evidence failure cannot change SQL semantics. */ }
    }
    function emit(row) {
        try { append({ sequence: ++sequence, at: new Date().toISOString(), ...row, captureIncomplete: incomplete }); }
        catch { fail(); }
    }
    function record(context, phase, error, value) {
        const results = Array.isArray(value) ? value : value ? [value] : [];
        emit({ ...context, phase, rowCount: Number.isInteger(value?.rowCount) ? value.rowCount : null,
            resultCommands: results.map((entry) => entry?.command).filter((entry) => typeof entry === 'string' && /^[A-Z ]+$/.test(entry)),
            resultRowCounts: results.map((entry) => Number.isInteger(entry?.rowCount) ? entry.rowCount : null),
            code: typeof error?.code === 'string' && /^[0-9A-Z]{5}$/.test(error.code) ? error.code : null });
    }
    function getBarrier(phase, context) {
        try { return barrierFor(phase, context); } catch { fail(); return null; }
    }
    async function wait(plan, context) {
        emit({ ...context, phase: 'barrier-hit', barrierId: plan.barrierId, barrierKind: plan.kind });
        try {
            const released = await pause(plan, context);
            if (released !== true) { fail(); emit({ ...context, phase: 'barrier-timeout', barrierId: plan.barrierId, barrierKind: plan.kind }); }
            else emit({ ...context, phase: 'barrier-release', barrierId: plan.barrierId, barrierKind: plan.kind });
        } catch { fail(); emit({ ...context, phase: 'barrier-error', barrierId: plan.barrierId, barrierKind: plan.kind }); }
    }
    Client.prototype.query = function (...args) {
        // Root fixture/catalog traffic is outside admitted HTTP capture.
        if (!shouldCapture()) return original.apply(this, args);
        const text = typeof args[0] === 'string' ? args[0] : args[0]?.text;
        if (!connections.has(this)) connections.set(this, ++connectionSequence);
        const context = { queryId: ++querySequence, connection: connections.get(this),
            backendPid: Number.isInteger(this.processID) && this.processID > 0 ? this.processID : null,
            ...(typeof text === 'string' ? describeSql(text) : { command: 'UNRECOGNIZED', statement: 'UNRECOGNIZED', sqlShape: null, sqlSha256: null, relations: [] }),
            parameterCount: Array.isArray(args[1]) ? args[1].length : Array.isArray(args[0]?.values) ? args[0].values.length : 0 };
        if (context.command === 'UNRECOGNIZED') fail();
        if (typeof text !== 'string' || args.some((value) => typeof value === 'function') || typeof args[0]?.callback === 'function' || typeof args[0]?.submit === 'function') {
            fail(); record(context, 'unsupported'); return original.apply(this, args);
        }
        const invoke = () => {
            record(context, 'start');
            let promise;
            try { promise = original.apply(this, args); }
            catch (error) { record(context, 'error', error); throw error; }
            if (!promise || typeof promise.then !== 'function') { fail(); record(context, 'unsupported'); return promise; }
            const after = getBarrier('after', context);
            if (after) return promise.then(async (value) => { record(context, 'end', null, value); await wait(after, context); return value; }, (error) => { record(context, 'error', error); throw error; });
            promise.then((value) => record(context, 'end', null, value), (error) => record(context, 'error', error));
            return promise;
        };
        const before = getBarrier('before', context);
        if (before) return wait(before, context).then(invoke);
        return invoke();
    };
    return { uninstall() { Client.prototype.query = original; }, isIncomplete() { return incomplete; } };
}

module.exports = { sqlShape, describeSql, matchesBarrier, installQueryCapture };
