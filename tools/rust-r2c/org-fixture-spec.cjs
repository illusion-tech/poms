'use strict';
// Exact run-owned creation intents. Slots never accept arbitrary IDs or SQL.
const orgFixtureSlots = Object.freeze([
    'main',
    'second',
    'child',
    'grandchild',
    'sibling',
    'inactive-parent',
    'inactive-child',
    'utf16-name',
    'utf16-description',
    'utf16-code',
    'order-overflow',
    'max-order',
    'negative-order',
    'negative-default',
    'nullable',
    'unicode',
    'cascade-root',
    'cascade-a',
    'cascade-b',
    'cascade-c',
    'cascade-d',
    'cascade-e',
    'race-code-a',
    'race-code-b',
    'race-name-a',
    'race-name-b',
    'session-cas',
    'org-cas',
    'ui-root',
    'ui-child',
    'ui-grandchild',
    'ui-target',
    'tie-a',
    'tie-b',
    'tie-c',
    'tie-d'
]);
function orgFixtureSpec(runId, slot) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(runId) || !orgFixtureSlots.includes(slot)) throw new Error('invalid_org_fixture');
    const code = `r2c_${runId.replaceAll('-', '')}_${slot}${slot === 'utf16-code' ? '\ud800' : ''}`;
    return Object.freeze({
        code,
        databaseCode: Buffer.from(code, 'utf8').toString('utf8'),
        name: `R2C ${slot} ${runId.slice(0, 8)}${slot === 'utf16-name' ? '\ud800' : ''}`,
        description: slot === 'utf16-description' ? '\ud800' : slot === 'nullable' ? 'initial non-null description' : null,
        displayOrder: slot === 'order-overflow' ? 2147483648 : slot === 'max-order' ? 2147483647 : slot === 'negative-default' ? -2147483647 : 0
    });
}
module.exports = { orgFixtureSpec, orgFixtureSlots };
