'use strict';

// SQL observations only. Never retain parameter values, result rows, passwords
// or token hashes. UUID normalization here identifies an observer-owned target;
// it never changes the SQL or the original product's UUID/string semantics.
const { describeSql } = require('../rust-r2c/witness-query-core.cjs');

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const column = '(?:[a-z_][a-z0-9_]*\\.)?';
const atom = "(?:\\$[1-9][0-9]*|'(?:[^']|'')*'|null|default|true|false|[0-9]+)";
const barrierSpecs = Object.freeze({
    'after-user-by-id-select': { phase: 'after', table: 'platform_user', command: 'SELECT', target: 'targetUserId' },
    'after-user-username-select': { phase: 'after', table: 'platform_user', command: 'SELECT', target: 'targetUsername' },
    'after-users-list-select': { phase: 'after', table: 'platform_user', command: 'SELECT', structural: true },
    'after-roles-by-ids-select': { phase: 'after', table: 'role', command: 'SELECT', target: 'targetRoleId' },
    'after-roles-list-select': { phase: 'after', table: 'role', command: 'SELECT', structural: true },
    'after-orgs-list-select': { phase: 'after', table: 'org_unit', command: 'SELECT', structural: true },
    'after-role-assignments-select': { phase: 'after', table: 'user_role_assignment', command: 'SELECT', structural: true },
    'after-org-memberships-select': { phase: 'after', table: 'user_org_membership', command: 'SELECT', structural: true },
    'after-role-permissions-select': { phase: 'after', table: 'role_permission_assignment', command: 'SELECT', structural: true },
    'after-role-assignments-delete': { phase: 'after', table: 'user_role_assignment', command: 'DELETE', target: 'targetUserId' },
    'after-org-memberships-delete': { phase: 'after', table: 'user_org_membership', command: 'DELETE', target: 'targetUserId' },
    'before-user-insert': { phase: 'before', table: 'platform_user', command: 'INSERT', target: 'targetUsername' },
    'before-user-cas-update': { phase: 'before', table: 'platform_user', command: 'UPDATE', target: 'targetUserId' },
    'before-role-assignments-insert': { phase: 'before', table: 'user_role_assignment', command: 'INSERT', target: 'targetUserId', secondTarget: 'targetRoleId' },
    'before-org-memberships-insert': { phase: 'before', table: 'user_org_membership', command: 'INSERT', target: 'targetUserId', secondTarget: 'targetOrgId' },
    'after-raw-session-touch': { phase: 'after', table: 'auth_session', command: 'UPDATE', target: 'targetSessionId' },
    'before-managed-session-update': { phase: 'before', table: 'auth_session', command: 'UPDATE', target: 'targetSessionId' },
    'before-audit-insert': { phase: 'before', table: 'audit_log', command: 'INSERT', target: 'targetUserId' },
    'after-audit-insert': { phase: 'after', table: 'audit_log', command: 'INSERT', target: 'targetUserId' }
});
for (const spec of Object.values(barrierSpecs)) Object.freeze(spec);

function canonicalUuid(value) {
    if (typeof value !== 'string') return null;
    const unwrapped = /^\{[^{}]+\}$/.test(value) ? value.slice(1, -1) : value;
    if (!/^(?:[0-9a-f]{32}|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/i.test(unwrapped)) return null;
    const compact = unwrapped.replaceAll('-', '').toLowerCase();
    return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
}

// Retain SQL structure and literals privately for a whitelisted target match.
// Comments are never interpreted as a predicate. Quoted identifier tricks and
// multi-statements are rejected rather than heuristically accepted.
function privateSql(text) {
    if (typeof text !== 'string') return null;
    let value = '', quoted = false;
    for (let index = 0; index < text.length;) {
        if (text[index] === "'") {
            const start = index++;
            let closed = false;
            while (index < text.length) {
                if (text[index] === "'" && text[index + 1] === "'") index += 2;
                else if (text[index++] === "'") { closed = true; break; }
            }
            if (!closed) return null;
            value += text.slice(start, index);
        } else if (text[index] === '"') {
            const match = /^"([A-Za-z_][A-Za-z0-9_]*)"/.exec(text.slice(index));
            if (!match) return null;
            value += match[1].toLowerCase(); index += match[0].length;
        } else if (text.startsWith('--', index)) {
            const end = text.indexOf('\n', index + 2); index = end < 0 ? text.length : end + 1; value += ' ';
        } else if (text.startsWith('/*', index)) {
            let depth = 1; index += 2;
            while (index < text.length && depth) {
                if (text.startsWith('/*', index)) { depth++; index += 2; }
                else if (text.startsWith('*/', index)) { depth--; index += 2; }
                else index++;
            }
            if (depth) return null;
            value += ' ';
        } else if (text[index] === '$' && /^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/.test(text.slice(index))) return null;
        else { value += text[index].toLowerCase(); index++; }
    }
    // A semicolon inside a string is data, not an additional statement.
    for (let index = 0; index < value.length; index++) {
        if (value[index] === "'") {
            if (quoted && value[index + 1] === "'") index++;
            else quoted = !quoted;
        } else if (!quoted && value[index] === ';' && value.slice(index + 1).trim()) return null;
    }
    return value.replace(/;\s*$/, '').replace(/\s+/g, ' ').trim();
}

function queryInput(args) {
    if (!Array.isArray(args)) return { text: null, values: [] };
    return { text: typeof args[0] === 'string' ? args[0] : args[0]?.text,
        values: Array.isArray(args[1]) ? args[1] : Array.isArray(args[0]?.values) ? args[0].values : [] };
}

function atomValue(value, values) {
    const text = value.trim();
    if (/^\$[1-9][0-9]*$/.test(text)) return values[Number(text.slice(1)) - 1];
    if (/^'(?:[^']|'')*'$/.test(text)) return text.slice(1, -1).replaceAll("''", "'");
    return undefined;
}

