// Finite, one-way request corpus: expectations execute the unchanged TS Zod.
export function requestCorpus(shared, sourceHead) {
    const cases = [];
    const schemas = ['AuditLogListQuery', 'EntityAuditLogListQuery', 'SecurityEventListQuery', 'RecordRouteDeniedSecurityEventRequest'];
    const seed = { path: '/platform/users', requiredPermissions: ['platform:users:manage'] };
    const add = (schema, name, value, inputRaw = value === undefined ? null : JSON.stringify(value)) => {
        let expected;
        try {
            const result = shared[schema + 'Schema'].safeParse(inputRaw === null ? undefined : JSON.parse(inputRaw));
            expected = result.success ? { success: true, dataRaw: JSON.stringify(result.data), ownKeys: Object.keys(result.data) } : { success: false, errors: result.error.issues };
        } catch (error) {
            expected = { success: false, schemaException: { name: error.name, message: error.message } };
        }
        cases.push({ schema, name, inputRaw, expected });
    };
    for (const schema of schemas) {
        for (const [name, value] of [['missing', undefined], ['null', null], ['array', []], ['number', 1], ['empty', {}]]) add(schema, name, value);
        add(schema, 'unknown-strip', schema.startsWith('Record') ? { ...seed, actorId: 'spoof', severity: 'high', unknown: true } : { unknown: true, offset: 2 });
    }
    const querySchemas = schemas.slice(0, 3);
    for (const schema of querySchemas) {
        const shape = shared[schema + 'Schema'].shape;
        add(schema, 'all-invalid', Object.fromEntries(Object.keys(shape).map(key => [key, false])));
        for (const [name, value] of [
            ['one', '1'], ['hundred', '100'], ['hex', '0x10'], ['binary', '0b10'], ['exponent', '1e2'], ['plus', '+2'], ['space', ' 2 '],
            ['empty', ''], ['blank', ' '], ['zero', '0'], ['negative', '-1'], ['fraction', '1.5'], ['above', '101'], ['nan', 'NaN'], ['infinity', 'Infinity'],
            ['null', null], ['boolean', true], ['one-array', ['2']], ['two-array', ['2', '3']], ['empty-array', []], ['object', {}], ['object-toString', { toString: null }],
            ['unsafe', '9007199254740992'], ['number', 2]
        ]) add(schema, 'limit:' + name, { limit: value });
        for (const [name, value] of [
            ['utc', '2026-10-28T01:02:03Z'], ['millis', '2026-10-28T01:02:03.123Z'], ['fraction', '2026-10-28T01:02:03.123456789123Z'],
            ['minutes', '2026-10-28T01:02Z'], ['offset', '2026-10-28T01:02:03+00:00'], ['lower', '2026-10-28t01:02:03z'], ['date', '2026-10-28'],
            ['leap', '2000-02-29T00:00:00Z'], ['non-leap', '1900-02-29T00:00:00Z'], ['year-zero', '0000-02-29T00:00:00Z'], ['invalid-day', '2026-02-30T00:00:00Z'],
            ['24h', '2026-10-28T24:00:00Z'], ['leap-second', '2026-10-28T01:02:60Z'], ['trailing-lf', '2026-10-28T01:02:03Z\n'],
            ['trailing-cr', '2026-10-28T01:02:03Z\r'], ['trailing-separator', '2026-10-28T01:02:03Z\u2028'], ['space', ' 2026-10-28T01:02:03Z'],
            ['null', null], ['array', ['2026-10-28T01:02:03Z']], ['bad', 'bad']
        ]) add(schema, 'from:' + name, { from: value });
        add(schema, 'reverse-range', { from: '2026-10-29T00:00:00Z', to: '2026-10-28T00:00:00Z' });
        for (const [field, def] of Object.entries(shape)) {
            if (['from', 'to', 'limit'].includes(field)) continue;
            const max = { eventType: 128, targetType: 64, targetId: 128, principal: 255, path: 255, permissionKey: 128 }[field];
            if (max) for (const [name, value] of [['empty', ''], ['space', ' '], ['null', null], ['array', []], ['above', 'x'.repeat(max + 1)], ['astral-at', '😀'.repeat(max)], ['astral-above', '😀'.repeat(max + 1)], ['lone', '\ud800'], ['length-object', { length: 0 }]]) add(schema, field + ':' + name, { [field]: value });
            else if (field === 'result') for (const value of ['', 'success', 'blocked', 'future', null, []]) add(schema, field + ':' + JSON.stringify(value), { [field]: value });
            else for (const value of ['a0000000-0000-4000-8000-000000000001', 'A0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF', 'a0000000000040008000000000000001', 'bad', null, []]) add(schema, field + ':' + JSON.stringify(value), { [field]: value });
        }
    }
    const schema = schemas[3];
    add(schema, 'minimal', seed);
    add(schema, 'return-null', { ...seed, returnUrl: null });
    add(schema, 'duplicate-permissions', { ...seed, requiredPermissions: ['project:read', 'lead:read', 'project:read'] });
    for (const [field, max] of [['path', 255], ['returnUrl', 255]]) for (const [name, value] of [
        ['empty', ''], ['space', ' '], ['null', null], ['false', false], ['array', []], ['object-length', { length: 0 }], ['object-length-nan', { length: {} }], ['object-length-throws', { length: { toString: null } }],
        ['at', 'x'.repeat(max)], ['above', 'x'.repeat(max + 1)], ['astral-at', '😀'.repeat(max)], ['astral-above', '😀'.repeat(max + 1)],
        ['lone-high', '\ud800'], ['lone-low', '\udc00'], ['nul', 'a\u0000b']
    ]) add(schema, field + ':' + name, { ...seed, [field]: value });
    for (const [name, value] of [['missing', undefined], ['null', null], ['empty', []], ['scalar', 'project:read'], ['empty-string', ''], ['wrong', ['future:permission']], ['mixed', [null, false, 'bad']], ['object', {}], ['object-length', { length: 0 }], ['object-length-nan', { length: {} }]]) add(schema, 'permissions:' + name, { ...seed, requiredPermissions: value });
    add(schema, 'duplicates-last-win', null, '{"path":"old","path":"new","requiredPermissions":["project:read"]}');
    add(schema, 'escaped-key-last-win', null, '{"path":"old","\\u0070ath":"new","requiredPermissions":["project:read"]}');
    return { formatVersion: 1, sourceHead, boundary: 'Original Zod schema execution only; finite inputs, no HTTP or database claim', schemas, cases };
}
