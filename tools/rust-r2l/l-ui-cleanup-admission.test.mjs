import test from 'node:test';
import assert from 'node:assert/strict';
import { uiCleanupAdmission } from './l-ui-cleanup-admission.mjs';
const complete = () => ({ attempted: { proxy: true, native: true, rust: true, browser: true },
    closed: { proxy: true, native: true, rust: true, browser: true },
    windowsLifecycle: { windowsStop: { result: 'owned-tree-stopped', unregisteredProcessesStopped: 0 } } });
test('Only proved completed owners admit cleanup', () => {
    assert(uiCleanupAdmission(complete()).allowed);
    for (const name of ['proxy', 'native', 'rust', 'browser']) {
        const value = complete(); value.closed[name] = false; assert(!uiCleanupAdmission(value).allowed);
    }
    const missingWindows = complete(); delete missingWindows.windowsLifecycle; assert(!uiCleanupAdmission(missingWindows).allowed);
    const unknownStartup = complete(); unknownStartup.closed.native = false; assert(!uiCleanupAdmission(unknownStartup).allowed);
    const foreign = complete(); foreign.windowsLifecycle.windowsStop.unregisteredProcessesStopped = 1; assert(!uiCleanupAdmission(foreign).allowed);
});
