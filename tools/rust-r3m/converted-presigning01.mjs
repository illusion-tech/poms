// Root continues C/D/G on the exact Project returned by this cohort's conversion.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { openAcceptanceContext } from './acceptance-context03.mjs';
import { pin } from './source-guard.mjs';
import { captureGraph, assertGraphUnchanged } from './graph-assertions01.mjs';
import { withDenied } from './db-controls01.mjs';
import { buildConvertedProjectPresigningPlan } from '../../tmp/rust-r3m/g2-b/converted-project-presigning-chain01.mjs';
const [tag, phase, runId] = process.argv.slice(2), ctx = await openAcceptanceContext({ backend: 'rust', tag, phase, runId });
for (const p of ['tools/rust-r3m/converted-presigning01.mjs','tools/rust-r3m/graph-assertions01.mjs','tools/rust-r3m/db-controls01.mjs','tmp/rust-r3m/g2-b/converted-project-presigning-chain01.mjs','tmp/rust-r3m/g2-b/assertions01.mjs']) ctx.addSource(p);
const upstreamFile = 'tmp/rust-r3m/acceptance-rust-' + tag + '-13/report01.json', upstream = JSON.parse(fs.readFileSync(upstreamFile));
assert(upstream.completed && upstream.runId === runId && upstream.runtime.artifactSha256 === ctx.runtime.artifactSha256);
ctx.addSource(upstreamFile);
const conversion = upstream.events.find(e => e.label === 'chain.convert'); assert(conversion && conversion.response.status === 200);
const integration = ctx.ids.integration; assert(integration && integration.projectId === conversion.response.body.id && integration.leadId === conversion.response.body.sourceLeadId);
const ids = { marker: 'R3CO-' + runId.slice(0,8), actorUserId: ctx.ids.adminUserId, customerId: conversion.response.body.customerId, leadId: integration.leadId, convertStateKey: 'actual.convert', times: { occurredAt: '2026-11-03T00:00:00.000Z', nextFollowUpAt: '2026-12-15T00:00:00.000Z' } };
const state = { 'actual.convert': { ...conversion.response, request: { method: conversion.method, path: conversion.route }, upstreamReport: pin(upstreamFile) } }, plan = buildConvertedProjectPresigningPlan(ids);
const tables = ['project','project_technical_cost_package','project_technical_scope_item','project_technical_risk_item','project_technical_cost_item','project_bid_commercial_process','project_bid_commercial_material_item','project_bid_commercial_timeline_item','project_pricing_margin_review','project_pricing_margin_condition_item','audit_log'];
const requirements = { tables, rows: [{ table:'project', id: integration.projectId }] };
const faultTables = { 'B.chain.required-child.cost':'project_technical_risk_item', 'B.chain.required-child.bid':'project_bid_commercial_material_item', 'B.chain.required-child.pricing':'project_pricing_margin_condition_item' };
let completed = false, error = null;
try {
  await ctx.observe('actual-conversion-receipt-provenance', { report:pin(upstreamFile), method:conversion.method, path:conversion.route, response:conversion.response, sameProjectId:integration.projectId, sourceLeadId:integration.leadId, newPreparedProjectSubstitution:false });
  for (const c of [...plan.cases, ...plan.faults]) await ctx.case(c.name, async () => {
    const request = c.request(state), completeGraph = Boolean(c.observation?.completeOwnedBeforeAfterGraph || faultTables[c.name]);
    const beforeRows = completeGraph ? await captureGraph(ctx,requirements) : undefined;
    const action = () => ctx.step(c.name, request.method, request.path, { actor:request.actor || 'admin', requestId:request.headers?.['x-request-id'], ...(Object.hasOwn(request,'json') ? {json:request.json} : {}) }, c.expectedStatus);
    const response = faultTables[c.name] ? await withDenied(ctx,faultTables[c.name],'INSERT',action) : await action();
    const evidence = {};
    if (c.observation?.table) { evidence.row = await ctx.row(c.observation.table,response.body.id); assert(evidence.row && evidence.row.id === response.body.id); }
    if (completeGraph) { evidence.beforeRows = beforeRows; evidence.afterRows = await captureGraph(ctx,requirements); assertGraphUnchanged(beforeRows,evidence.afterRows,requirements); evidence.requiredScope= requirements; }
    c.assert(response,state,evidence); state[c.name]=response;
    return { operationId:c.operationId || null, request,response,evidence, actualConvertedProjectId:integration.projectId, allBusinessAssertionsPassed:true, requiredGraphGuardChecked:completeGraph };
  });
  ctx.ids.convertedPresigning = { projectId:integration.projectId, leadId:integration.leadId, customerId:ids.customerId, state }; ctx.saveContext(); completed=true;
} catch(e) { error={name:e.name,message:e.message.split('\n')[0]};fs.writeFileSync(ctx.directory+'/original-error.json',JSON.stringify({name:e.name,message:e.message,stack:e.stack},null,2)+'\n',{flag:'wx',mode:0o600});process.exitCode=1; }
finally { await ctx.finish(completed,error); }
