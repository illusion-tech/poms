// Pure full107 projection over A's actual private snapshots. No SQL/private IO.
// Unexpected changes to another already owned module remain in the comparison.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)])):value;
const digest=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const rowSetDigest=rows=>digest(rows.map(row=>canonical(row)).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));

export function projectCompleteFacts({raw,baseline,journal,authority,additionalRowIsScoped=()=>false}){
    for(const snapshot of[raw,baseline])assert(snapshot?.kind==='R2M-actual-full107-private-row-snapshot'&&snapshot.namespace==='poms-r2m'&&snapshot.tables.length===107,'Actual full107 snapshots required');
    assert(raw.runId===journal.runId&&raw.backend===journal.backend&&raw.database===journal.database&&raw.marker===journal.marker,'Current journal/snapshot identity differs');
    assert(baseline.runId===raw.runId&&baseline.database===raw.database&&baseline.marker===raw.marker,'Original pre-prepare baseline differs');
    assert(authority.tables.length===107&&new Set(authority.tables.map(item=>item.name)).size===107,'Exact complete physical source catalog required');
    const owned=new Set();for(const item of journal.objects){assert(item.creationProof&&item.postcondition?.independentlyVisible&&item.identity?.id===item.id,'No query/response-ID ownership');owned.add(item.table+':'+item.id)}
    const lease=journal.baselineSettingLease;
    if(lease)assert(lease.key==='attachment.max-upload-size-mb'&&lease.owned===false&&lease.deletionPermitted===false&&lease.admission?.rootApproved===true,'Only the separately reviewed exact singleton lease');
    const extra=(table,row)=>{const allowed=additionalRowIsScoped(table,row)===true;if(allowed){assert(table==='business_number_sequence'&&/^\d{4}$/.test(String(row.period))&&Number(row.period)>=4000&&Number(row.period)<=8999,'Only Root exact reserved-year number-lease rows')}return allowed};
    const isScoped=(table,row)=>owned.has(table+':'+row.id)||table==='system_setting'&&lease&&row.key===lease.key||extra(table,row);
    const columns={},primaryKeys={},rows={},unexpectedChanges=[];
    for(const definition of authority.tables){
        const table=definition.name,current=raw.tables.find(item=>item.table===table),before=baseline.tables.find(item=>item.table===table);assert(current&&before,'Full physical table omitted');
        const fullColumns=definition.columns.map(item=>item.name),expected=[...fullColumns].sort();
        for(const value of[...current.rows,...before.rows])assert.deepEqual(Object.keys(value).sort(),expected,'Physical row column omission or injection');
        const currentOutside=current.rows.filter(row=>!isScoped(table,row)),baselineOutside=before.rows.filter(row=>!isScoped(table,row));
        if(rowSetDigest(currentOutside)!==rowSetDigest(baselineOutside))unexpectedChanges.push({table,kind:'unexpected-complete-row-change'});
        columns[table]=fullColumns;primaryKeys[table]=[...definition.primaryKey.columns];rows[table]=current.rows.filter(row=>isScoped(table,row));
    }
    return{readOnly:true,complete:true,completeProjection:'all107-owned-and-exact-leases',catalogDigest:digest(raw.catalog),columns,primaryKeys,rows,outsideScope:{complete:true,tablesScanned:107,unexpectedChanges},privateSnapshotDigest:digest(raw),originalBaselineDigest:digest(baseline)};
}

export function completeFactTables(frame){
    assert(frame.completeProjection==='all107-owned-and-exact-leases'&&Object.keys(frame.rows).length===107,'Only complete107 fact frames qualify');
    return Object.keys(frame.rows).sort();
}
