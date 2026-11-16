// Tool-only classification of one deliberately blocked, source-pinned font CSS.
// Never fetches, fulfills or permits an external request; all original routes stay strict.
import assert from 'node:assert/strict';
export const FONT_CSS32 = 'https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&family=Roboto+Flex:opsz,wght@8..144,100..1000&display=swap';
const font = new URL(FONT_CSS32);
const failedTexts = new Set(['net::ERR_BLOCKED_BY_CLIENT', 'net::ERR_BLOCKED_BY_CLIENT.Inspector']);
const consoleTexts = new Set([...failedTexts].map(value => `Failed to load resource: ${value}`));

export function classifyFontBoundary32({ failedRequests, consoleRecords, consoleErrors, blocked }) {
  assert(Array.isArray(failedRequests) && Array.isArray(consoleRecords) && Array.isArray(consoleErrors) && Array.isArray(blocked));
  assert.deepEqual(consoleRecords.map(row => row.text), consoleErrors, 'Every original console error must retain its actual metadata');
  assert.equal(failedRequests.length, blocked.length, 'Every deliberately blocked request must have one actual requestfailed event');
  for (const record of blocked) {
    if (typeof record === 'string') assert.equal(record, font.origin, 'Unknown external origin remains a failure');
    else {
      assert.deepEqual(Object.keys(record).sort(), ['method', 'path']);
      assert.equal(record.method, 'GET'); assert.equal(record.path, font.pathname, 'Readonly API-write blocks are never font noise');
    }
  }
  for (const request of failedRequests) {
    assert.equal(request.url, FONT_CSS32, 'Only the exact source-pinned CSS URL can be classified');
    assert.equal(request.method, 'GET'); assert.equal(request.resourceType, 'stylesheet');
    assert(failedTexts.has(request.errorText), 'Only the actual deliberate blocked-by-client failure can be classified');
  }
  assert.equal(consoleRecords.length, failedRequests.length, 'Every console error must pair with one actual blocked font request');
  const pairs = failedRequests.map((request, index) => {
    const record = consoleRecords[index];
    assert(consoleTexts.has(record.text), 'Other console errors remain failures');
    assert.equal(record.location.url, request.url, 'A generic ERR_BLOCKED console message is insufficient');
    assert.equal(record.location.lineNumber, 0); assert.equal(record.location.columnNumber, 0);
    return { requestFailedOrdinal: request.ordinal, consoleOrdinal: record.ordinal, method: request.method, url: request.url,
      resourceType: request.resourceType, failureText: request.errorText, consoleText: record.text, consoleLocation: record.location };
  });
  return { kind: 'strict-deliberately-blocked-source-font32', verified: true, classifiedPairs: pairs,
    unknownExternalRequestsAllowed: false, externalNetworkPermitted: false, rawErrorsPreserved: true, APIOrPageErrorsIgnored: false };
}

export function observeFontBoundary32(page) {
  const failedRequests = [], consoleRecords = []; let ordinal = 0, lastAudit = null;
  page.on('requestfailed', request => failedRequests.push({ ordinal: ++ordinal, url: request.url(), method: request.method(),
    resourceType: request.resourceType(), errorText: request.failure()?.errorText ?? null }));
  page.on('console', message => { if (message.type() === 'error') consoleRecords.push({ ordinal: ++ordinal, text: message.text(), location: message.location() }); });
  return {
    assertExpected({ consoleErrors, blocked }) {
      lastAudit = classifyFontBoundary32({ failedRequests, consoleRecords, consoleErrors, blocked }); return lastAudit;
    },
    snapshot() { return { schemaVersion: 1, kind: 'actual-page-font-boundary32-metadata', exactSourceURL: FONT_CSS32,
      failedRequests: structuredClone(failedRequests), consoleRecords: structuredClone(consoleRecords), verification: lastAudit,
      unknownExternalRequestsAllowed: false, externalNetworkPermitted: false }; }
  };
}
