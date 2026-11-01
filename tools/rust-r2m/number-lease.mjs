// Only the frozen before-absent nine-scope/two-year internal number probe.
// Sequence unique keys (scope,period) are separate from UUID fixture ownership.
import assert from 'node:assert/strict';
import { digest } from './fixture-core.mjs';
import { marker, sourceHead, databaseFor, validateSource } from './fixture-guard.mjs';
const scopes=Object.freeze(['customer','lead','project','contract','cost-payment-fact','cost-invoice','cost-expense','cost-procurement','cost-labor']);
const select='select to_jsonb(t) as row,t.xmin::text as xmin from poms.business_number_sequence t where scope=any($1::text[]) and period=any($2::text[]) order by scope,period';
export async function createNumberLease({fixture,year,sourceCapId,recordPrivate}){
 assert(['nest','rust'].includes(fixture?.backend));assert.equal(fixture.j?.namespace,'poms-r2m');assert.equal(fixture.j.marker,marker);assert.equal(fixture.j.sourceHead,sourceHead);assert.equal(fixture.j.database,databaseFor(fixture.backend));assert.equal(fixture.j.backend,fixture.backend);assert.equal(fixture.j.runId,fixture.runId);assert(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(fixture.runId));assert(!fixture.j.writerDrain);validateSource();
 assert(Number.isInteger(year)&&year>=4000&&year<=8998);assert(typeof sourceCapId==='string'&&typeof recordPrivate==='function');
 const periods=[String(year),String(year+1)],args=[scopes,periods];
 const initial=(await fixture.client.query(select,args)).rows;assert.equal(initial.length,0,'Number periods already exist: no mutation admitted');
 const journal={kind:'R2M-before-absent-number-composite-lease',marker,backend:fixture.backend,runId:fixture.runId,sourceCapId,scopes,periods,before:[],state:'admitted',uuidOwnershipClaimed:false};
 await recordPrivate('numbers-admitted',journal);let expected;
 return{year,periods,scopes,
  async runNative(native,allocatedContext){assert(fixture.backend==='nest'&&!expected);assert(allocatedContext?.runId===fixture.runId&&allocatedContext.op==='m.internal-numbers'&&Number.isSafeInteger(allocatedContext.index)&&allocatedContext.index>=0);fixture.scope(allocatedContext.caseId);journal.nativeContext=structuredClone(allocatedContext);await recordPrivate('numbers-original-SDK-context',journal.nativeContext);const context=native.admitOriginalSdkContext(allocatedContext);
   const observations=await native.withOriginalSdkScope(context,async({em,numbers})=>{const rows=[];for(const scope of scopes){
    const at=new Date(`${year}-01-01T00:00:00Z`),first=await numbers.next(scope,at,em);assert(first.endsWith('-000001'));
    const concurrent=await Promise.all(Array.from({length:8},()=>numbers.next(scope,at,em)));assert.equal(new Set(concurrent).size,8);assert.deepEqual(concurrent.map(s=>s.split('-').at(-1)).sort(),Array.from({length:8},(_,i)=>String(i+2).padStart(6,'0')));
    const utcPrevious=await numbers.next(scope,new Date(`${year+1}-01-01T00:30:00+08:00`),em),utcNext=await numbers.next(scope,new Date(`${year+1}-01-01T00:00:00Z`),em);assert(utcPrevious.endsWith(`${year}-000010`)&&utcNext.endsWith(`${year+1}-000001`));
    let transactional;const rollback=Object.assign(new Error('synthetic number caller rollback'),{numberRollback:true});try{await em.transactional(async tx=>{transactional=await numbers.next(scope,at,tx);throw rollback})}catch(error){assert.equal(error,rollback)}
    const visible=(await fixture.client.query('select next_value from poms.business_number_sequence where scope=$1 and period=$2',[scope,String(year)])).rows;assert.equal(visible[0]?.next_value,12);assert(transactional.endsWith('-000011'));
    rows.push({scope,first,concurrent,utcPrevious,utcNext,independentEmSurvivesCallerRollback:transactional,independentNextValue:visible[0].next_value});
   }return rows});return{operation:'numbers-nine-scopes',backend:'nest',complete:true,runId:fixture.runId,scopeCount:9,utcBoundaryObserved:true,concurrentUnique:true,onlyBeforeAbsentScopePeriods:true,independentEmAndBorrowedConnectionSeparate:true,observations,sourceCapId};
  },
  async capture(actual){assert(actual?.operation==='numbers-nine-scopes'&&actual.complete===true&&actual.runId===fixture.runId&&actual.backend===fixture.backend);const rows=(await fixture.client.query(select,args)).rows;assert.equal(rows.length,18);assert.equal(new Set(rows.map(x=>x.row.scope+':'+x.row.period)).size,18);
   for(const item of rows){assert(scopes.includes(item.row.scope)&&periods.includes(item.row.period));assert.equal(item.row.next_value,item.row.period===String(year)?12:2);assert(/^[0-9]+$/.test(item.xmin));}
   expected=structuredClone(rows);journal.expectedAfter=expected;journal.actual=actual;journal.state='observed-actual-service-committed-independent-visibility';journal.sha256=digest(expected);await recordPrivate('numbers-observed',journal);return rows.map(x=>x.row);
  },
  async facts(){return(await fixture.client.query(select,args)).rows.map(x=>x.row)},
  async restoreAfterDrain(){fixture.assertDrained();assert(expected);const before=(await fixture.client.query(select,args)).rows;assert.equal(digest(before),digest(expected),'Unknown number change: retain recovery state');journal.state='delete-intended-after-writers-drain';await recordPrivate('numbers-delete-intended',journal);
   const {frozenTables,ident}=await import('./catalog-complete.mjs');const {uuidReferences}=await import('./fixture-references.mjs');const ids=new Set(expected.map(item=>item.row.id));const generalPreflight=await fixture.preflight();assert.equal(generalPreflight.tablesScanned,107);let tablesScanned=0;
   for(const table of frozenTables){const rows=(await fixture.client.query('select to_jsonb(t) as row from poms.'+ident(table)+' t')).rows;tablesScanned++;for(const {row}of rows)for(const ref of uuidReferences(row))if(ids.has(ref.id))assert(table==='business_number_sequence'&&ref.path.length===1&&ref.path[0]==='id'&&expected.some(item=>digest(item.row)===digest(row)),'Number sequence has an unexpected incoming physical/logical reference')}
   assert.equal(tablesScanned,107);journal.referencePreflight={tablesScanned,unexpectedReferences:0,general:generalPreflight};await recordPrivate('numbers-full107-reference-preflight',journal.referencePreflight);
   await fixture.client.query('begin');try{for(const item of expected){const deleted=await fixture.client.query('delete from poms.business_number_sequence where scope=$1 and period=$2 and to_jsonb(business_number_sequence)=$3::jsonb and xmin::text=$4 returning scope,period',[item.row.scope,item.row.period,JSON.stringify(item.row),item.xmin]);assert.equal(deleted.rowCount,1)}await fixture.client.query('commit');journal.commitAcknowledged=true;}catch(error){try{await fixture.client.query('rollback')}catch{}journal.state='recovery-required';await recordPrivate('numbers-recovery-required',journal);throw error}
   const {databaseClient}=await import('./database-client.mjs');const originalPid=(await fixture.client.query('select pg_backend_pid() as pid')).rows[0].pid;const pids=[];
   for(let i=0;i<2;i++){const independent=await databaseClient(fixture.backend);try{const pid=(await independent.query('select pg_backend_pid() as pid')).rows[0].pid;assert(pid!==originalPid&&!pids.includes(pid));pids.push(pid);assert.equal((await independent.query(select,args)).rows.length,0)}finally{await independent.end()}}
   journal.state='restored-before-absent-double-zero';journal.deleted=18;journal.firstZero=true;journal.secondZero=true;journal.independentBackendPids=pids;await recordPrivate('numbers-restored',journal);return{result:journal.state,deleted:18,remaining:0,secondRemaining:0,commitAcknowledged:true,independentBackendPids:pids,sourceCapId};
  }
 };
}
