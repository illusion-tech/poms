// Root retains phase01 partial and corrects only its mistaken witness assertions.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { pin } from './source-guard.mjs';
const source = 'tools/rust-r3m/baseline-witness01.mjs', target = 'tools/rust-r3m/baseline-witness02.mjs';
let text = fs.readFileSync(source, 'utf8');
text = text.replaceAll('baseline-witness01.mjs', 'baseline-witness02.mjs').replaceAll('baseline-cohort01.json', 'baseline-cohort02.json');
text = text.replace("phase: '01'", "phase: '02', runId: '12489848-1b79-44cd-8265-853e8ac76fe5'");
text = text.replace('    assert.equal(audit.length, 1);', '    // Actual baseline actor-only dirty write has zero audit; version change is the defect.');
const before = "    const created = await ctx.step('customer.upper.create', 'POST', '/api/customers', { json: request }, 201);\n    const read = await ctx.step('customer.upper.GET', 'GET', '/api/customers/' + created.body.id, {}, 200);\n    assert.equal(created.body.ownerOrgName, null);";
const after = "    const created = await ctx.step('customer.upper.create', 'POST', '/api/customers', { json: request }, 201);\n    // POST returns CustomerSummary; ownerOrgName is a detail/PATCH field.\n    const patched = await ctx.step('customer.upper.PATCH', 'PATCH', '/api/customers/' + created.body.id, {json:{ownerOrgId:ctx.ids.adminOrgId.toUpperCase(),ownerUserId:ctx.ids.adminUserId}}, 200);\n    const read = await ctx.step('customer.upper.GET', 'GET', '/api/customers/' + created.body.id, {}, 200);\n    assert.equal(patched.body.ownerOrgName, null);";
assert.equal(text.split(before).length, 2); text = text.replace(before, after);
text = text.replace('request, created, read };', 'request, created, patched, read };');
assert(!fs.existsSync(target)); fs.writeFileSync(target, text, { flag: 'wx' });
fs.writeFileSync('tmp/rust-r3m/root/baseline-witness-correction02.json', JSON.stringify({ kind: 'R3-pre-fix-witness-tool-correction', original: pin(source), derived: pin(target), retainedPartial: 'tmp/rust-r3m/acceptance-rust-baseline01-01/report01.json', sameOwnedCohort: '12489848-1b79-44cd-8265-853e8ac76fe5', fixes: ['Do not invent a baseline audit for an updatedBy-only customer version write', 'Customer POST is Summary; compare uppercase-org PATCH detail against GET'], productModified: false, currentStageAcceptance: false }, null, 2) + '\n', { flag: 'wx' });
