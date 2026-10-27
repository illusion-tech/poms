// One-way execution corpus; original shared Zod schemas own all expected results.
export function golden(shared, sourceHead) {
    const cases = [];
    function add(schema, name, value, raw = value === undefined ? null : JSON.stringify(value), ownUndefined = false) {
        let expected;
        try {
            const parsed = shared[`${schema}Schema`].safeParse(ownUndefined ? value : raw === null ? undefined : JSON.parse(raw));
            expected = parsed.success ? { success: true, dataRaw: JSON.stringify(parsed.data), ownKeys: Object.keys(parsed.data) } : { success: false, errors: parsed.error.issues };
        } catch (error) {
            expected = { success: false, internalError: { name: error.name, message: error.message } };
        }
        cases.push({ schema, name, inputRaw: raw, nonWireOwnUndefined: ownUndefined, expected });
    }
    const schemas = ['CreateOrgUnitRequest', 'UpdateOrgUnitRequest', 'UpdateOrgUnitActivationRequest', 'MoveOrgUnitRequest'];
    for (const schema of schemas)
        for (const [name, value] of [
            ['missing', undefined],
            ['null', null],
            ['array', []],
            ['string', 'x'],
            ['empty', {}],
            ['unknown-only', { unknown: '\ud800', isActive: false, expectedVersion: schema === 'UpdateOrgUnitActivationRequest' ? undefined : 123 }]
        ])
            add(schema, name, value);
    const base = { name: ' Name ', code: ' Code ' };
    add('CreateOrgUnitRequest', 'minimal-trim', base);
    add('CreateOrgUnitRequest', 'nullable', { ...base, description: null, parentId: null, displayOrder: 0 });
    add('CreateOrgUnitRequest', 'strip', { ...base, isActive: false, rowVersion: 444, unknown: '\ud800' });
    add('CreateOrgUnitRequest', 'own-undefined', { ...base, description: undefined, parentId: undefined, displayOrder: undefined }, null, true);
    add('UpdateOrgUnitRequest', 'own-undefined', { name: undefined, code: undefined, description: undefined, displayOrder: undefined }, null, true);
    add('MoveOrgUnitRequest', 'own-undefined', { parentId: undefined, displayOrder: undefined }, null, true);
    add('MoveOrgUnitRequest', 'null-parent', { parentId: null });
    add('MoveOrgUnitRequest', 'reason-only', { reason: 'why', expectedVersion: 123 });
    add('UpdateOrgUnitRequest', 'clear-description', { description: null });
    add('UpdateOrgUnitActivationRequest', 'untrimmed', { reason: ' ', comment: ' c ', expectedVersion: 999 });
    for (const [schema, fields, seed] of [
        [
            'CreateOrgUnitRequest',
            [
                ['name', 128, true],
                ['code', 64, true],
                ['description', 1000, false]
            ],
            base
        ],
        [
            'UpdateOrgUnitRequest',
            [
                ['name', 128, true],
                ['code', 64, true],
                ['description', 1000, false]
            ],
            {}
        ],
        [
            'UpdateOrgUnitActivationRequest',
            [
                ['reason', 1000, false],
                ['comment', 1000, false]
            ],
            {}
        ],
        ['MoveOrgUnitRequest', [['reason', 1000, false]], { parentId: null }]
    ]) {
        for (const [field, max] of fields) {
            for (const [name, value] of [
                ['null', null],
                ['empty', ''],
                ['space', ' '],
                ['lone-high', '\ud800'],
                ['lone-low', '\udc00'],
                ['trim-set', '\ufeff\u00a0x\u202f'],
                ['not-trim', '\u0085x\u0085'],
                ['astral-at-limit', '😀'.repeat(max)],
                ['astral-above-limit', '😀'.repeat(max + 1)],
                ['array', []],
                ['long-array', Array(max + 1).fill(null)],
                ['length-large', { length: max + 1 }],
                ['length-nan', { length: {} }],
                ['length-unconvertible', { length: { toString: null } }]
            ])
                add(schema, `${field}:${name}`, { ...seed, [field]: value });
        }
    }
    const ids = [
        'a0000000-0000-4000-8000-000000000001',
        'A0000000-0000-4000-8000-000000000001',
        '00000000-0000-0000-0000-000000000000',
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
        'a0000000-0000-8000-8000-000000000001',
        'a0000000-0000-0000-8000-000000000001',
        'a0000000-0000-9000-8000-000000000001',
        'a0000000-0000-4000-0000-000000000001',
        ' a0000000-0000-4000-8000-000000000001 ',
        'a0000000000040008000000000000001',
        'urn:uuid:a0000000-0000-4000-8000-000000000001',
        1,
        null
    ];
    for (const schema of ['CreateOrgUnitRequest', 'MoveOrgUnitRequest']) for (const value of ids) add(schema, `parentId:${JSON.stringify(value)}`, { ...(schema === 'CreateOrgUnitRequest' ? base : {}), parentId: value });
    for (const [schema, seed] of [
        ['CreateOrgUnitRequest', base],
        ['UpdateOrgUnitRequest', {}],
        ['MoveOrgUnitRequest', {}]
    ]) {
        for (const rawNumber of ['-1', '-0', '0', '1', '1.5', '-1.5', '2147483648', '9007199254740991', '9007199254740992', '-9007199254740992', '1e999', '1.00000000000000001', '9007199254740990.9', '"3"', 'true', 'null']) {
            const rawSeed = JSON.stringify(seed);
            add(schema, `displayOrder:${rawNumber}`, null, rawSeed.slice(0, -1) + (Object.keys(seed).length ? ',' : '') + '"displayOrder":' + rawNumber + '}');
        }
    }
    for (const schema of ['UpdateOrgUnitActivationRequest', 'MoveOrgUnitRequest'])
        for (const rawNumber of ['-1', '-0', '0', '1', '1.5', '2147483648', '9007199254740991', '9007199254740992', '1e999', '"3"', 'null'])
            add(schema, `expectedVersion:${rawNumber}`, null, '{' + (schema === 'MoveOrgUnitRequest' ? '"parentId":null,' : '') + '"expectedVersion":' + rawNumber + '}');

    for (const schema of ['CreateOrgUnitRequest', 'MoveOrgUnitRequest']) {
        for (const parentId of ['FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF', 'a0000000-0000-4000-B000-000000000001', '\ud800']) add(schema, 'extra-uuid:' + JSON.stringify(parentId), { ...(schema === 'CreateOrgUnitRequest' ? base : {}), parentId });
    }
    add('UpdateOrgUnitRequest', 'duplicates-last-key-wins', null, '{"description":"old","description":null}');
    add('CreateOrgUnitRequest', 'duplicate-escaped-name', null, '{"name":"old","\\u006eame":"new","code":"code"}');
    add('UpdateOrgUnitRequest', 'prototype-keys', null, '{"__proto__":{"name":"bad"},"constructor":true,"description":null}');
    add('UpdateOrgUnitRequest', 'all-invalid', { name: 1, code: null, description: true, displayOrder: '3' });
    add('MoveOrgUnitRequest', 'all-invalid', { parentId: false, displayOrder: '3', reason: 1, expectedVersion: null });
    add('CreateOrgUnitRequest', 'null-character', { name: 'N\u0000', code: 'code', description: '\u0000' });
    return {
        formatVersion: 1,
        sourceHead,
        oracle: 'Actual original current shared Zod4.6.1 schemas; complete parsed payload and issues; non-wire own undefined explicitly labeled',
        wireCases: cases.filter((entry) => !entry.nonWireOwnUndefined).length,
        nonWireCases: cases.filter((entry) => entry.nonWireOwnUndefined).length,
        cases
    };
}
