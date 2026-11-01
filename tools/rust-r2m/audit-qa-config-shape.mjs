// Pure original configuration admission. TS CJS interop can wrap default;
// never let a missing original testMatch silently select the whole testDir.
import assert from 'node:assert/strict';
export const originalLegacyPatterns=Object.freeze(['contract-management.journey.spec.ts','external-login.mocked.spec.ts','frontend-permission-visibility.matrix.spec.ts','lead-bootstrap.journey.spec.ts','platform-governance.smoke.spec.ts','project-workspace.journey.spec.ts','project-workspace.smoke.spec.ts','workbench-todo-entry.journey.spec.ts'].map(file=>'**/'+file));
export function unwrapOriginalLegacyConfiguration(module){
    const config=module?.default??module;assert(config&&typeof config==='object');
    assert(Array.isArray(config.testMatch));assert.deepEqual([...config.testMatch].sort(),[...originalLegacyPatterns].sort());
    assert.equal(config.testDir,'./src');assert.equal(config.globalSetup,'./src/support/server-setup.ts');assert.equal(config.fullyParallel,false);assert.equal(config.workers,1);
    const meta=config.metadata?.pomsBrowser;assert(meta?.mode==='external'&&meta.suite==='legacy'&&meta.apiOrigin==='http://127.0.0.1:10070'&&meta.adminOrigin==='http://127.0.0.1:10080');
    assert.equal(config.use?.baseURL,'http://127.0.0.1:10080');assert.equal(config.use?.channel,'chromium');return config;
}