function parts(sql) {
    const where = /\bwhere\b([\s\S]*?)(?=\breturning\b|\border by\b|\blimit\b|$)/.exec(sql)?.[1]?.trim() ?? '';
    const order = /\border by\b([\s\S]*?)(?=\blimit\b|\breturning\b|$)/.exec(sql)?.[1]?.trim() ?? '';
    const returning = /\breturning\b([\s\S]*)$/.exec(sql)?.[1]?.trim() ?? '';
    return { where, order, returning };
}

function simpleEquality(where, field) { return new RegExp(`^${column}${field}\\s*=\\s*${atom}$`).test(where); }

// Accept complete positive predicates, never merely an id/version substring:
// NOT(id=$n), id=$n IS FALSE and extra boolean expressions can select another
// row while containing the declared UUID. Parentheses are grouping only in
// this deliberately small grammar; function calls cannot satisfy its terms.
function positiveConjunction(where, predicates) {
    const normalized = where.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
    const clauses = normalized.split(/\s+and\s+/);
    return clauses.length === predicates.length && predicates.every((predicate) => clauses.filter((clause) => new RegExp(`^${predicate}$`).test(clause)).length === 1);
}

function positiveCas(where) {
    return positiveConjunction(where, [`${column}id\\s*=\\s*${atom}`, `${column}row_version\\s*=\\s*(?:\\$[1-9][0-9]*|[0-9]+)`]);
}

function positiveRawTouch(where) {
    return positiveConjunction(where, [
        `${column}id\\s*=\\s*${atom}`, `${column}status\\s*=\\s*${atom}`,
        `${column}last_seen_at\\s*<=\\s*${atom}`, `${column}idle_expires_at\\s*>\\s*${atom}`, `${column}absolute_expires_at\\s*>\\s*${atom}`
    ]);
}

function equalityValues(where, field, values) {
    const pattern = new RegExp(`(?:^|[ (])${column}${field}\\s*=\\s*(${atom})(?=\\s|\\)|$)`, 'g');
    return [...where.matchAll(pattern)].map((match) => atomValue(match[1], values));
}

function matchesUuidValue(actual, target) { return uuid.test(target ?? '') && canonicalUuid(actual) === target; }
function hasTarget(where, field, values, target) { return equalityValues(where, field, values).some((value) => matchesUuidValue(value, target)); }
function versionPredicate(where) { return new RegExp(`(?:^|[ (])${column}row_version\\s*=\\s*(?:\\$[1-9][0-9]*|[0-9]+)(?=\\s|\\)|$)`).test(where); }

function directTable(sql, command, table) {
    const relation = `poms\\.${table}\\b`;
    if (command === 'SELECT') return new RegExp(`^select [\\s\\S]+ from ${relation}(?:\\s+as\\s+[a-z_][a-z0-9_]*)?(?=\\s|$)`).test(sql);
    if (command === 'DELETE') return new RegExp(`^delete from ${relation}(?=\\s|$)`).test(sql);
    if (command === 'UPDATE') return new RegExp(`^update ${relation} set\\b`).test(sql);
    return new RegExp(`^insert into ${relation}\\s*\\(`).test(sql);
}

function orderMatches(order, fields) {
    const actual = order.split(',').map((entry) => entry.trim().replace(/^[a-z_][a-z0-9_]*\./, ''));
    return actual.length === fields.length && actual.every((entry, index) => entry === fields[index]);
}

function insertRows(sql, values) {
    const match = /^insert into poms\.[a-z_][a-z0-9_]*\s*\(([^)]+)\)\s+values\s+([\s\S]+?)(?:\s+returning\s+[\s\S]+)?$/.exec(sql);
    if (!match) return [];
    const columns = match[1].split(',').map((entry) => entry.trim());
    if (columns.some((entry) => !/^[a-z_][a-z0-9_]*$/.test(entry)) || new Set(columns).size !== columns.length) return [];
    const rows = [];
    let tail = match[2].trim();
    const rowPattern = new RegExp(`^\\(\\s*(${atom}(?:\\s*,\\s*${atom})*)\\s*\\)`);
    const valuePattern = new RegExp(atom, 'g');
    while (tail) {
        const row = rowPattern.exec(tail); if (!row) return [];
        const entries = [...row[1].matchAll(valuePattern)].map((entry) => atomValue(entry[0], values));
        if (entries.length !== columns.length) return [];
        rows.push(Object.fromEntries(columns.map((name, index) => [name, entries[index]])));
        tail = tail.slice(row[0].length).trim();
        if (tail) { if (!tail.startsWith(',')) return []; tail = tail.slice(1).trim(); if (!tail) return []; }
    }
    return rows;
}

