/** Pure adapters/assertions only. Importing this file performs no IO or execution. */
export const requireThat = (value, message) => { if (!value) throw new Error(message); };
const snake = (name) => name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
export const value = (row, name) => {
    requireThat(row && typeof row === 'object', 'Actual row/body required');
    if (Object.hasOwn(row, name)) return row[name];
    if (Object.hasOwn(row, snake(name))) return row[snake(name)];
    if (name === 'supersedesId') return row.supersedes_record_id;
    if (name === 'replacedById') return row.replaced_by_record_id;
    return undefined;
};
export const canonical = (input) => {
    if (input instanceof Date) return input.toISOString();
    if (Array.isArray(input)) {
        const rows = input.map(canonical);
        return rows.every((row) => row && typeof row === 'object' && typeof row.id === 'string')
            ? rows.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : rows;
    }
    if (input && typeof input === 'object') return Object.fromEntries(Object.keys(input).sort().map((key) => [key, canonical(input[key])]));
    return input;
};
export const equal = (actual, expected, message) => requireThat(JSON.stringify(canonical(actual)) === JSON.stringify(canonical(expected)), message);
export const uuidEqual = (actual, expected, message) => {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    requireThat(typeof actual === 'string' && typeof expected === 'string' && uuid.test(actual) && uuid.test(expected), `${message}: actual UUIDs required`);
    equal(actual.toLowerCase(), expected.toLowerCase(), message);
};
export const actualDate = (input, message) => requireThat(Number.isFinite(Date.parse(input instanceof Date ? input.toISOString() : input)), message);
export const rows = (map, table) => {
    requireThat(map && Array.isArray(map[table]), `Actual snapshot array ${table} required`);
    requireThat(map[table].every((row) => row && typeof row.id === 'string'), `${table}: actual row IDs required`);
    requireThat(new Set(map[table].map((row) => row.id)).size === map[table].length, `${table}: duplicate snapshot row`);
    return map[table];
};
export const one = (array, id) => {
    requireThat(Array.isArray(array), 'Actual array required');
    const found = array.filter((row) => row.id === id);
    requireThat(found.length === 1, `Expected one actual row ${id}`);
    return found[0];
};
export const body = (exchange, status) => {
    equal(exchange?.status, status, `Expected business HTTP ${status}`);
    requireThat(exchange.body && typeof exchange.body === 'object', 'Actual response body required');
    return exchange.body;
};
export const receipt = (state, name, status) => body(state?.[name], status);
export const flatCustomer = (exchange, status = 200) => {
    const row = body(exchange, status);
    requireThat(Object.hasOwn(row, 'id') && Object.hasOwn(row, 'rowVersion') && Object.hasOwn(row, 'ownerOrgName'), 'CustomerDetailView is a flat wire object, not body.customer');
    return row;
};
export const except = (row, names) => {
    const excluded = new Set(names.flatMap((name) => [name, snake(name)]));
    return Object.fromEntries(Object.entries(row).filter(([name]) => !excluded.has(name)));
};
export function noBusinessWrites(evidence) {
    requireThat(evidence?.beforeRows && evidence?.afterRows && Object.keys(evidence.beforeRows).length > 0, 'Actual nonempty beforeRows/afterRows required');
    requireThat(!Object.keys(evidence.beforeRows).some((name) => /session/i.test(name)), 'Auth upkeep belongs in separate evidence, not the business rollback oracle');
    equal(evidence.afterRows, evidence.beforeRows, 'Business no-op/rejected command changed the scoped graph');
}
export function onlyBusinessRowChange(evidence, table, id, fields, auditDelta = 0) {
    equal(Object.keys(evidence.afterRows ?? {}).sort(), Object.keys(evidence.beforeRows ?? {}).sort(), 'Before/after graph scope must agree');
    const before = one(rows(evidence.beforeRows, table), id);
    const after = one(rows(evidence.afterRows, table), id);
    equal(except(after, fields), except(before, fields), 'Unchanged entity fields were overwritten');
    equal(rows(evidence.afterRows, table).filter((row) => row.id !== id), rows(evidence.beforeRows, table).filter((row) => row.id !== id), 'Another entity was changed');
    const oldAudit = rows(evidence.beforeRows, 'audit_log'), newAudit = rows(evidence.afterRows, 'audit_log');
    for (const row of oldAudit) equal(one(newAudit, row.id), row, 'Historical audit row changed');
    const added = newAudit.filter((row) => !oldAudit.some((prior) => prior.id === row.id));
    equal(newAudit.length, oldAudit.length + auditDelta, 'Required audit cardinality');
    equal(added.length, auditDelta, 'Required audit delta');
    for (const name of Object.keys(evidence.beforeRows)) {
        if (name !== table && name !== 'audit_log') equal(evidence.afterRows[name], evidence.beforeRows[name], `Unrelated ${name} graph changed`);
    }
    return { before, after, addedAudit: added };
}
export function pendingSessionRolledBack(evidence, requestId) {
    const probe = evidence?.pendingSession;
    requireThat(probe?.due === true && probe?.authKeepaliveSeparated === true, 'Root must supply a real due business-managed session probe; independent auth upkeep is separate');
    equal(probe.requestId, requestId, 'Pending session probe must belong to the rejected request');
    requireThat(probe.before && probe.after, 'Actual managed-session before/after fields required');
    equal(probe.after, probe.before, 'Rejected business transaction committed its pending session mutation');
}
export function decimalUnits(input, scale = 2) {
    requireThat(typeof input === 'string' && /^-?\d+(\.\d+)?$/.test(input), 'Exact decimal string required');
    const negative = input.startsWith('-');
    const [whole, fraction = ''] = (negative ? input.slice(1) : input).split('.');
    requireThat(fraction.length <= scale, 'Published decimal scale exceeded');
    const amount = BigInt(whole) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(scale, '0') || '0');
    return negative ? -amount : amount;
}
