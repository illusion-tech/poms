'use strict';
// Fixed run-owned targets. No caller may register arbitrary IDs, keys or SQL.
const slots = Object.freeze(['main','second','utf16-name','utf16-description','utf16-key','order-overflow','duplicate','race','unicode','unknown-system','ui','session-cas','role-cas','permission-race']);
function roleFixtureSpec(runId, slot) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(runId) || !slots.includes(slot)) throw new Error('invalid_role_fixture');
    const roleKey = `r2b_${runId.replaceAll('-','')}_${slot}${slot === 'utf16-key' ? '\ud800' : ''}`;
    return Object.freeze({ roleKey, databaseKey: Buffer.from(roleKey,'utf8').toString('utf8'), name: `R2B ${slot}${slot === 'utf16-name' ? '\ud800' : ''}`, description: slot === 'utf16-description' ? '\ud800' : null, displayOrder: slot === 'order-overflow' ? 2147483648 : 0 });
}
module.exports = { roleFixtureSpec, roleFixtureSlots: slots };