function matchesUserQuery(kind, phase, description, args, target = {}) {
    const spec = barrierSpecs[kind];
    if (!spec || spec.phase !== phase || description?.command !== spec.command || !Array.isArray(description.relations) || description.relations.length !== 1 || description.relations[0] !== spec.table) return false;
    const { text, values } = queryInput(args), sql = privateSql(text);
    if (!sql || !directTable(sql, spec.command, spec.table) || /\b(?:join|union|intersect|except|for update|for share)\b/.test(sql) || /\bselect\b[\s\S]*\bselect\b/.test(sql)) return false;
    // Bind the private original statement to the sanitized capture descriptor.
    if (describeSql(text).sqlSha256 !== description.sqlSha256) return false;
    const { where, order, returning } = parts(sql);
    if (/\bor\b/.test(where)) return false;
    if (kind === 'after-user-by-id-select') return simpleEquality(where, 'id') && hasTarget(where, 'id', values, target.targetUserId) && !order;
    if (kind === 'after-user-username-select') return simpleEquality(where, 'username') && equalityValues(where, 'username', values).includes(target.targetUsername) && typeof target.targetUsername === 'string' && !order;
    if (kind === 'after-roles-by-ids-select') {
        if (simpleEquality(where, 'id') && hasTarget(where, 'id', values, target.targetRoleId)) return true;
        const match = new RegExp(`^${column}id\\s+in\\s*\\(([^)]+)\\)$`).exec(where);
        if (match) return match[1].split(',').some((entry) => matchesUuidValue(atomValue(entry, values), target.targetRoleId));
        const any = new RegExp(`^${column}id\\s*=\\s*any\\(\\s*(\\$[1-9][0-9]*)(?:::[a-z_][a-z0-9_]*\\[\\])?\\s*\\)$`).exec(where);
        const array = any && atomValue(any[1], values);
        return Array.isArray(array) && array.some((entry) => matchesUuidValue(entry, target.targetRoleId));
    }
    if (kind === 'after-users-list-select') return !where && orderMatches(order, ['created_at desc']);
    if (kind === 'after-roles-list-select' || kind === 'after-orgs-list-select') return !where && orderMatches(order, ['display_order asc', 'created_at asc']);
    if (['after-role-assignments-select', 'after-org-memberships-select', 'after-role-permissions-select'].includes(kind)) return new RegExp(`^${column}status\\s*=\\s*${atom}$`).test(where) && !order && equalityValues(where, 'status', values).includes('active');
    if (kind === 'after-role-assignments-delete' || kind === 'after-org-memberships-delete') return new RegExp(`^${column}user_id\\s*=\\s*${atom}$`).test(where) && hasTarget(where, 'user_id', values, target.targetUserId);
    if (kind === 'before-user-cas-update') return positiveCas(where) && hasTarget(where, 'id', values, target.targetUserId) && /^(?:[a-z_][a-z0-9_]*\.)?row_version$/.test(returning);
    if (kind === 'before-managed-session-update') return positiveCas(where) && hasTarget(where, 'id', values, target.targetSessionId) && /^(?:[a-z_][a-z0-9_]*\.)?row_version$/.test(returning) && !/\b(?:coalesce|least)\s*\(/.test(sql);
    if (kind === 'after-raw-session-touch') return positiveRawTouch(where) && hasTarget(where, 'id', values, target.targetSessionId) && !versionPredicate(where) && /\bcoalesce\s*\(/.test(sql) && /\bleast\s*\(/.test(sql) && equalityValues(where, 'status', values).includes('active') && /\blast_seen_at\b/.test(returning);
    const rows = insertRows(sql, values);
    if (kind === 'before-user-insert') return rows.some((row) => row.username === target.targetUsername && typeof target.targetUsername === 'string');
    if (kind === 'before-role-assignments-insert') return rows.some((row) => matchesUuidValue(row.user_id, target.targetUserId) && matchesUuidValue(row.role_id, target.targetRoleId));
    if (kind === 'before-org-memberships-insert') return rows.some((row) => matchesUuidValue(row.user_id, target.targetUserId) && matchesUuidValue(row.org_unit_id, target.targetOrgId));
    if (kind === 'before-audit-insert' || kind === 'after-audit-insert') return rows.some((row) => matchesUuidValue(row.target_id, target.targetUserId) && row.target_type === 'PlatformUser' && (!target.targetEventType || row.event_type === target.targetEventType));
    return false;
}

module.exports = { barrierSpecs, canonicalUuid, matchesUserQuery };
