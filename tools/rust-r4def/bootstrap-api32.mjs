import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createApiHarness } from './api-harness32.mjs';
const h = createApiHarness();
const bootstrap = await h.login({ key: 'bootstrap', username: 'admin', password: 'admin123' });
const definitions = [];
for (const op of h.operations.values()) if (op.spec.operationId.startsWith('PlatformController_') && /[Pp]assword|[Cc]redential|[Pp]ermission|[Rr]ole/.test(op.spec.operationId)) definitions.push({ method: op.method, path: op.template, operationId: op.spec.operationId, requestSchema: op.spec.requestBody?.content?.['application/json']?.schema ?? null });
fs.writeFileSync(h.out + '/bootstrap32.json', JSON.stringify({ bootstrap: { id: bootstrap.id, username: bootstrap.username, permissionCount: bootstrap.permissions.length }, definitions, businessRuntimeAccepted: false }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ actualBootstrapId: bootstrap.id, permissionCount: bootstrap.permissions.length, definitions }));
