// Validation-owner closeout admission. Unknown writers retain their fixture.
import assert from 'node:assert/strict';
export function uiCleanupAdmission({ attempted, closed, windowsLifecycle }) {
    const reasons = [];
    for (const name of ['proxy', 'native', 'rust', 'browser']) {
        assert.equal(typeof attempted[name], 'boolean'); assert.equal(typeof closed[name], 'boolean');
        if (attempted[name] && !closed[name]) reasons.push(name + '-writer-not-proven-closed');
    }
    if (attempted.browser) {
        const stopped = windowsLifecycle?.windowsStop;
        if (stopped?.result !== 'owned-tree-stopped' || stopped.unregisteredProcessesStopped !== 0)
            reasons.push('windows-owned-process-tree-closeout-not-proven');
    }
    return { kind: 'all-actual-UI-writers-closed-before-observer-restore-or-fixture-cleanup', allowed: reasons.length === 0, reasons };
}
