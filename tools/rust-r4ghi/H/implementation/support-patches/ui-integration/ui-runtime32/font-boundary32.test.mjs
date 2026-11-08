import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyFontBoundary32 as classify, FONT_CSS32 } from './proposed/tools/rust-r4ghi/business/ui-font-boundary32.mjs';
function fixture(n = 1) {
  return { blocked: Array(n).fill('https://fonts.googleapis.com'),
    failedRequests: Array.from({ length: n }, (_, i) => ({ ordinal: i * 2 + 1, url: FONT_CSS32, method: 'GET', resourceType: 'stylesheet', errorText: 'net::ERR_BLOCKED_BY_CLIENT' })),
    consoleRecords: Array.from({ length: n }, (_, i) => ({ ordinal: i * 2 + 2, text: 'Failed to load resource: net::ERR_BLOCKED_BY_CLIENT.Inspector', location: { url: FONT_CSS32, lineNumber: 0, columnNumber: 0 } })),
    consoleErrors: Array(n).fill('Failed to load resource: net::ERR_BLOCKED_BY_CLIENT.Inspector') };
}
test('one exact blocked CSS tuple is classified while original errors remain present', () => { const f = fixture(), old = structuredClone(f), result = classify(f); assert.equal(result.classifiedPairs.length, 1); assert.deepEqual(f, old); });
test('reload duplicates require independent requestfailed and console pairs', () => { assert.equal(classify(fixture(2)).classifiedPairs.length, 2); const f = fixture(2); f.failedRequests.pop(); assert.throws(() => classify(f)); });
test('empty pages have no invented font events', () => { assert.equal(classify(fixture(0)).classifiedPairs.length, 0); });
test('same-origin API errors and unknown external origins remain failures', () => { for (const alter of [f => f.blocked[0] = 'https://unknown.invalid', f => f.failedRequests[0].url = 'http://127.0.0.1:44551/api/auth/session']) { const f = fixture(); alter(f); assert.throws(() => classify(f)); } });
test('changed CSS query, font-file resource and another HTTP method cannot be classified', () => { for (const alter of [f => f.failedRequests[0].url += '&other=1', f => f.failedRequests[0].resourceType = 'font', f => f.failedRequests[0].method = 'POST']) { const f = fixture(); alter(f); assert.throws(() => classify(f)); } });
test('generic console text without exact location is rejected', () => { for (const alter of [f => f.consoleRecords[0].location.url = '', f => f.consoleRecords[0].location.url = 'http://127.0.0.1:44551/api/projects/id', f => f.consoleRecords[0].location.lineNumber = 3]) { const f = fixture(); alter(f); assert.throws(() => classify(f)); } });
test('missing failures or unrelated console/page-like messages are never swallowed', () => { for (const alter of [f => f.failedRequests.length = 0, f => f.failedRequests[0].errorText = 'net::ERR_CONNECTION_REFUSED', f => { f.consoleErrors[0] = 'TypeError: application failed'; f.consoleRecords[0].text = f.consoleErrors[0]; }]) { const f = fixture(); alter(f); assert.throws(() => classify(f)); } });
test('readonly Creator write-blocks and lost original console records remain failures', () => { const f = fixture(); f.blocked = [{ method: 'POST', path: '/api/projects/id' }]; assert.throws(() => classify(f)); const g = fixture(); g.consoleErrors.length = 0; assert.throws(() => classify(g)); });
test('Creator metadata can pair only with the same real CSS failure tuple', () => { const f = fixture(); f.blocked = [{ method: 'GET', path: '/css2' }]; assert.equal(classify(f).classifiedPairs.length, 1); });
