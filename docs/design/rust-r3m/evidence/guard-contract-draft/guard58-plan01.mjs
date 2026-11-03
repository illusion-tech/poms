// Pure candidate guard plan. No I/O, actor creation, HTTP, DB or gate certificate.
import assert from 'node:assert/strict';

export const guardEnvelope = Object.freeze({
  session_missing: { statusCode: 401, code: 'session_missing', message: 'Authentication required' },
  session_expired: { statusCode: 401, code: 'session_expired', message: 'Authentication required' },
  session_revoked: { statusCode: 401, code: 'session_revoked', message: 'Authentication required' },
  account_disabled: { statusCode: 401, code: 'account_disabled', message: 'Authentication required' },
  csrf_failed: { statusCode: 403, code: 'csrf_failed', message: 'CSRF token validation failed' },
  permission_denied: { statusCode: 403, code: 'permission_denied', message: 'Insufficient permissions' },
});

export function permissionAllowed(operation, permissions) {
  return operation.permissions.all.every(p => permissions.includes(p))
    && (!operation.permissions.any.length || operation.permissions.any.some(p => permissions.includes(p)));
}

export function buildGuard58Plan(inventory, fakeId) {
  assert.match(fakeId, /^[0-9a-f-]{36}$/i);
  const operations = inventory.operations;
  assert.equal(operations.length, 58);
  assert.equal(new Set(operations.map(o => o.operationId)).size, 58);
  assert.equal(new Set(operations.map(o => o.method + ' ' + o.path)).size, 58);
  for (const o of operations) {
    assert.equal(o.canonical.status, 'aligned');
    assert(Array.isArray(o.permissions.all) && Array.isArray(o.permissions.any));
    assert(o.permissions.all.length || o.permissions.any.length);
  }
  const permissions = [...new Set(operations.flatMap(o => [...o.permissions.all, ...o.permissions.any]))].sort();
  const policies = [
    { label: 'guard_none', permissions: [] },
    ...permissions.map((permission, i) => ({ label: 'guard_p' + i, permissions: [permission] })),
    { label: 'guard_conversion_all', permissions: ['lead:write', 'project:write'] },
  ];
  function route(o) {
    let p = o.path.replace(/\{[^}]+\}/g, fakeId);
    const q = new URLSearchParams();
    if (o.method === 'GET') {
      if (/^\/api\/(?:opportunity-stakeholders|competitor-intelligence-records|sales-discovery-records|sales-intelligence-gaps)$/.test(p)) q.set('leadId', fakeId);
      if (p === '/api/business-discussions' || p === '/api/customer-contacts') q.set('customerId', fakeId);
      if (['/api/customers', '/api/leads', '/api/projects'].includes(p)) q.set('page', 'invalid');
      if (p === '/api/projects:lookup') q.set('code', 'R3M-NONEXISTENT-' + fakeId);
    }
    return p + (q.size ? '?' + q.toString() : '');
  }
  const targets = operations.map(o => ({ ...o, route: route(o), options: o.method === 'GET' ? {} : { json: {} } }));
  // A representative for every registered R3 HTTP adapter/resource. Expiry,
  // revoke and disabled-account classes use one shared guard implementation.
  const lifecycleTargets = [
    ['GET', '/api/customers'], ['DELETE', '/api/customer-aliases/{id}'],
    ['GET', '/api/customer-contacts'], ['GET', '/api/leads'],
    ['POST', '/api/lead-score-overrides/{id}:approve'], ['GET', '/api/projects'],
    ['GET', '/api/projects/{projectId}/technical-cost-packages'],
    ['GET', '/api/projects/{projectId}/bid-commercial-processes'],
    ['GET', '/api/projects/{projectId}/pricing-margin-reviews'],
    ['GET', '/api/sales-follow-up-records'], ['GET', '/api/opportunity-stakeholders'],
    ['GET', '/api/competitor-intelligence-records'], ['GET', '/api/sales-discovery-records'],
    ['GET', '/api/sales-intelligence-gaps'], ['GET', '/api/business-discussions'],
    ['GET', '/api/projects/{projectId}/workspace-guidance'], ['GET', '/api/projects/{projectId}/timeline'],
  ].map(([method, path]) => {
    const result = targets.find(o => o.method === method && o.path === path);
    assert(result, 'Missing current lifecycle target ' + method + ' ' + path);
    return result;
  });
  const raw = [
    { method: 'GET', route: '/API/LEADS/?page=invalid', status: 401, code: 'session_missing' },
    { method: 'GET', route: '/API/CUSTOMERS/?page=invalid', status: 401, code: 'session_missing' },
    { method: 'GET', route: '/api/leads//', status: 404, html: true },
    { method: 'PUT', route: '/api/customers/' + fakeId, status: 404, html: true },
    { method: 'PUT', route: '/api/leads/' + fakeId, status: 404, html: true },
    { method: 'PUT', route: '/api/projects/' + fakeId, status: 404, html: true },
    { method: 'POST', route: '/api/leads/' + fakeId + ':unknown', status: 404, jsonNotFound: true },
    { method: 'POST', route: '/api/leads/' + fakeId + '%3Aclaim', status: 404, jsonNotFound: true },
    { method: 'GET', route: '/api/leads/bad%ZZ', status: 400, decodeSegment: 'bad%ZZ' },
    { method: 'PUT', route: '/api/customer-contacts/bad%ZZ', status: 400, decodeSegment: 'bad%ZZ' },
    { method: 'POST', route: '/api/leads/bad%ZZ:qualify', status: 400, decodeSegment: 'bad%ZZ:qualify' },
    { method: 'GET', route: '/api/lead-score-overrides/bad%ZZ:approve', status: 400, decodeSegment: 'bad%ZZ:approve' },
    { method: 'PUT', route: '/api/projects/bad%ZZ/timeline', status: 400, decodeSegment: 'bad%ZZ' },
    { method: 'GET', route: '/api/business-discussions/extra', status: 404, html: true },
    // Global CORS short-circuits before path decoding and authentication.
    { method: 'OPTIONS', route: '/api/missing/bad%ZZ', status: 204 },
    // Global parser precedes path decoder and auth. Retain the real parser body;
    // only check its stable complete envelope/type and source-defined prefix.
    { method: 'POST', route: '/api/customers', status: 400, malformed: true },
    { method: 'POST', route: '/api/leads/bad%ZZ:qualify', status: 400, malformed: true },
    { method: 'POST', route: '/api/business-discussions', status: 400, malformed: true },
  ];
  return { operations: 58, permissions, policies, targets, lifecycleTargets, raw, guardOnly: true, businessSuccessClaims: 0 };
}
