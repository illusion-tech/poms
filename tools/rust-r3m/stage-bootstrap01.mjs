// Root creates the final candidate's fresh cohort and real producer anchors.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { openAcceptanceContext } from './acceptance-context03.mjs';
const backend = process.argv[2] || 'rust'; assert(['rust', 'nest'].includes(backend));
const ctx = await openAcceptanceContext({ backend, tag: 'final01', phase: '10' });
ctx.addSource('tools/rust-r3m/stage-bootstrap01.mjs');
fs.writeFileSync(`tmp/rust-r3m/root/stage-${backend}-cohort01.json`, JSON.stringify({ kind: 'R3-final-candidate-owned-cohort', backend, runId: ctx.runId, marker: ctx.identity.marker, tag: ctx.tag, stageAcceptanceEligible: backend === 'rust', cleanup: 'Pending-owned-terminal' }, null, 2) + '\n', { flag: 'wx' });
let completed = false, error = null;
try {
  await ctx.case('stage.catalog-and-current-candidate', async () => {
    const { rows: [catalog] } = await ctx.db.query("select (select count(*)::int from information_schema.tables where table_schema='poms' and table_type='BASE TABLE') tables,(select count(*)::int from information_schema.columns where table_schema='poms') columns,(select count(*)::int from pg_constraint where contype='f' and connamespace='poms'::regnamespace) foreign_keys,(select count(*)::int from poms.poms_migrations) migrations,current_setting('server_version_num') server_version");
    assert.equal(catalog.tables, 107); assert.equal(catalog.migrations, 92); assert.equal(catalog.server_version, '150012');
    return { catalog, candidateArtifact: ctx.runtime.artifactSha256, realNewDatabase: true, noProductDDLChanged: true };
  }, { kind: 'setup' });
  await ctx.case('stage.real-customer-contact-lead-project-producers', async () => {
    const source = (await ctx.db.query("select code,name from poms.dictionary_item where domain='lead-source' and status='active' order by sort_order,code limit 1")).rows[0]; assert(source);
    ctx.ids.sourceCode = source.code; ctx.ids.sourceName = source.name;
    const customer = await ctx.produceCustomer('stage-anchor'); ctx.ids.customerId = customer.id;
    const contact = (await ctx.step('stage.contact.female', 'POST', '/api/customer-contacts', { json: { customerId: customer.id, name: 'R3CO actual contact', gender: 'female' } }, 201)).body;
    if (backend === 'rust') assert.equal(contact.gender, 'female');
    const lead = await ctx.produceLead('stage-anchor'); ctx.ids.leadId = lead.id;
    const project = await ctx.produceProject('stage-direct-project'); ctx.ids.projectId = project.id; ctx.ids.directProjectId = project.id;
    for (const [table, id] of [['customer', customer.id], ['customer_contact', contact.id], ['lead', lead.id], ['project', project.id]]) { const row = await ctx.row(table, id); assert(row && row.id === id, 'Actual committed producer ' + table); }
    ctx.saveContext();
    return { customer, contact, lead, project, dictionarySource: source, allTargetsActualCommittedHTTPProducers: true, projectIsDirectNotConversion: true };
  });
  completed = true;
} catch (e) { error = { name: e.name, message: e.message.split('\n')[0] }; fs.writeFileSync(ctx.directory + '/original-error.json', JSON.stringify({ name: e.name, message: e.message, stack: e.stack }, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); process.exitCode = 1; }
finally { await ctx.finish(completed, error); }
