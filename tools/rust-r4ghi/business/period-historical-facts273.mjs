// Instrumentation for sealed273 first-close source writes, never authorization.
import assert from'node:assert/strict';import{uuid,sha}from'./pure.mjs';
export const POLICY273='historical-adoption-chain272-v1';
// SourceRef identity remains four fields; the real Rust/SQL PK stores only
// kind:id:payloadHash. RowVersion is checked independently, never discarded.
export const physicalMemberKey004=r=>r.kind+':'+r.id+':'+r.payloadHash;
const exact=r=>JSON.parse(r.raw,(k,v,c)=>typeof v==='number'&&/amount|total|cost$|margin|rate|ratio/.test(k)?c.source:v),key=r=>r.kind+':'+r.id+':'+r.rowVersion+':'+r.payloadHash;
// Fresh-period capture has no frozen-period fallback. Catalog::members sorts
// the four-field reference identity; storage independently uses physicalKey3.
export function lastFreshMemberReference005(context){
 assert.equal(context.snapshot.mode,'period-end');assert.equal(context.snapshot.periodEndSnapshotRef??null,null);assert.equal(context.snapshot.restatesSnapshotRef??null,null);
 const refs=context.scope.closureEvidenceRefs;assert(Array.isArray(refs)&&refs.length>0);refs.forEach(sourceRef273);assert.equal(new Set(refs.map(key)).size,refs.length);assert.equal(new Set(refs.map(physicalMemberKey004)).size,refs.length,'Distinct references must have distinct actual storage keys');
 return [...refs].sort((a,b)=>key(a)<key(b)?-1:key(a)>key(b)?1:0).at(-1);
}
export function sourceRef273(r){assert(r&&typeof r.kind==='string'&&r.kind);uuid(r.id);assert(Number.isSafeInteger(r.rowVersion)&&r.rowVersion>0);assert(/^[a-f0-9]{64}$/.test(r.payloadHash));return r;}
export function publicSelection273(p){assert(Object.hasOwn(p,'selectedBaselinePackageRef'));assert.equal(p.selectedBaselinePackageRef,null);assert(Object.hasOwn(p,'periodBaselineSelection'));const s=p.periodBaselineSelection;assert(s&&typeof s==='object');const fields=['policyVersion','publicationMode','periodKey','businessCutoff','selectionHash','originalAdoptedCostRef','selectedAdoptedCostRef','handoverBasisRef','handoverRebaselineRef','adoptionSourceRefs','technicalLineageRefs'];assert.deepEqual(Object.keys(s).sort(),fields.sort());assert.equal(s.policyVersion,POLICY273);assert.equal(s.publicationMode,'new-period-package');assert.equal(s.periodKey,p.periodKey);assert.equal(s.businessCutoff,p.businessCutoff);assert(/^[a-f0-9]{64}$/.test(s.selectionHash));for(const n of['originalAdoptedCostRef','selectedAdoptedCostRef'])assert.equal(sourceRef273(s[n]).kind,'ProjectTechnicalCostPackage');for(const n of['handoverBasisRef','handoverRebaselineRef'])if(s[n]!==null)sourceRef273(s[n]);for(const n of['adoptionSourceRefs','technicalLineageRefs']){assert(Array.isArray(s[n])&&s[n].length>0&&s[n].length<=1000);s[n].forEach(sourceRef273);assert.equal(new Set(s[n].map(key)).size,s[n].length);}for(const ref of[s.originalAdoptedCostRef,s.selectedAdoptedCostRef])assert(s.adoptionSourceRefs.some(r=>key(r)===key(ref)));return s;}
function cents(v){assert(typeof v==='string'&&/^-?\d+(?:\.\d{1,2})?$/.test(v));const neg=v.startsWith('-'),[a,b='']=(neg?v.slice(1):v).split('.');return(BigInt(a)*100n+BigInt(b.padEnd(2,'0')))*(neg?-1n:1n);}
export function adoptedChainFacts273(ctx,snapshot,selection,projectId,readRows){
 const completeObserved004=observedAdoptionUniverse004(t=>readRows(snapshot.databases[ctx.database].tables[t]),projectId,selection.businessCutoff,snapshot.capturedAt);assertObservedSelection004(selection,completeObserved004);
 const rows=readRows(snapshot.databases[ctx.database].tables.project_technical_cost_package),values=rows.map(exact),refs=selection.adoptionSourceRefs.filter(r=>r.kind==='ProjectTechnicalCostPackage'),allRefs=[...selection.adoptionSourceRefs,...selection.technicalLineageRefs].filter(r=>r.kind==='ProjectTechnicalCostPackage');assert(refs.length>0);const byId=new Map();for(const r of allRefs){const prev=byId.get(r.id);if(prev)assert.equal(key(prev),key(r));byId.set(r.id,r);}const adopted=new Set(refs.map(r=>r.id));assert.equal(adopted.size,refs.length);const costs=new Map();for(const ref of byId.values()){const found=values.filter(v=>v.id===ref.id);assert.equal(found.length,1);const v=found[0];actualRef273(ref,table=>{assert.equal(table,'project_technical_cost_package');return rows;});assert.equal(v.project_id,projectId);assert.equal(v.row_version,ref.rowVersion);assert(Number.isSafeInteger(v.version)&&v.version>0);assert.equal(v.currency_code,'CNY');if(adopted.has(v.id))assert(['effective','superseded'].includes(v.status),'Unproved adopted lifecycle cannot be treated as historical');costs.set(v.id,v);}
 const path=[],seen=new Set();let id=selection.selectedAdoptedCostRef.id;while(true){assert(!seen.has(id));seen.add(id);assert(costs.has(id),'Every intermediate must have an actual technical lineage ref');path.push(id);if(id===selection.originalAdoptedCostRef.id)break;id=costs.get(id).supersedes_id;assert(typeof id==='string'&&id);}for(const id of adopted)assert(seen.has(id),'Incomparable adopted node cannot enter a complete unique chain');const ordered=path.reverse().filter(id=>adopted.has(id));assert.equal(ordered[0],selection.originalAdoptedCostRef.id);assert.equal(ordered.at(-1),selection.selectedAdoptedCostRef.id);assert.equal(ordered.length,adopted.size);
 const transitions=ordered.slice(1).map((after,i)=>{const before=ordered[i];return{beforeCostRef:byId.get(before),afterCostRef:byId.get(after),deltaNetCents:(cents(costs.get(after).total_estimated_amount_excluding_tax)-cents(costs.get(before).total_estimated_amount_excluding_tax)).toString()};});return{selectionHash:selection.selectionHash,policyVersion:selection.policyVersion,periodKey:selection.periodKey,businessCutoff:selection.businessCutoff,selection,adoptedBudgetIds:ordered,technicalPathIds:path,transitionCount:transitions.length,transitions,originalNetCents:cents(costs.get(ordered[0]).total_estimated_amount_excluding_tax).toString(),selectedNetCents:cents(costs.get(ordered.at(-1)).total_estimated_amount_excluding_tax).toString(),originalBusinessVersion:costs.get(ordered[0]).version,selectedBusinessVersion:costs.get(ordered.at(-1)).version,oldBaselineWrites:0,newSourceCount:1,newNoncurrentPackageCount:1,sourceMemberFamily:'last-real-final-closure-member',unknownNewBaselineAndSourceIds:true};
}
const src='apps/poms-api-rust/src/project_operating/capture.rs',add=(key,table,match,why)=>({key,table,event:'INSERT',match,source:src,rationale:why,expectedRows:1});
export function periodHistoricalInventory273(scope){
 const f=scope.ghFacts.periodHistorical273;assert(f&&f.newSourceCount===1&&f.newNoncurrentPackageCount===1&&f.oldBaselineWrites===0);assert.equal(f.transitionCount,f.transitions.length);
 const base={projectId:scope.projectId,actorId:scope.actorId,selectionHash:f.selectionHash,periodKey:f.periodKey,policyVersion:f.policyVersion};
 const out=[add('G-period273-source','operating_baseline_source',{kind:'gh-period273-source',...base},'First close captures one actual historical source after locked selection; never a preview UUID.'),add('G-period273-noncurrent-package','operating_baseline_package',{kind:'gh-period273-package',...base},'One actual noncurrent G with FK to that exact captured source; old package is untouched.')];
 for(const t of f.transitions)out.push(add('G-period273-adopted-change:'+t.afterCostRef.id,'change_package_baseline',{kind:'gh-period273-change',...base,beforeCostId:t.beforeCostRef.id,afterCostId:t.afterCostRef.id},'One actual unique adopted edge; unadopted intermediate versions and repeated contracts are not extra changes.'));
 out.push(add('G-period273-full-member-loop-last','operating_source_member',{kind:'gh-period273-member-last',...base},'Fresh-period Catalog::members filters the complete required Ref4 set in Ref4 lexical order; select its last reference, then map to physicalKey3. No period-root fallback and no new last-family for271. Normal proof compares the whole set and both new G/source refs.'));
 return out;
}
const literal=x=>{assert(typeof x==='string'&&/^[A-Za-z0-9_.:-]+$/.test(x));return"'"+x+"'";};
function sourceCondition273(alias,m){uuid(m.projectId);uuid(m.actorId);assert(/^[a-f0-9]{64}$/.test(m.selectionHash));assert.equal(m.policyVersion,POLICY273);return`${alias}.project_id=${literal(m.projectId)}::uuid AND ${alias}.captured_by=${literal(m.actorId)}::uuid AND ${alias}.producer_version=1 AND ${alias}.row_version=1 AND ${alias}.frozen_payload#>>'{historicalPeriodSelection,selectionHash}'=${literal(m.selectionHash)} AND ${alias}.frozen_payload#>>'{historicalPeriodSelection,periodKey}'=${literal(m.periodKey)} AND ${alias}.frozen_payload#>>'{historicalPeriodSelection,policyVersion}'=${literal(m.policyVersion)}`;}
export function periodHistoricalSelectorSql273(d){const m=d.match,sc=sourceCondition273('s',m),parent=`FROM poms.operating_baseline_package b JOIN poms.operating_baseline_source s ON s.id=b.source_context_id WHERE b.project_id=${literal(m.projectId)}::uuid AND b.created_by=${literal(m.actorId)}::uuid AND b.producer_version=1 AND b.row_version=1 AND b.is_current=false AND b.status='active' AND ${sc}`;
 if(m.kind==='gh-period273-source')return`j->>'project_id'=${literal(m.projectId)} AND j->>'captured_by'=${literal(m.actorId)} AND j->>'producer_version'='1' AND j->>'row_version'='1' AND j#>>'{frozen_payload,historicalPeriodSelection,selectionHash}'=${literal(m.selectionHash)} AND j#>>'{frozen_payload,historicalPeriodSelection,periodKey}'=${literal(m.periodKey)} AND j#>>'{frozen_payload,historicalPeriodSelection,policyVersion}'=${literal(m.policyVersion)}`;
 if(m.kind==='gh-period273-package')return`j->>'project_id'=${literal(m.projectId)} AND j->>'created_by'=${literal(m.actorId)} AND j->>'is_current'='false' AND j->>'status'='active' AND j->>'producer_version'='1' AND j->>'row_version'='1' AND EXISTS(SELECT 1 FROM poms.operating_baseline_source s WHERE s.id=(j->>'source_context_id')::uuid AND ${sc})`;
 if(m.kind==='gh-period273-change'){uuid(m.beforeCostId);uuid(m.afterCostId);return`j->>'created_by'=${literal(m.actorId)} AND j->>'before_cost_package_id'=${literal(m.beforeCostId)} AND j->>'after_cost_package_id'=${literal(m.afterCostId)} AND j->>'change_package_id'=${literal(m.afterCostId)} AND EXISTS(SELECT 1 ${parent} AND b.id=(j->>'baseline_package_id')::uuid)`;}
 const context=`SELECT 1 FROM poms.operating_source_context c JOIN poms.operating_baseline_package b ON b.id=(c.frozen_payload#>>'{baseline,baselinePackageRef,id}')::uuid JOIN poms.operating_baseline_source s ON s.id=b.source_context_id WHERE c.id=(j->>'context_id')::uuid AND c.project_id=${literal(m.projectId)}::uuid AND c.captured_by=${literal(m.actorId)}::uuid AND c.frozen_payload#>>'{snapshot,mode}'='period-end' AND b.is_current=false AND b.status='active' AND ${sc}`;
 if(m.kind==='gh-period273-member-last')return`EXISTS(${context} AND (c.frozen_payload#>'{snapshot,periodEndSnapshotRef}' IS NULL OR c.frozen_payload#>'{snapshot,periodEndSnapshotRef}'='null'::jsonb) AND (c.frozen_payload#>'{snapshot,restatesSnapshotRef}' IS NULL OR c.frozen_payload#>'{snapshot,restatesSnapshotRef}'='null'::jsonb) AND EXISTS(SELECT 1 FROM (SELECT r FROM jsonb_array_elements(c.frozen_payload#>'{scope,closureEvidenceRefs}') r ORDER BY (((r->>'kind')||':'||(r->>'id')||':'||(r->>'rowVersion')||':'||(r->>'payloadHash')) COLLATE "C") DESC LIMIT 1) last_ref WHERE j->>'member_key'=((last_ref.r->>'kind')||':'||(last_ref.r->>'id')||':'||(last_ref.r->>'payloadHash')) AND j->>'source_kind'=last_ref.r->>'kind' AND j->>'source_id'=last_ref.r->>'id' AND j->>'source_row_version'=last_ref.r->>'rowVersion' AND j->>'source_payload_hash'=last_ref.r->>'payloadHash'))`;
 if(m.kind==='gh-period273-package-member')return`j->>'source_kind'='OperatingBaselinePackage' AND EXISTS(${context} AND j->>'source_id'=b.id::text)`;
 if(m.kind==='gh-period273-source-member')return`j->>'source_kind'='OperatingBaselineSource' AND EXISTS(${context} AND j->>'source_id'=s.id::text)`;
 throw Error('Unknown source-reviewed273 family');}
export function periodHistoricalWriteMatches273(d,row,allRows){const m=d.match,v=exact(row),values=t=>allRows(t).map(exact),source=s=>s&&s.project_id===m.projectId&&s.captured_by===m.actorId&&s.producer_version===1&&s.row_version===1&&s.frozen_payload?.historicalPeriodSelection?.selectionHash===m.selectionHash&&s.frozen_payload.historicalPeriodSelection.periodKey===m.periodKey&&s.frozen_payload.historicalPeriodSelection.policyVersion===m.policyVersion,pkg=b=>b&&b.project_id===m.projectId&&b.created_by===m.actorId&&b.is_current===false&&b.status==='active'&&b.producer_version===1&&b.row_version===1&&source(values('operating_baseline_source').find(s=>s.id===b.source_context_id));if(m.kind==='gh-period273-source')return source(v);if(m.kind==='gh-period273-package')return pkg(v);if(m.kind==='gh-period273-change')return v.created_by===m.actorId&&v.before_cost_package_id===m.beforeCostId&&v.after_cost_package_id===m.afterCostId&&v.change_package_id===m.afterCostId&&pkg(values('operating_baseline_package').find(b=>b.id===v.baseline_package_id));const c=values('operating_source_context').find(c=>c.id===v.context_id);if(!c||c.project_id!==m.projectId||c.captured_by!==m.actorId||c.frozen_payload?.snapshot.mode!=='period-end')return false;const b=values('operating_baseline_package').find(b=>b.id===c.frozen_payload.baseline.baselinePackageRef.id);if(!pkg(b))return false;if(m.kind==='gh-period273-member-last'){const r=lastFreshMemberReference005(c.frozen_payload);return v.member_key===physicalMemberKey004(r)&&v.source_kind===r.kind&&v.source_id===r.id&&v.source_row_version===r.rowVersion&&v.source_payload_hash===r.payloadHash;}if(m.kind==='gh-period273-package-member')return v.source_kind==='OperatingBaselinePackage'&&v.source_id===b.id;if(m.kind==='gh-period273-source-member')return v.source_kind==='OperatingBaselineSource'&&v.source_id===b.source_context_id;throw Error('Unknown273 match');}



// BEGIN GENERATED FACTUAL ORACLE273
// Mechanical projection of frozen sources::factual_payload / store::selected; no IO at runtime.
// sources.rs 298bf7ee91fc6a27b7f555942f660d2e1644f57a9d6fae9ea4bd8d124d99c9bf; store.rs 10144498fdf21b68dcddd8b543c6196919a1da3762a40fe4f0d7dc147c2d218a
const factualMap273=Object.freeze({
  "ProjectHandoverBasisSnapshot": {
    "table": "project_handover_basis_snapshot",
    "fields": [
      "id",
      "project_id",
      "row_version",
      "version",
      "status",
      "is_current",
      "producer_version",
      "source_hash",
      "payload_hash",
      "source_payload",
      "frozen_payload",
      "source_context_id",
      "original_baseline_cost",
      "handover_baseline_cost",
      "execution_change_package_total",
      "change_package_total",
      "current_effective_baseline_cost",
      "currency",
      "baseline_selection_source",
      "period_key",
      "root_snapshot_id",
      "period_end_snapshot_id",
      "supersedes_id"
    ],
    "decimals": [],
    "id": "id",
    "version": "row_version"
  },
  "ProjectHandover": {
    "table": "project_handover",
    "fields": [
      "id",
      "project_id",
      "row_version",
      "version",
      "producer_version",
      "status",
      "is_current",
      "basis_snapshot_id",
      "confirmation_record_id",
      "execution_owner_user_id",
      "finance_confirmation_required",
      "source_payload_hash",
      "confirmed_at",
      "confirmed_by",
      "supersedes_id",
      "handover_rebaseline_record_id"
    ],
    "decimals": [],
    "id": "id",
    "version": "row_version"
  },
  "ContractHandoverRebaselineRecord": {
    "table": "contract_handover_rebaseline_record",
    "fields": [
      "id",
      "project_id",
      "row_version",
      "status",
      "producer_version",
      "contract_amendment_id",
      "basis_before_id",
      "basis_after_id",
      "effective_operating_baseline_after_id",
      "effective_baseline_after_id",
      "source_handover_id",
      "replacement_handover_id",
      "supersedes_id",
      "handled_at",
      "handled_by"
    ],
    "decimals": [],
    "id": "id",
    "version": "row_version"
  },
  "OperatingBaselinePackage": {
    "table": "operating_baseline_package",
    "fields": [
      "id",
      "project_id",
      "row_version",
      "version",
      "status",
      "is_current",
      "producer_version",
      "source_hash",
      "payload_hash",
      "source_payload",
      "frozen_payload",
      "source_context_id",
      "original_baseline_cost",
      "handover_baseline_cost",
      "execution_change_package_total",
      "change_package_total",
      "current_effective_baseline_cost",
      "currency",
      "baseline_selection_source",
      "period_key",
      "root_snapshot_id",
      "period_end_snapshot_id",
      "supersedes_id"
    ],
    "decimals": [
      "original_baseline_cost",
      "handover_baseline_cost",
      "execution_change_package_total",
      "change_package_total",
      "current_effective_baseline_cost"
    ],
    "id": "id",
    "version": "row_version"
  },
  "OperatingBaselineSource": {
    "table": "operating_baseline_source",
    "fields": [
      "id",
      "project_id",
      "row_version",
      "version",
      "status",
      "is_current",
      "producer_version",
      "source_hash",
      "payload_hash",
      "source_payload",
      "frozen_payload",
      "source_context_id",
      "original_baseline_cost",
      "handover_baseline_cost",
      "execution_change_package_total",
      "change_package_total",
      "current_effective_baseline_cost",
      "currency",
      "baseline_selection_source",
      "period_key",
      "root_snapshot_id",
      "period_end_snapshot_id",
      "supersedes_id"
    ],
    "decimals": [],
    "id": "id",
    "version": "row_version"
  },
  "Contract": {
    "table": "contract",
    "fields": [
      "id",
      "project_id",
      "status",
      "currency_code",
      "signed_amount",
      "signed_at",
      "current_snapshot_id",
      "row_version"
    ],
    "decimals": [
      "signed_amount"
    ],
    "id": "id",
    "version": "row_version"
  },
  "ContractTermSnapshot": {
    "table": "contract_term_snapshot",
    "fields": [
      "id",
      "contract_id",
      "version",
      "row_version",
      "snapshot_status",
      "status",
      "source_preparation_id",
      "source_readiness_id",
      "source_baseline_id",
      "source_amendment_id",
      "payload_hash",
      "source_facts",
      "activated_snapshot_id",
      "amount_tax_inclusive",
      "amount_tax_exclusive",
      "tax_rate",
      "currency_code",
      "effective_at",
      "source_diff_result_id"
    ],
    "decimals": [
      "amount_tax_inclusive",
      "amount_tax_exclusive",
      "tax_rate",
      "down_payment_rate",
      "retention_rate"
    ],
    "id": "id",
    "version": "row_version"
  },
  "ContractTermPreparation": {
    "table": "contract_term_preparation",
    "fields": [
      "id",
      "contract_id",
      "version",
      "row_version",
      "snapshot_status",
      "status",
      "source_preparation_id",
      "source_readiness_id",
      "source_baseline_id",
      "source_amendment_id",
      "payload_hash",
      "source_facts",
      "activated_snapshot_id",
      "amount_tax_inclusive",
      "amount_tax_exclusive",
      "tax_rate",
      "currency_code",
      "effective_at",
      "source_diff_result_id"
    ],
    "decimals": [
      "amount_tax_inclusive",
      "amount_tax_exclusive",
      "tax_rate",
      "down_payment_rate",
      "retention_rate"
    ],
    "id": "id",
    "version": "row_version"
  },
  "ContractReviewBinding": {
    "table": "contract_review_binding",
    "fields": [
      "approval_record_id",
      "contract_id",
      "preparation_id",
      "preparation_version",
      "contract_amendment_id",
      "payload_hash"
    ],
    "decimals": [],
    "id": "approval_record_id",
    "version": "preparation_version"
  },
  "ApprovalRecord": {
    "table": "approval_record",
    "fields": [
      "id",
      "row_version",
      "current_status",
      "approval_type",
      "target_object_type",
      "target_object_id",
      "approved_at"
    ],
    "decimals": [],
    "id": "id",
    "version": "row_version"
  },
  "CommercialReleaseBaseline": {
    "table": "commercial_release_baseline",
    "fields": [
      "id",
      "project_id",
      "row_version",
      "version",
      "status",
      "is_current",
      "currency_code",
      "amount_tax_inclusive",
      "amount_tax_exclusive",
      "tax_rate",
      "source_facts",
      "source_package_id",
      "source_package_version",
      "approval_record_id",
      "effective_at"
    ],
    "decimals": [
      "amount_tax_inclusive",
      "amount_tax_exclusive",
      "tax_rate",
      "down_payment_rate",
      "retention_rate"
    ],
    "id": "id",
    "version": "row_version"
  },
  "ProjectTechnicalCostPackage": {
    "table": "project_technical_cost_package",
    "fields": [
      "id",
      "project_id",
      "version",
      "row_version",
      "supersedes_id",
      "status",
      "currency_code",
      "total_estimated_amount_excluding_tax",
      "total_tax_cost_amount",
      "total_estimated_amount_including_tax",
      "effective_at",
      "allow_next_stage",
      "blocker_count",
      "tax_review_status"
    ],
    "decimals": [
      "total_estimated_amount_excluding_tax",
      "total_tax_cost_amount",
      "total_estimated_amount_including_tax"
    ],
    "id": "id",
    "version": "row_version"
  },
  "ReceiptRecord": {
    "table": "receipt_record",
    "fields": [
      "id",
      "project_id",
      "contract_id",
      "row_version",
      "status",
      "receipt_amount",
      "receipt_date",
      "confirmed_at",
      "confirmed_by"
    ],
    "decimals": [
      "receipt_amount"
    ],
    "id": "id",
    "version": "row_version"
  },
  "ReceiptAccountingBasis": {
    "table": "receipt_accounting_basis",
    "fields": [
      "id",
      "receipt_id",
      "project_id",
      "contract_id",
      "row_version",
      "producer_version",
      "receipt_row_version",
      "term_snapshot_id",
      "term_snapshot_version",
      "term_snapshot_row_version",
      "term_payload_hash",
      "currency",
      "currency_source_kind",
      "currency_source_id",
      "currency_source_version",
      "currency_source_hash",
      "cash_gross",
      "amount_excluding_tax",
      "tax_amount",
      "tax_rate",
      "capture_mode",
      "selection_policy",
      "rounding_policy",
      "evidence_refs",
      "payload_hash"
    ],
    "decimals": [
      "cash_gross",
      "amount_excluding_tax",
      "tax_amount",
      "tax_rate"
    ],
    "id": "id",
    "version": "row_version"
  },
  "InternalCostRateVersion": {
    "table": "internal_cost_rate_version",
    "fields": [
      "id",
      "row_version",
      "version",
      "rate_key",
      "rate_scope_type",
      "person_id",
      "role_code",
      "currency",
      "rate_value",
      "rate_unit",
      "effective_from",
      "effective_to",
      "status",
      "published_at",
      "published_by",
      "supersedes_id"
    ],
    "decimals": [
      "rate_value"
    ],
    "id": "id",
    "version": "row_version"
  },
  "PayableRecord": {
    "table": "payable_record",
    "fields": [
      "id",
      "project_id",
      "contract_id",
      "row_version",
      "status",
      "currency",
      "amount_excluding_tax",
      "tax_amount",
      "amount_including_tax",
      "invoice_amount",
      "invoice_type",
      "payable_record_id",
      "source_type",
      "source_id",
      "expense_date",
      "payment_date",
      "invoice_date",
      "due_date",
      "confirmed_at",
      "confirmed_by",
      "source_basis",
      "basis_origin"
    ],
    "decimals": [
      "amount_excluding_tax",
      "tax_amount",
      "amount_including_tax"
    ],
    "id": "id",
    "version": "row_version"
  },
  "PaymentRecord": {
    "table": "payment_record",
    "fields": [
      "id",
      "project_id",
      "contract_id",
      "row_version",
      "status",
      "currency",
      "amount_excluding_tax",
      "tax_amount",
      "amount_including_tax",
      "invoice_amount",
      "invoice_type",
      "payable_record_id",
      "source_type",
      "source_id",
      "expense_date",
      "payment_date",
      "invoice_date",
      "due_date",
      "confirmed_at",
      "confirmed_by",
      "source_basis",
      "basis_origin"
    ],
    "decimals": [
      "amount_excluding_tax",
      "tax_amount",
      "amount_including_tax"
    ],
    "id": "id",
    "version": "row_version"
  },
  "InvoiceRecord": {
    "table": "invoice_record",
    "fields": [
      "id",
      "project_id",
      "contract_id",
      "row_version",
      "status",
      "currency",
      "amount_excluding_tax",
      "tax_amount",
      "amount_including_tax",
      "invoice_amount",
      "invoice_type",
      "payable_record_id",
      "source_type",
      "source_id",
      "expense_date",
      "payment_date",
      "invoice_date",
      "due_date",
      "confirmed_at",
      "confirmed_by",
      "source_basis",
      "basis_origin"
    ],
    "decimals": [
      "invoice_amount"
    ],
    "id": "id",
    "version": "row_version"
  },
  "ExpenseRecord": {
    "table": "expense_record",
    "fields": [
      "id",
      "project_id",
      "contract_id",
      "row_version",
      "status",
      "currency",
      "amount_excluding_tax",
      "tax_amount",
      "amount_including_tax",
      "invoice_amount",
      "invoice_type",
      "payable_record_id",
      "source_type",
      "source_id",
      "expense_date",
      "payment_date",
      "invoice_date",
      "due_date",
      "confirmed_at",
      "confirmed_by",
      "source_basis",
      "basis_origin"
    ],
    "decimals": [
      "amount_excluding_tax",
      "tax_amount",
      "amount_including_tax"
    ],
    "id": "id",
    "version": "row_version"
  },
  "ProjectStageRecord": {
    "table": "project_stage_record",
    "fields": [
      "id",
      "project_id",
      "sequence_no",
      "event_type",
      "from_stage",
      "to_stage",
      "previous_stage_record_id",
      "source_handover_id",
      "source_role_assignment_id",
      "source_completion_record_id",
      "summary_snapshot_id",
      "project_row_version_before",
      "project_row_version_after",
      "entered_at",
      "entered_by",
      "reason",
      "source_payload",
      "source_payload_hash",
      "producer_version"
    ],
    "decimals": [],
    "id": "id",
    "version": "sequence_no"
  },
  "Attachment": {
    "table": "attachment",
    "fields": [
      "id",
      "row_version",
      "version_no",
      "version_group_id",
      "checksum_sha256",
      "security_level",
      "status",
      "deleted_at"
    ],
    "decimals": [],
    "id": "id",
    "version": "row_version"
  },
  "SharedCostAllocationBasis": {
    "table": "shared_cost_allocation_basis",
    "fields": [
      "id",
      "project_id",
      "basis_id",
      "row_version",
      "status",
      "supersedes_id",
      "effective_at",
      "currency",
      "source_cost_scope_key",
      "measurement_basis",
      "source_amount_excluding_tax",
      "source_tax_cost_amount",
      "source_amount_including_tax",
      "measurement_amount",
      "allocation_algorithm",
      "allocation_ratio",
      "allocation_weight",
      "allocated_amount",
      "allocated_amount_excluding_tax",
      "allocated_tax_cost_amount",
      "allocated_amount_including_tax",
      "residual_minor_units",
      "governance_evidence_id",
      "governance_schema_version",
      "replacement_operation_id",
      "is_included_in_project_cost",
      "included_at",
      "included_by"
    ],
    "decimals": [
      "source_amount_excluding_tax",
      "source_tax_cost_amount",
      "source_amount_including_tax",
      "measurement_amount"
    ],
    "id": "id",
    "version": "row_version"
  },
  "SharedCostAllocationResult": {
    "table": "shared_cost_allocation_result",
    "fields": [
      "id",
      "project_id",
      "basis_id",
      "row_version",
      "status",
      "supersedes_id",
      "effective_at",
      "currency",
      "source_cost_scope_key",
      "measurement_basis",
      "source_amount_excluding_tax",
      "source_tax_cost_amount",
      "source_amount_including_tax",
      "measurement_amount",
      "allocation_algorithm",
      "allocation_ratio",
      "allocation_weight",
      "allocated_amount",
      "allocated_amount_excluding_tax",
      "allocated_tax_cost_amount",
      "allocated_amount_including_tax",
      "residual_minor_units",
      "governance_evidence_id",
      "governance_schema_version",
      "replacement_operation_id",
      "is_included_in_project_cost",
      "included_at",
      "included_by"
    ],
    "decimals": [
      "allocated_amount",
      "allocation_ratio",
      "allocation_weight",
      "allocated_amount_excluding_tax",
      "allocated_tax_cost_amount",
      "allocated_amount_including_tax"
    ],
    "id": "id",
    "version": "row_version"
  },
  "SharedCostAllocationSourceSnapshot": {
    "table": "shared_cost_allocation_source_snapshot",
    "fields": [
      "basis_id",
      "cost_record_id",
      "cost_row_version",
      "source_type",
      "source_id",
      "source_row_version",
      "currency",
      "amount_excluding_tax",
      "tax_cost_amount",
      "amount_including_tax",
      "source_payload",
      "source_payload_hash",
      "is_current"
    ],
    "decimals": [
      "amount_excluding_tax",
      "tax_cost_amount",
      "amount_including_tax"
    ],
    "id": "cost_record_id",
    "version": "cost_row_version"
  },
  "ProjectActualCostRecord": {
    "table": "project_actual_cost_record",
    "fields": [
      "id",
      "project_id",
      "row_version",
      "cost_type",
      "source_type",
      "source_id",
      "currency",
      "amount_excluding_tax",
      "tax_cost_amount",
      "amount_including_tax",
      "occurred_on",
      "record_status",
      "basis_origin",
      "source_basis",
      "source_row_version",
      "source_payload_hash",
      "supersedes_record_id",
      "is_included_in_project_cost",
      "confirmed_at",
      "confirmed_by",
      "included_at",
      "included_by",
      "execution_stage_code",
      "stage_derived_from_type",
      "stage_derived_from_id",
      "stage_derived_at",
      "stage_locked_at",
      "rate_version_id",
      "calculation_basis",
      "labor_period_start",
      "labor_period_end",
      "labor_person_id",
      "labor_role"
    ],
    "decimals": [
      "amount_excluding_tax",
      "tax_cost_amount",
      "amount_including_tax",
      "internal_cost_rate",
      "labor_amount",
      "actual_hours",
      "actual_person_days"
    ],
    "id": "id",
    "version": "row_version"
  },
  "CostGovernanceEvidence": {
    "table": "cost_governance_evidence",
    "fields": [
      "id",
      "project_id",
      "schema_version",
      "target_type",
      "target_id",
      "evidence_kind",
      "business_date",
      "source_references",
      "payload_hash",
      "frozen_payload",
      "reason",
      "actor_id"
    ],
    "decimals": [],
    "id": "id",
    "version": null
  },
  "CostStageAttributionSnapshot": {
    "table": "cost_stage_attribution_snapshot",
    "fields": [
      "id",
      "project_id",
      "cost_record_id",
      "row_version",
      "status",
      "supersedes_id",
      "attributed_stage",
      "attribution_mode",
      "evidence_business_date",
      "governance_evidence_id",
      "governance_schema_version",
      "handled_at",
      "handled_by",
      "confirmed_at",
      "confirmed_by",
      "currency",
      "deductibility_status",
      "tax_pending_flag",
      "tax_impact_amount",
      "tax_impact_pending_amount",
      "tax_treatment_type"
    ],
    "decimals": [],
    "id": "id",
    "version": "row_version"
  },
  "AccountingTaxTreatmentSnapshot": {
    "table": "accounting_tax_treatment_snapshot",
    "fields": [
      "id",
      "project_id",
      "cost_record_id",
      "row_version",
      "status",
      "supersedes_id",
      "attributed_stage",
      "attribution_mode",
      "evidence_business_date",
      "governance_evidence_id",
      "governance_schema_version",
      "handled_at",
      "handled_by",
      "confirmed_at",
      "confirmed_by",
      "currency",
      "deductibility_status",
      "tax_pending_flag",
      "tax_impact_amount",
      "tax_impact_pending_amount",
      "tax_treatment_type"
    ],
    "decimals": [
      "tax_impact_amount",
      "tax_impact_pending_amount"
    ],
    "id": "id",
    "version": "row_version"
  },
  "ProjectCostInclusionDecision": {
    "table": "project_cost_inclusion_decision",
    "fields": [
      "id",
      "project_id",
      "unit_key",
      "row_version",
      "source_row_version",
      "decision",
      "recognition_role",
      "cost_record_id",
      "allocation_result_id",
      "primary_cost_id",
      "reason_code",
      "reason_text",
      "supporting_source_refs",
      "evidence_refs",
      "payload_hash",
      "supersedes_id",
      "decided_at",
      "decided_by"
    ],
    "decimals": [],
    "id": "id",
    "version": "row_version"
  },
  "OperatingSourceContext": {
    "table": "operating_source_context",
    "fields": [
      "id",
      "project_id",
      "row_version",
      "version",
      "status",
      "is_current",
      "producer_version",
      "source_hash",
      "payload_hash",
      "source_payload",
      "frozen_payload",
      "source_context_id",
      "original_baseline_cost",
      "handover_baseline_cost",
      "execution_change_package_total",
      "change_package_total",
      "current_effective_baseline_cost",
      "currency",
      "baseline_selection_source",
      "period_key",
      "root_snapshot_id",
      "period_end_snapshot_id",
      "supersedes_id"
    ],
    "decimals": [],
    "id": "id",
    "version": "row_version"
  },
  "ProjectOperatingSnapshot": {
    "table": "project_operating_snapshot",
    "fields": [
      "id",
      "project_id",
      "row_version",
      "version",
      "status",
      "is_current",
      "producer_version",
      "source_hash",
      "payload_hash",
      "source_payload",
      "frozen_payload",
      "source_context_id",
      "original_baseline_cost",
      "handover_baseline_cost",
      "execution_change_package_total",
      "change_package_total",
      "current_effective_baseline_cost",
      "currency",
      "baseline_selection_source",
      "period_key",
      "root_snapshot_id",
      "period_end_snapshot_id",
      "supersedes_id"
    ],
    "decimals": [
      "effective_contract_total",
      "receivable_confirmed_total",
      "included_cost_total",
      "original_baseline_cost",
      "current_effective_baseline_cost",
      "gross_margin_amount",
      "gross_margin_rate",
      "tax_impact_pending_amount"
    ],
    "id": "id",
    "version": "row_version"
  },
  "PeriodClosingSnapshot": {
    "table": "period_closing_snapshot",
    "fields": [
      "id",
      "project_id",
      "row_version",
      "version",
      "status",
      "is_current",
      "producer_version",
      "source_hash",
      "payload_hash",
      "source_payload",
      "frozen_payload",
      "source_context_id",
      "original_baseline_cost",
      "handover_baseline_cost",
      "execution_change_package_total",
      "change_package_total",
      "current_effective_baseline_cost",
      "currency",
      "baseline_selection_source",
      "period_key",
      "root_snapshot_id",
      "period_end_snapshot_id",
      "supersedes_id"
    ],
    "decimals": [
      "effective_contract_total",
      "receivable_confirmed_total",
      "included_cost_total",
      "original_baseline_cost",
      "current_effective_baseline_cost",
      "gross_margin_amount",
      "gross_margin_rate",
      "tax_impact_pending_amount"
    ],
    "id": "id",
    "version": "row_version"
  },
  "OperatingRestatementRecord": {
    "table": "operating_restatement_record",
    "fields": [
      "id",
      "project_id",
      "row_version",
      "version",
      "status",
      "is_current",
      "producer_version",
      "source_hash",
      "payload_hash",
      "source_payload",
      "frozen_payload",
      "source_context_id",
      "original_baseline_cost",
      "handover_baseline_cost",
      "execution_change_package_total",
      "change_package_total",
      "current_effective_baseline_cost",
      "currency",
      "baseline_selection_source",
      "period_key",
      "root_snapshot_id",
      "period_end_snapshot_id",
      "supersedes_id"
    ],
    "decimals": [],
    "id": "id",
    "version": "row_version"
  }
});

// Appended mechanically to the one H2 authority leaf. Factual metadata is
// projected from the frozen Rust whitelist, not a client SQL/descriptor input.
export function instant273(value){assert(typeof value==='string');const m=/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);assert(m,'Exact RFC3339 timestamp required');const ms=Date.parse(m[1]+'T'+m[2]+m[4]);assert(Number.isSafeInteger(ms));return BigInt(ms)*1000000n+BigInt((m[3]??'').padEnd(9,'0'));}
const numberToken273=Symbol('raw-json-number');
export function typedJSON273(raw){return JSON.parse(raw,(k,v,c)=>typeof v==='number'?{[numberToken273]:c.source}:v);}
const unwrap273=v=>v&&typeof v==='object'&&Object.hasOwn(v,numberToken273)?Number(v[numberToken273]):Array.isArray(v)?v.map(unwrap273):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,unwrap273(x)])):v;
function canonicalText273(v){
 if(v&&typeof v==='object'&&Object.hasOwn(v,numberToken273)){
  const token=v[numberToken273];if(/^-?(?:0|[1-9]\d*)$/.test(token)){const n=BigInt(token);assert(n>=-9223372036854775808n&&n<=18446744073709551615n);assert(token!=='-0');return n.toString();}
  // Store selects every monetary top-level column as decimal text. Only
  // bounded finite auxiliary JSON floats reach here. Unknown formats STOP.
  const n=Number(token);assert(Number.isFinite(n)&&!Object.is(n,-0)&&Math.abs(n)<1e15&&(n===0||Math.abs(n)>=1e-6),'Unreviewed JSON float representation');const out=n.toString();assert(!/[eE]/.test(out));return out+(Number.isInteger(n)?'.0':'');
 }
 if(Array.isArray(v))return'['+v.map(canonicalText273).join(',')+']';
 if(v&&typeof v==='object')return'{'+Object.keys(v).sort((a,b)=>Buffer.compare(Buffer.from(a),Buffer.from(b))).map(k=>JSON.stringify(k)+':'+canonicalText273(v[k])).join(',')+'}';
 if(typeof v==='number')assert(Number.isSafeInteger(v),'Exact raw JSON is required for non-integer numbers');return JSON.stringify(v);
}
export const canonicalHash273=v=>sha(canonicalText273(v));
export function factualPayload273(kind,row){const metadata=factualMap273[kind];assert(metadata,'Unknown factual kind');const raw=typedJSON273(row.raw),out={};for(const field of metadata.fields)if(Object.hasOwn(raw,field)){const value=raw[field];if(metadata.decimals.includes(field)&&value!==null){assert(typeof value==='string'||value&&Object.hasOwn(value,numberToken273));out[field]=typeof value==='string'?value:value[numberToken273];}else out[field]=value;}return out;}
export function factualRef273(kind,row){const meta=factualMap273[kind],value=JSON.parse(row.raw);assert(meta);const ref={kind,id:value[meta.id],rowVersion:meta.version===null?1:value[meta.version],payloadHash:canonicalHash273(factualPayload273(kind,row))};return sourceRef273(ref);}
function refs273(value,out=[]){if(Array.isArray(value))for(const v of value)refs273(v,out);else if(value&&typeof value==='object'){if(Object.keys(value).length===4&&Object.hasOwn(value,'kind')&&Object.hasOwn(value,'id')&&Object.hasOwn(value,'rowVersion')&&Object.hasOwn(value,'payloadHash'))out.push(sourceRef273(value));else for(const v of Object.values(value))refs273(v,out);}return out;}
const refSet273=refs=>{const keys=refs.map(r=>key(sourceRef273(r)));assert.equal(new Set(keys).size,keys.length,'No duplicate final closure references');return keys.sort();};
const uniqueRefs273=refs=>[...new Map(refs.map(r=>[key(r),r])).values()].sort((a,b)=>key(a)<key(b)?-1:key(a)>key(b)?1:0);
function actualRef273(ref,rows){const meta=factualMap273[sourceRef273(ref).kind];assert(meta);const candidates=rows(meta.table).filter(r=>JSON.parse(r.raw)[meta.id]===ref.id).filter(r=>key(factualRef273(ref.kind,r))===key(ref));assert.equal(candidates.length,1,'Reference must match actual complete factual payload/hash/version: '+ref.kind);return candidates[0];}
const temporalKinds273=['ProjectTechnicalCostPackage','Contract','ContractTermSnapshot','ContractTermPreparation','ContractReviewBinding','ApprovalRecord','ProjectHandoverBasisSnapshot','ProjectHandover','ContractHandoverRebaselineRecord','ProjectStageRecord'];
const temporalFields273={createdAt:'created_at',effectiveAt:'effective_at',activatedAt:'activated_at',decidedAt:'decided_at',signedAt:'signed_at',generatedAt:'generated_at',confirmedAt:'confirmed_at',handledAt:'handled_at',enteredAt:'entered_at'};
export function temporalClosure273(rows,projectId){
 const values=t=>rows(t).map(r=>JSON.parse(r.raw)),contracts=new Set(values('contract').filter(r=>r.project_id===projectId).map(r=>r.id)),reviews=values('contract_review_binding').filter(r=>contracts.has(r.contract_id)),approvalIds=new Set(reviews.map(r=>r.approval_record_id));
 const bases=new Set(values('shared_cost_allocation_result').filter(r=>r.project_id===projectId).map(r=>r.basis_id)),externalCosts=new Set(values('shared_cost_allocation_source_snapshot').filter(r=>bases.has(r.basis_id)).map(r=>r.cost_record_id)),projects=new Set([projectId,...values('project_actual_cost_record').filter(r=>externalCosts.has(r.id)).map(r=>r.project_id)]);
 const result=[];for(const kind of temporalKinds273){const meta=factualMap273[kind];assert(meta);for(const row of rows(meta.table)){const v=JSON.parse(row.raw),include=['ContractTermSnapshot','ContractTermPreparation','ContractReviewBinding'].includes(kind)?contracts.has(v.contract_id):kind==='ApprovalRecord'?approvalIds.has(v.id):kind==='ProjectStageRecord'?projects.has(v.project_id):v.project_id===projectId;if(include)result.push({sourceRef:factualRef273(kind,row),row});}}
 return result.sort((a,b)=>key(a.sourceRef)<key(b.sourceRef)?-1:key(a.sourceRef)>key(b.sourceRef)?1:0);
}
export function assertTemporalClosure273(proof,rows,projectId){const expected=temporalClosure273(rows,projectId),actual=proof.temporalSourceFacts;assert(Array.isArray(actual));assert.deepEqual(refSet273(actual.map(x=>x.sourceRef)),refSet273(expected.map(x=>x.sourceRef)),'Every row of all ten real temporal source families must remain in the proof');for(const item of actual){const row=expected.find(r=>key(r.sourceRef)===key(item.sourceRef)).row,raw=typedJSON273(row.raw),value=JSON.parse(row.raw),hashInput={};for(const[field,column]of Object.entries(temporalFields273)){hashInput[field]=raw[column]??null;const original=value[column];let time=null;try{time=instant273(original);}catch{}if(time===null)assert.equal(item[field],null);else assert.equal(instant273(item[field]),time);}assert.equal(item.rawTemporalHash,canonicalHash273(hashInput));}return expected.length;}
function netMoney273(value){return cents(typeof value==='string'?value:String(value));}
export function assertWitnesses273(proof,rows,projectId){assert(Array.isArray(proof.observedAdoptions)&&proof.observedAdoptions.length>0);const all=[];for(const w of proof.observedAdoptions){assert.equal(w.eligibleForPeriod,true);const fields=['costRef','contractRef','termRef','preparationRef','reviewBindingRef','approvalRef'],kind=['ProjectTechnicalCostPackage','Contract','ContractTermSnapshot','ContractTermPreparation','ContractReviewBinding','ApprovalRecord'],actual={};for(let i=0;i<fields.length;i++){assert.equal(w[fields[i]].kind,kind[i]);actual[fields[i]]=JSON.parse(actualRef273(w[fields[i]],rows).raw);all.push(w[fields[i]]);}const c=actual.costRef,t=actual.termRef,p=actual.preparationRef,b=actual.reviewBindingRef,a=actual.approvalRef,contract=actual.contractRef;assert.equal(c.project_id,projectId);assert.equal(contract.project_id,projectId);assert.equal(p.project_id,projectId);assert.equal(t.contract_id,contract.id);assert.equal(p.contract_id,contract.id);assert.equal(p.source_cost_package_id,c.id);assert.equal(p.source_facts.cost.id,c.id);assert.equal(p.source_facts.cost.version,c.version);assert.equal(w.recordedCostVersion,p.source_facts.cost.version);assert.equal(w.recordedCostRowVersion,p.source_facts.cost.rowVersion);assert(c.row_version>=w.recordedCostRowVersion&&w.recordedCostRowVersion>0);assert.equal(p.activated_snapshot_id,t.id);assert.equal(t.source_preparation_id,p.id);assert.equal(p.payload_hash,t.payload_hash);assert(['activated','superseded'].includes(p.status));assert.equal(b.preparation_id,p.id);assert.equal(b.preparation_version,p.version);assert.equal(b.contract_id,contract.id);assert.equal(b.payload_hash,p.payload_hash);assert.equal(b.approval_record_id,a.id);assert.equal(b.contract_amendment_id,t.source_amendment_id);assert.equal(a.current_status,'approved');assert.equal(a.approval_type,'contract-review');assert.equal(a.target_object_id,contract.id);const times=[];for(const[field,value]of Object.entries({costEffectiveAt:c.effective_at,termEffectiveAt:t.effective_at,preparationActivatedAt:p.activated_at,approvalDecidedAt:a.decided_at})){assert.equal(instant273(w[field]),instant273(value));times.push(instant273(value));}if(contract.signed_at!==null){times.push(instant273(contract.signed_at));}assert.equal(instant273(w.adoptedAt),times.reduce((a,b)=>a>b?a:b));assert(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(w.adoptedAt))<=proof.businessCutoff);}
 assert.deepEqual(refSet273(proof.adoptionSourceRefs),refSet273(uniqueRefs273(all)),'The public adopted set must contain every actual contract/adoption witness and each budget exactly once');return proof.observedAdoptions;
}
export function verifyHistoricalPeriod273(ctx,before,after,prepared,contextRow,readRows){
 const rows=(snapshot,table)=>readRows(snapshot.databases[ctx.database].tables[table]),old=t=>rows(before,t),now=t=>rows(after,t),one=(t,id)=>{const values=now(t).filter(r=>JSON.parse(r.raw).id===id);assert.equal(values.length,1);return values[0];};
 const context=contextRow.frozen_payload,ref=context.baseline.baselinePackageRef;assert.equal(ref.kind,'OperatingBaselinePackage');sourceRef273(ref);const packageRow=one('operating_baseline_package',ref.id),pkg=exact(packageRow);assert(!old('operating_baseline_package').some(r=>JSON.parse(r.raw).id===pkg.id));assert.equal(pkg.project_id,prepared.scope.projectId);assert.equal(pkg.is_current,false);assert.equal(pkg.status,'active');assert.equal(pkg.producer_version,1);assert.equal(pkg.row_version,1);for(const f of['created_by','updated_by','effective_by'])assert.equal(pkg[f],prepared.scope.actorId);assert.equal(pkg.currency,'CNY');
 const sourceRow=one('operating_baseline_source',pkg.source_context_id),source=exact(sourceRow),draft=source.frozen_payload,proof=draft.historicalPeriodSelection,expected=prepared.scope.ghFacts.periodHistorical273;assert(expected);assert(!old('operating_baseline_source').some(r=>JSON.parse(r.raw).id===source.id));assert.equal(source.project_id,pkg.project_id);assert.equal(source.captured_by,prepared.scope.actorId);assert.equal(source.producer_version,1);assert.equal(source.row_version,1);assert.equal(source.currency,pkg.currency);assert.equal(draft.id,source.id);assert.equal(draft.projectId,pkg.project_id);assert.equal(draft.currency,pkg.currency);
 const publicProof={policyVersion:proof.policyVersion,publicationMode:'new-period-package',periodKey:proof.periodKey,businessCutoff:proof.businessCutoff,selectionHash:proof.selectionHash,originalAdoptedCostRef:proof.originalCostRef,selectedAdoptedCostRef:proof.selectedCostRef,handoverBasisRef:proof.handoverBasisRef,handoverRebaselineRef:proof.handoverRebaselineRef,adoptionSourceRefs:proof.adoptionSourceRefs,technicalLineageRefs:proof.technicalLineageRefs};assert.deepEqual(publicProof,expected.selection);assert.equal(proof.schemaVersion,1);assert.equal(proof.periodKey,prepared.body.periodKey);assert.equal(proof.businessCutoff,prepared.calendar.prior_end);assert.equal(proof.policyVersion,POLICY273);
 const hashSelection=structuredClone(proof);delete hashSelection.selectionHash;assert.equal(canonicalHash273({projectId:pkg.project_id,selection:hashSelection}),proof.selectionHash);const hashSource=structuredClone(draft);for(const field of['id','sourceHash','payloadHash'])delete hashSource[field];assert.equal(canonicalHash273(hashSource),draft.sourceHash);const hashPayload=structuredClone(draft);delete hashPayload.payloadHash;assert.equal(canonicalHash273(hashPayload),draft.payloadHash);assert.equal(source.source_hash,draft.sourceHash);assert.equal(source.payload_hash,draft.payloadHash);assert.equal(pkg.source_hash,draft.sourceHash);
 for(const[field,column,businessVersion]of[['originalCostRef','original_cost_package_id',expected.originalBusinessVersion],['currentCostRef','current_cost_package_id',expected.selectedBusinessVersion]]){assert.equal(source[column],draft[field].id);assert.equal(source[column.replace('_id','_version')],businessVersion);actualRef273(draft[field],old);}for(const[field,column]of[['handoverBasisRef','handover_basis_id'],['handoverRebaselineRef','handover_rebaseline_id']])assert.equal(source[column],draft[field]?.id??null);
 assert.equal(netMoney273(draft.originalBaselineCost).toString(),expected.originalNetCents);assert.equal(netMoney273(draft.currentEffectiveBaselineCost).toString(),expected.selectedNetCents);assert.equal(netMoney273(draft.changePackageTotal),BigInt(expected.selectedNetCents)-BigInt(expected.originalNetCents));for(const[field,column]of[['originalBaselineCost','original_baseline_cost'],['handoverBaselineCost','handover_baseline_cost'],['executionChangePackageTotal','execution_change_package_total'],['changePackageTotal','change_package_total'],['currentEffectiveBaselineCost','current_effective_baseline_cost']])assert.equal(netMoney273(draft[field]),netMoney273(pkg[column]));
 const completeObserved004=assertObservedProof004(proof,old,pkg.project_id,context.snapshot.knowledgeCutoff,expected);assert.equal(completeObserved004.transitionCount,draft.approvedTransitions.length);
 const witnesses=assertWitnesses273(proof,old,pkg.project_id);const economics=historicalEconomicsProof273(proof,old,pkg.project_id,expected,context.snapshot.knowledgeCutoff);assert.equal(netMoney273(draft.handoverBaselineCost).toString(),economics.handoverNetCents);assert(Array.isArray(draft.approvedTransitions));assert.deepEqual(source.approved_transitions,draft.approvedTransitions);assert.equal(draft.approvedTransitions.length,expected.transitionCount);assert.equal(proof.chainSegments.length,expected.transitionCount);for(let i=0;i<expected.transitions.length;i++){const e=expected.transitions[i],t=draft.approvedTransitions[i],segment=proof.chainSegments[i];assert.deepEqual(Object.keys(t).sort(),['beforeCostRef','afterCostRef','approvalSourceRefs','deltaNetCents'].sort());assert.deepEqual(t.beforeCostRef,e.beforeCostRef);assert.deepEqual(t.afterCostRef,e.afterCostRef);assert.equal(netMoney273(t.deltaNetCents).toString(),e.deltaNetCents);assert.deepEqual(segment.beforeCostRef,e.beforeCostRef);assert.deepEqual(segment.afterCostRef,e.afterCostRef);const a=expected.technicalPathIds.indexOf(e.beforeCostRef.id),b=expected.technicalPathIds.indexOf(e.afterCostRef.id);assert(a>=0&&b>a);assert.deepEqual(segment.technicalPathRefs.map(r=>r.id),expected.technicalPathIds.slice(a,b+1));const selectedWitnesses=witnesses.filter(w=>w.costRef.id===e.afterCostRef.id),approvals=[...new Map(selectedWitnesses.flatMap(w=>[w.termRef,w.preparationRef,w.reviewBindingRef]).map(r=>[key(r),r])).values()];assert(approvals.length>0);assert.deepEqual(t.approvalSourceRefs,approvals);for(const r of t.approvalSourceRefs)actualRef273(r,old);assert.equal(instant273(segment.adoptedAt),selectedWitnesses.map(w=>instant273(w.adoptedAt)).reduce((a,b)=>a<b?a:b));}
 let execution=0n;if(proof.executionStageRef){const r=JSON.parse(actualRef273(proof.executionStageRef,old).raw);assert.equal(r.project_id,pkg.project_id);assert.equal(r.event_type,'stage-entered');assert.equal(r.from_stage,'handover');assert.equal(r.to_stage,'execution');assert.equal(r.producer_version,1);for(let i=0;i<expected.transitions.length;i++)if(instant273(proof.chainSegments[i].adoptedAt)>=instant273(r.entered_at))execution+=BigInt(expected.transitions[i].deltaNetCents);}assert.equal(netMoney273(draft.executionChangePackageTotal),execution);
 const allChanges=now('change_package_baseline').map(exact).filter(r=>r.baseline_package_id===pkg.id);assert.equal(allChanges.length,expected.transitionCount);for(const transition of draft.approvedTransitions){const matches=allChanges.filter(r=>r.before_cost_package_id===transition.beforeCostRef.id&&r.after_cost_package_id===transition.afterCostRef.id);assert.equal(matches.length,1);const c=matches[0],w=transition.approvalSourceRefs[0];assert.equal(c.change_package_id,transition.afterCostRef.id);assert.equal(c.created_by,prepared.scope.actorId);assert.equal(c.status,'active');assert.equal(netMoney273(c.change_amount),netMoney273(transition.deltaNetCents));for(const[f,v]of Object.entries({source_kind:w.kind,source_id:w.id,source_row_version:w.rowVersion,source_payload_hash:w.payloadHash}))assert.equal(c[f],v);}
 const lower=instant273(before.capturedAt),upper=instant273(after.capturedAt);assert(upper>=lower);for(const at of[source.captured_at,pkg.created_at,pkg.updated_at,pkg.effective_at,...allChanges.map(r=>r.effective_at)]){const time=instant273(at);assert(time>=lower&&time<=upper,'Historical G capture timestamps use actual command now, never period backdates');}
 const temporalCount=assertTemporalClosure273(proof,old,pkg.project_id),newRefs=[factualRef273('OperatingBaselinePackage',packageRow),factualRef273('OperatingBaselineSource',sourceRow)];assert.deepEqual(ref,newRefs[0]);
 const closure=[];for(const field of['contracts','receipts','costs','allocations','taxTreatments','pendingFacts','unclassifiedSourceRefs']){assert(Array.isArray(context[field]));refs273(context[field],closure);}refs273(draft,closure);closure.push(...lateAllocationClosure298(context,old,pkg.project_id,proof.businessCutoff));for(const cost of context.costs){const id=cost.classification.decisionId,decision=old('project_cost_inclusion_decision').filter(r=>JSON.parse(r.raw).id===id);assert.equal(decision.length,1);closure.push(factualRef273('ProjectCostInclusionDecision',decision[0]));}closure.push(...newRefs);const expectedClosure=uniqueRefs273(closure);assert.deepEqual(refSet273(context.scope.closureEvidenceRefs),refSet273(expectedClosure),'Full recursive 273 factual closure must equal actual final context');
 const members=now('operating_source_member').filter(r=>JSON.parse(r.raw).context_id===contextRow.id);assert.equal(members.length,expectedClosure.length);const actualKeys=[];for(const row of members){const value=JSON.parse(row.raw),r={kind:value.source_kind,id:value.source_id,rowVersion:value.source_row_version,payloadHash:value.source_payload_hash};assert.equal(value.member_key,physicalMemberKey004(r));actualKeys.push(key(r));const payload=typedJSON273(row.raw).captured_payload;assert.equal(canonicalHash273(payload),r.payloadHash,'Captured member bytes/hash must agree');const current=actualRef273(r,now);assert.equal(canonicalText273(payload),canonicalText273(factualPayload273(r.kind,current)),'Every member payload must equal its complete real factual projection');}assert.deepEqual(actualKeys.sort(),refSet273(expectedClosure));for(const r of newRefs)assert(actualKeys.includes(key(r)));
 assert(typeof prepared.normalRequestId==='string'&&prepared.normalRequestId);assert(['ProjectCostController_createPeriodClosingSnapshot','ProjectCostController_createProjectOperatingSnapshot'].includes(prepared.operationId));const audits=now('audit_log').map(r=>JSON.parse(r.raw)).filter(r=>r.request_id===prepared.normalRequestId&&r.event_type===prepared.operationId);assert.equal(audits.length,1);assert.deepEqual(audits[0].metadata.after.historicalPeriodBaseline,{baselinePackageRef:newRefs[0],baselineSourceRef:newRefs[1],selectionHash:expected.selectionHash,periodKey:expected.periodKey,policyVersion:expected.policyVersion,selectedAdoptedCostRef:expected.selection.selectedAdoptedCostRef,originalAdoptedCostRef:expected.selection.originalAdoptedCostRef,adoptedTransitionCount:expected.transitionCount});
 return{newBaselineId:pkg.id,newSourceId:source.id,newBaselineRef:newRefs[0],newSourceRef:newRefs[1],transitionIds:allChanges.map(r=>r.id).sort(),transitionCount:expected.transitionCount,memberKeys:expectedClosure.map(physicalMemberKey004).sort(),memberReferenceIdentities:actualKeys,memberCount:expectedClosure.length,temporalFactCount:temporalCount,historicalEconomics:economics,selectedHistoricalBudgetRef:expected.selection.selectedAdoptedCostRef,selectionHash:expected.selectionHash,oldBaselineWrites:0,fullClosureVerified:true};
}


// BEGIN FINAL273002_ECONOMIC_ORACLE
// Independent observed-row oracle for the final273002 internal proof. This
// validates instrumentation/economic facts; it does not authorize a budget.
const moneyText273=n=>{const x=n<0n?-n:n;return(n<0n?'-':'')+(x/100n)+'.'+String(x%100n).padStart(2,'0');};
const dayHK273=at=>new Date(Number(instant273(at)/1000000n)+8*60*60*1000).toISOString().slice(0,10);
const withinPeriod273=(at,cutoff,knowledge)=>instant273(at)<=instant273(knowledge)&&dayHK273(at)<=cutoff;
const maybeInstant273=at=>{try{return instant273(at);}catch{return null;}};
const tableValues273=(rows,table)=>rows(table).map(r=>({row:r,value:JSON.parse(r.raw)}));
function observedById273(rows,kind,id){const meta=factualMap273[kind];assert(meta);const found=rows(meta.table).filter(r=>JSON.parse(r.raw)[meta.id]===id);assert.equal(found.length,1,'One actual '+kind+' ID is required');return{row:found[0],value:JSON.parse(found[0].raw),ref:factualRef273(kind,found[0])};}
function sameOptionalRef273(actual,expected){assert.deepEqual(actual,expected??null);}
function frozenSource273(row){
 const value=JSON.parse(row.raw),draft=value.frozen_payload;assert(draft&&typeof draft==='object'&&!Array.isArray(draft));assert.equal(value.producer_version,1);assert.equal(value.row_version,1);assert.equal(value.id,draft.id);assert.equal(value.project_id,draft.projectId);assert.equal(value.original_cost_package_id,draft.originalCostRef.id);assert.equal(value.current_cost_package_id,draft.currentCostRef.id);assert.equal(value.currency,draft.currency);assert.equal(value.source_hash,draft.sourceHash);assert.equal(value.payload_hash,draft.payloadHash);assert.deepEqual(value.approved_transitions,draft.approvedTransitions);
 const p=structuredClone(draft);delete p.payloadHash;assert.equal(canonicalHash273(p),draft.payloadHash);delete p.id;delete p.sourceHash;assert.equal(canonicalHash273(p),draft.sourceHash);return{value,draft};
}
export function frozenEconomicFacts273(proof,rows,projectId,knowledge){
 const adopted=new Set(proof.adoptionSourceRefs.filter(r=>r.kind==='ProjectTechnicalCostPackage').map(r=>r.id)),expected=[];
 for(const {row,value}of tableValues273(rows,'operating_baseline_source').filter(r=>r.value.project_id===projectId)){
  const raw=value.frozen_payload,references=[raw?.originalCostRef,raw?.currentCostRef,...(Array.isArray(raw?.approvedTransitions)?raw.approvedTransitions.flatMap(t=>[t.beforeCostRef,t.afterCostRef]):[])];if(!references.some(r=>adopted.has(r?.id)))continue;
  const {draft}=frozenSource273(row);assert.equal(draft.projectId,projectId);assert(instant273(value.captured_at)<=instant273(knowledge));assert(Array.isArray(draft.approvedTransitions));let previous=sourceRef273(draft.originalCostRef),amount=netMoney273(draft.originalBaselineCost);const chain=[[previous,amount]],seen=new Set([previous.id]);
  for(const t of draft.approvedTransitions){assert.deepEqual(t.beforeCostRef,previous);sourceRef273(t.afterCostRef);assert(!seen.has(t.afterCostRef.id));seen.add(t.afterCostRef.id);amount+=netMoney273(t.deltaNetCents);chain.push([t.afterCostRef,amount]);previous=t.afterCostRef;}assert.deepEqual(previous,draft.currentCostRef);assert.equal(amount,netMoney273(draft.currentEffectiveBaselineCost));
  for(const [recorded,net]of chain){if(!adopted.has(recorded.id))continue;const actual=observedById273(rows,'ProjectTechnicalCostPackage',recorded.id),cost=actual.value;assert.equal(cost.project_id,projectId);assert.equal(cost.currency_code,draft.currency);assert.equal(netMoney273(typeof cost.total_estimated_amount_excluding_tax==='number'?exact(actual.row).total_estimated_amount_excluding_tax:cost.total_estimated_amount_excluding_tax),net);assert(Number.isSafeInteger(cost.version)&&cost.version>0);if(recorded.id===draft.originalCostRef.id)assert.equal(value.original_cost_package_version,cost.version);if(recorded.id===draft.currentCostRef.id)assert.equal(value.current_cost_package_version,cost.version);
   assert.equal(recorded.kind,'ProjectTechnicalCostPackage');assert(recorded.rowVersion>0);assert(cost.status==='effective'&&cost.is_current===true||cost.status==='superseded'&&cost.is_current===false);let mode='exact-observed-ref';if(key(actual.ref)!==key(recorded)){assert.equal(cost.status,'superseded');assert.equal(cost.is_current,false);assert.equal(cost.row_version,recorded.rowVersion+1);const comparison=factualPayload273('ProjectTechnicalCostPackage',actual.row);comparison.status='effective';comparison.row_version=recorded.rowVersion;assert.equal(canonicalHash273(comparison),recorded.payloadHash,'A lifecycle bridge cannot conceal changed economics or factual columns');mode='verified-single-supersede-lifecycle';}
   expected.push({baselineSourceRef:factualRef273('OperatingBaselineSource',row),observedCostRef:actual.ref,recordedCostKind:recorded.kind,recordedCostId:recorded.id,recordedCostRowVersion:recorded.rowVersion,recordedCostPayloadHash:recorded.payloadHash,verifiedDomainVersion:cost.version,currency:draft.currency,netCost:moneyText273(net),comparisonMode:mode});
  }
 }
 expected.sort((a,b)=>a.observedCostRef.id<b.observedCostRef.id?-1:a.observedCostRef.id>b.observedCostRef.id?1:a.baselineSourceRef.id<b.baselineSourceRef.id?-1:a.baselineSourceRef.id>b.baselineSourceRef.id?1:0);assert(expected.length<=1000);
 if(expected.length)assert.deepEqual(proof.frozenEconomicWitnesses,expected,'Every relevant immutable old G source must be present as an observed witness');else assert(!Object.hasOwn(proof,'frozenEconomicWitnesses'),'Empty witnesses are omitted by the exact internal serializer');return expected;
}
function handoverBasis273(rows,projectId,h){const b=observedById273(rows,'ProjectHandoverBasisSnapshot',h.basis_snapshot_id);assert.equal(b.value.project_id,projectId);assert(['active','superseded'].includes(b.value.status));assert.equal(b.value.version,h.version);assert.equal(b.value.source_payload.projectId,projectId);assert.equal(canonicalHash273(typedJSON273(b.row.raw).source_payload),b.value.payload_hash);assert.equal(b.value.source_hash,h.source_payload_hash);assert(instant273(b.value.generated_at)<=instant273(h.created_at));return b;}
function handoverAnchor273(rows,projectId,h,b){const term=observedById273(rows,'ContractTermSnapshot',h.effective_handover_baseline_snapshot_id),contract=observedById273(rows,'Contract',term.value.contract_id);assert.equal(contract.value.project_id,projectId);assert(Array.isArray(b.value.source_payload.members));assert(b.value.source_payload.members.some(m=>m.snapshotId===term.value.id&&m.contractId===contract.value.id));return term;}
function changedHandoverContracts273(before,after){const old=before.source_payload.members,next=after.source_payload.members;assert(Array.isArray(old)&&Array.isArray(next));return old.some(a=>!next.some(b=>b.contractId===a.contractId&&b.snapshotId===a.snapshotId));}
export function handoverEconomicFacts273(proof,rows,projectId,expected,knowledge){
 const cutoff=proof.businessCutoff,handoverRows=tableValues273(rows,'project_handover').filter(x=>x.value.project_id===projectId),byId=new Map(handoverRows.map(x=>[x.value.id,x])),paths=new Map();
 for(const {value:row}of handoverRows){if(row.confirmed_at===null&&['draft','superseded'].includes(row.status))continue;instant273(row.confirmed_at);if(!withinPeriod273(row.confirmed_at,cutoff,knowledge))continue;const path=[],seen=new Set();let id=row.id;
  while(id!==null){assert(!seen.has(id));seen.add(id);assert(path.length<1000);const here=byId.get(id);assert(here);const h=here.value;assert.equal(h.project_id,projectId);assert.equal(h.producer_version,1);assert(['draft','confirmed','superseded'].includes(h.status));uuid(h.confirmation_record_id);assert(Number.isSafeInteger(h.version)&&h.version>0);assert(instant273(h.created_at)<=instant273(knowledge));if(h.confirmed_at!==null){assert(instant273(h.created_at)<=instant273(h.confirmed_at));assert(withinPeriod273(h.confirmed_at,cutoff,knowledge));assert(['confirmed','superseded'].includes(h.status));}else assert.notEqual(h.status,'confirmed');const b=handoverBasis273(rows,projectId,h);assert(withinPeriod273(b.value.generated_at,cutoff,knowledge));handoverAnchor273(rows,projectId,h,b);path.push(h.id);
   if(h.supersedes_id!==null){const parent=byId.get(h.supersedes_id);assert(parent);const pb=handoverBasis273(rows,projectId,parent.value);assert(parent.value.version<h.version);assert(instant273(parent.value.created_at)<=instant273(h.created_at));assert.equal(b.value.supersedes_id,parent.value.basis_snapshot_id);assert(instant273(pb.value.generated_at)<=instant273(b.value.generated_at));if(parent.value.confirmed_at!==null&&h.confirmed_at!==null)assert(instant273(parent.value.confirmed_at)<=instant273(h.confirmed_at));}else assert.equal(b.value.supersedes_id,null);id=h.supersedes_id;
  }paths.set(row.id,path);
 }
 if(!paths.size){for(const k of['handoverRef','handoverBasisRef','handoverRebaselineRef'])assert.equal(proof[k],null);assert(!Object.hasOwn(proof,'handoverLineage'));return{handoverNetCents:expected.originalNetCents,handoverBudgetId:expected.adoptedBudgetIds[0],handoverPathIds:[],rebaselineIds:[]};}
 const maxima=[...paths.keys()].filter(id=>![...paths].some(([other,path])=>other!==id&&path.slice(1).includes(id)));assert.equal(maxima.length,1,'Ambiguous real handover maxima must block');const path=paths.get(maxima[0]),latest=byId.get(maxima[0]),basis=handoverBasis273(rows,projectId,latest.value);assert.deepEqual(proof.handoverRef,factualRef273('ProjectHandover',latest.row));assert.deepEqual(proof.handoverBasisRef,basis.ref);
 const records=[],recordById=new Map(),seenRecords=new Set();let recordId=latest.value.handover_rebaseline_record_id;while(recordId!==null){assert(!seenRecords.has(recordId));seenRecords.add(recordId);assert(seenRecords.size<=1000);const r=observedById273(rows,'ContractHandoverRebaselineRecord',recordId),v=r.value;assert.equal(v.project_id,projectId);assert.equal(v.producer_version,1);assert(['effective','superseded'].includes(v.status));assert(instant273(v.created_at)<=instant273(v.handled_at));assert(instant273(v.created_at)<=instant273(knowledge));assert(withinPeriod273(v.handled_at,cutoff,knowledge));const a=path.indexOf(v.replacement_handover_id),b=path.indexOf(v.source_handover_id);assert(a>=0&&b===a+1);const source=byId.get(v.source_handover_id),replacement=byId.get(v.replacement_handover_id),before=handoverBasis273(rows,projectId,source.value),after=handoverBasis273(rows,projectId,replacement.value),anchor=handoverAnchor273(rows,projectId,replacement.value,after);assert.equal(v.basis_before_id,before.value.id);assert.equal(v.basis_after_id,after.value.id);assert.equal(v.effective_baseline_after_id,anchor.value.id);uuid(v.contract_amendment_id);assert.equal(v.contract_amendment_id,anchor.value.source_amendment_id);assert.equal(replacement.value.handover_rebaseline_record_id,v.id);assert.equal(source.value.handover_rebaseline_record_id,v.supersedes_id);assert(instant273(source.value.created_at)<=instant273(v.handled_at));assert(instant273(replacement.value.created_at)<=instant273(v.handled_at));if(replacement.value.confirmed_at!==null)assert(instant273(v.handled_at)<=instant273(replacement.value.confirmed_at));let supersedes=null;if(v.supersedes_id!==null){const p=observedById273(rows,'ContractHandoverRebaselineRecord',v.supersedes_id);assert.equal(p.value.project_id,projectId);assert(instant273(p.value.handled_at)<=instant273(v.handled_at));supersedes=p.ref;}const link={recordRef:r.ref,sourceHandoverRef:factualRef273('ProjectHandover',source.row),replacementHandoverRef:factualRef273('ProjectHandover',replacement.row),beforeBasisRef:before.ref,afterBasisRef:after.ref,effectiveBaselineAfterRef:anchor.ref,supersedesRecordRef:supersedes,createdAt:v.created_at,handledAt:v.handled_at};records.push(link);recordById.set(v.id,link);recordId=v.supersedes_id;}
 const links=path.map((id,i)=>{const h=byId.get(id),b=handoverBasis273(rows,projectId,h.value),anchor=handoverAnchor273(rows,projectId,h.value,b),parent=i+1<path.length?byId.get(path[i+1]):null,pb=parent?handoverBasis273(rows,projectId,parent.value):null,rid=h.value.handover_rebaseline_record_id,r=rid===null?null:recordById.get(rid);if(rid!==null)assert(r);if(parent){const prior=parent.value.handover_rebaseline_record_id;if(rid===prior){assert(!changedHandoverContracts273(pb.value,b.value),'An ordinary inherited handover cannot silently change a former contract');if(r){assert.equal(anchor.value.id,r.effectiveBaselineAfterRef.id);assert(instant273(r.handledAt)<=instant273(h.value.created_at));}}else{assert(r);assert.equal(r.replacementHandoverRef.id,id);assert.equal(r.sourceHandoverRef.id,parent.value.id);assert.equal(r.supersedesRecordRef?.id??null,prior);}}else assert.equal(rid,null);if(r){assert.equal(anchor.value.id,r.effectiveBaselineAfterRef.id);if(h.value.confirmed_at!==null)assert(instant273(r.handledAt)<=instant273(h.value.confirmed_at));}return{handoverRef:factualRef273('ProjectHandover',h.row),basisRef:b.ref,supersedesHandoverRef:parent?factualRef273('ProjectHandover',parent.row):null,basisSupersedesRef:pb?.ref??null,effectiveBaselineRef:anchor.ref,rebaselineRef:r?.recordRef??null,createdAt:h.value.created_at,generatedAt:b.value.generated_at,confirmedAt:h.value.confirmed_at};});
 assert(proof.handoverLineage);const normalizeTimes=x=>{if(Array.isArray(x))return x.map(normalizeTimes);if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[/At$/.test(k)&&v!==null?k:k,/At$/.test(k)&&v!==null?instant273(v).toString():normalizeTimes(v)]));return x;};assert.deepEqual(normalizeTimes(proof.handoverLineage),normalizeTimes({handoverLinks:links,rebaselineLinks:records}));sameOptionalRef273(proof.handoverRebaselineRef,records[0]?.recordRef);
 const budgetIds=new Set();assert(basis.value.source_payload.members.length>0);for(const member of basis.value.source_payload.members){const cost=member.sourceFacts?.cost;assert(cost);const at=expected.adoptedBudgetIds.indexOf(cost.id);assert(at>=0);const actual=observedById273(rows,'ProjectTechnicalCostPackage',cost.id);assert.equal(actual.value.project_id,projectId);assert.equal(actual.value.version,cost.version);assert(proof.observedAdoptions.some(w=>w.costRef.id===cost.id&&member.contractId===w.contractRef.id&&member.snapshotId===w.termRef.id&&member.preparationId===w.preparationRef.id&&member.reviewApprovalId===w.approvalRef.id&&cost.rowVersion===w.recordedCostRowVersion&&instant273(w.adoptedAt)<=instant273(basis.value.generated_at)));budgetIds.add(cost.id);}
 const selected=[...budgetIds].sort((a,b)=>expected.adoptedBudgetIds.indexOf(a)-expected.adoptedBudgetIds.indexOf(b)).at(-1),cost=observedById273(rows,'ProjectTechnicalCostPackage',selected);return{handoverNetCents:netMoney273(exact(cost.row).total_estimated_amount_excluding_tax).toString(),handoverBudgetId:selected,handoverPathIds:path,rebaselineIds:records.map(r=>r.recordRef.id)};
}
export function historicalEconomicsProof273(proof,rows,projectId,expected,knowledge){
 assert.equal(proof.policySourceHash,'ef5294f25b1f8c16bdfe072ae7910e0947ff3e3673a0a4f6b88a5958ef451a4e');const handover=handoverEconomicFacts273(proof,rows,projectId,expected,knowledge),witnesses=frozenEconomicFacts273(proof,rows,projectId,knowledge);return{...handover,priorEconomicWitnessCount:witnesses.length,priorBaselineSourceIds:[...new Set(witnesses.map(w=>w.baselineSourceRef.id))].sort()};
}
export function observedPublicPeriodRefs273(ctx,snapshot,preparation,readRows){const rows=t=>readRows(snapshot.databases[ctx.database].tables[t]);const references=uniqueRefs273(refs273(preparation));for(const r of references)actualRef273(r,rows);return references;}
export function observedCurrentCostUnits273(ctx,snapshot,projectId,readRows){const values=t=>readRows(snapshot.databases[ctx.database].tables[t]).map(r=>JSON.parse(r.raw));const units=[...values('project_actual_cost_record').filter(r=>r.project_id===projectId&&!['voided','replaced'].includes(r.record_status)).map(r=>'cost:'+r.id),...values('shared_cost_allocation_result').filter(r=>r.project_id===projectId&&['active','pending'].includes(r.status)).map(r=>'allocation:'+r.id)];assert.equal(new Set(units).size,units.length);return units.sort();}


// BEGIN PERIOD298_OBSERVED_COMPLETE_LATE_CLOSURE
// Qualification is the source-locked Rust298 responsibility. This independent
// normal observer derives its *whole* additional opaque closure from actual
// before rows, never from a client list or context self-declaration.
export function lateAllocationClosure298(context,rows,projectId,cutoff){
 const values=t=>rows(t).map(row=>({row,value:JSON.parse(row.raw)})),one=(t,fn)=>{const found=values(t).filter(x=>fn(x.value));assert.equal(found.length,1,'Unique real late-allocation relation '+t);return found[0];};
 const references=[],observe=(kind,pair)=>{references.push(factualRef273(kind,pair.row));const v=pair.value;for(const f of['created_at','effective_at','updated_at'])if(v[f]!==undefined&&v[f]!==null)assert(instant273(v[f])<=instant273(context.snapshot.knowledgeCutoff),'Late provenance must have been known by the actual capture');return v;};
 const day=value=>{assert(typeof value==='string');if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;instant273(value);return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));};
 const costs=context.costs.filter(c=>c.recognitionRole==='allocation-share');
 for(const cost of costs){const current=one('shared_cost_allocation_result',r=>r.id===cost.allocationResultRef.id);assert.equal(current.value.project_id,projectId);if(day(current.value.effective_at)<=cutoff)continue;
   let id=current.value.basis_id,latest=true;const seen=new Set();
   while(true){assert(!seen.has(id),'No missing/cyclic real F ancestry');seen.add(id);const bp=one('shared_cost_allocation_basis',b=>b.id===id),basis=observe('SharedCostAllocationBasis',bp);assert.equal(basis.status,latest?'active':'superseded');assert.equal(basis.governance_schema_version,1);
     const ep=one('cost_governance_evidence',e=>e.id===basis.governance_evidence_id),e=observe('CostGovernanceEvidence',ep);assert.equal(e.target_type,'SharedCostAllocationBasis');assert.equal(e.target_id,basis.id);assert.equal(e.payload_hash,canonicalHash273(typedJSON273(ep.row.raw).frozen_payload));assert.equal(e.frozen_payload.predecessorBasisId,basis.supersedes_id);
     const snapshots=values('shared_cost_allocation_source_snapshot').filter(x=>x.value.basis_id===id),sources=e.frozen_payload.sources;assert(Array.isArray(sources)&&sources.length>0);assert.equal(snapshots.length,sources.length);assert.equal(new Set(snapshots.map(s=>s.value.cost_record_id)).size,snapshots.length);
     for(const sp of snapshots){const s=observe('SharedCostAllocationSourceSnapshot',sp),source=sources.filter(x=>x.cost.id===s.cost_record_id);assert.equal(source.length,1);assert.equal(s.is_current,latest);assert.equal(s.source_payload_hash,canonicalHash273(typedJSON273(sp.row.raw).source_payload));assert.deepEqual(s.source_payload,source[0]);if(latest){const cp=one('project_actual_cost_record',c=>c.id===s.cost_record_id),c=observe('ProjectActualCostRecord',cp);assert.equal(c.row_version,s.cost_row_version);assert(day(c.occurred_on)<=cutoff,'An actual future member cannot be trimmed into the positive period');}}
     const peers=values('shared_cost_allocation_result').filter(x=>x.value.basis_id===id),items=e.frozen_payload.projectShares;assert(Array.isArray(items)&&items.length>0);assert.equal(peers.length,items.length);assert.deepEqual(peers.map(p=>p.value.project_id).sort(),items.map(p=>p.projectId).sort());
     for(const rp of peers){const r=observe('SharedCostAllocationResult',rp);assert.equal(r.status,latest?'active':'superseded');assert.equal(r.replacement_operation_id,basis.replacement_operation_id);const gp=one('cost_governance_evidence',p=>p.id===r.governance_evidence_id),g=observe('CostGovernanceEvidence',gp);assert.equal(g.target_type,'SharedCostAllocationResult');assert.equal(g.target_id,r.id);assert.equal(g.project_id,r.project_id);assert.equal(g.payload_hash,canonicalHash273(typedJSON273(gp.row.raw).frozen_payload));assert.equal(g.frozen_payload.basisId,id);assert.equal(g.frozen_payload.predecessorResultId,r.supersedes_id);const old=basis.supersedes_id===null?[]:values('shared_cost_allocation_result').filter(x=>x.value.basis_id===basis.supersedes_id&&x.value.project_id===r.project_id);assert(old.length<=1);assert.equal(r.supersedes_id,old[0]?.value.id??null);}
     if(basis.supersedes_id===null)break;assert(typeof basis.supersedes_id==='string');id=basis.supersedes_id;latest=false;
   }
 }
 return uniqueRefs273(references);
}
// END PERIOD298_OBSERVED_COMPLETE_LATE_CLOSURE


// The Rust fallback anchor is period.project_snapshot_id, never the prior
// restatement terminal. Derive it from exact captured before rows and bind
// both FK directions plus the immutable root-context payload.
export function periodOriginalRootContext005(context,originalRows){
 const ref=sourceRef273(context.snapshot.periodEndSnapshotRef);assert.equal(ref.kind,'PeriodClosingSnapshot');uuid(context.projectId);
 const period=exact(actualRef273(ref,originalRows));assert.equal(period.project_id,context.projectId);assert.equal(period.producer_version,1);uuid(period.project_snapshot_id);
 const snapshots=originalRows('project_operating_snapshot').map(exact).filter(s=>s.id===period.project_snapshot_id);assert.equal(snapshots.length,1,'Original period root snapshot must be unique');const snapshot=snapshots[0];assert.equal(snapshot.project_id,context.projectId);assert.equal(snapshot.producer_version,1);assert.equal(snapshot.snapshot_mode,'period-end');assert.equal(snapshot.root_snapshot_id,snapshot.id);assert.equal(snapshot.period_end_snapshot_id,period.id);uuid(snapshot.source_context_id);
 const roots=originalRows('operating_source_context').filter(r=>exact(r).snapshot_id===snapshot.id);assert.equal(roots.length,1,'Original period root context must be unique');const root=exact(roots[0]),payload=typedJSON273(roots[0].raw).frozen_payload;
 assert.equal(root.id,snapshot.source_context_id);assert.equal(root.id,period.source_context_id);assert.equal(root.project_id,context.projectId);assert.equal(root.producer_version,1);assert.equal(root.frozen_payload.contextId,root.id);assert.equal(root.frozen_payload.projectId,context.projectId);assert.equal(root.frozen_payload.snapshot.id,snapshot.id);assert.equal(root.frozen_payload.snapshot.mode,'period-end');assert.equal(root.frozen_payload.snapshot.periodKey,period.period_key);assert.equal(root.frozen_payload.sourceHash,root.source_hash);assert.equal(root.source_hash,snapshot.source_hash);assert.equal(root.source_hash,period.source_hash);assert.equal(canonicalHash273(payload),root.payload_hash,'Immutable original root context bytes/hash');
 return{periodId:period.id,rootSnapshotId:snapshot.id,contextId:root.id};
}
// Source14 existing-period successors keep frozen refs as frozen refs. Only
// the immutable original period root may supply a missing-current member.
export function verifyRestatedMembers273(context,rows,originalRows,originalContextId,{period=false}={}){
 const refs=context.scope.closureEvidenceRefs;assert(Array.isArray(refs));const expected=refSet273(refs),members=rows('operating_source_member').filter(r=>JSON.parse(r.raw).context_id===context.contextId);assert.equal(members.length,expected.length);
 const anchor=period?periodOriginalRootContext005(context,originalRows):null;if(anchor)assert.equal(originalContextId,anchor.contextId,'Caller origin must equal the actual original period root');
 const original=anchor?originalRows('operating_source_member').filter(r=>JSON.parse(r.raw).context_id===anchor.contextId):[],seen=[];let frozen=0;
 for(const member of members){const v=JSON.parse(member.raw),r=sourceRef273({kind:v.source_kind,id:v.source_id,rowVersion:v.source_row_version,payloadHash:v.source_payload_hash});assert(factualMap273[r.kind],'Frozen copy does not admit a new SourceKind');assert.equal(v.member_key,physicalMemberKey004(r));seen.push(key(r));const captured=typedJSON273(member.raw).captured_payload;assert.equal(canonicalHash273(captured),r.payloadHash);
   let actual;try{actual=actualRef273(r,rows);}catch(error){if(!period)throw error;const matches=original.filter(row=>{const x=JSON.parse(row.raw);return x.member_key===physicalMemberKey004(r)&&x.source_kind===r.kind&&x.source_id===r.id&&x.source_row_version===r.rowVersion&&x.source_payload_hash===r.payloadHash;});assert.equal(matches.length,1,'Frozen member requires exact original root relation');const payload=typedJSON273(matches[0].raw).captured_payload;assert.equal(canonicalHash273(payload),r.payloadHash);assert.equal(canonicalText273(payload),canonicalText273(captured));frozen++;continue;}
   assert.equal(canonicalText273(factualPayload273(r.kind,actual)),canonicalText273(captured),'Restated member is complete actual source payload');
 }
 assert.deepEqual(seen.sort(),expected);return{memberCount:members.length,allPayloadHashesVerified:true,frozenOriginalMembersCopied:frozen,...(anchor?{originalPeriodRoot:anchor}:{})};
}


// INDEPENDENT BEFORE ORACLE004. Relational joins start from every actual
// same-project contract/term in before, not a list supplied by server proof.
const witnessFields004=['costRef','recordedCostVersion','recordedCostRowVersion','contractRef','termRef','preparationRef','reviewBindingRef','approvalRef','costEffectiveAt','termEffectiveAt','preparationActivatedAt','approvalDecidedAt','adoptedAt','eligibleForPeriod'];
const witnessRefs004=['costRef','contractRef','termRef','preparationRef','reviewBindingRef','approvalRef'];
const witnessTimes004=['costEffectiveAt','termEffectiveAt','preparationActivatedAt','approvalDecidedAt','adoptedAt'];
const hkDay004=value=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
const positive004=value=>{assert(Number.isSafeInteger(value)&&value>0&&value<=2147483647);return value;};
function witnessShape004(w){assert.deepEqual(Object.keys(w).sort(),[...witnessFields004].sort());const out={};for(const name of witnessRefs004)out[name]=key(sourceRef273(w[name]));for(const name of witnessTimes004)out[name]=instant273(w[name]).toString();out.recordedCostVersion=positive004(w.recordedCostVersion);out.recordedCostRowVersion=positive004(w.recordedCostRowVersion);assert.equal(w.eligibleForPeriod,true);return out;}
export function observedAdoptionUniverse004(rows,projectId,businessCutoff,knowledgeCutoff){
 uuid(projectId);assert(/^\d{4}-\d{2}-\d{2}$/.test(businessCutoff));const knowledge=instant273(knowledgeCutoff),table=new Map();
 const entries=(kind)=>{const meta=factualMap273[kind];assert(meta);if(!table.has(kind)){const found=rows(meta.table).map(row=>{const value=JSON.parse(row.raw),lexical=typedJSON273(row.raw);for(const field of meta.decimals)if(typeof value[field]==='number'){assert(lexical[field]&&Object.hasOwn(lexical[field],numberToken273));value[field]=lexical[field][numberToken273];}return{row,value};}),ids=found.map(p=>p.value[meta.id]);assert.equal(new Set(ids).size,ids.length,'Actual primary identities cannot be duplicated');table.set(kind,found);}return table.get(kind);};
 const at=(p,column)=>instant273(p.value[column]),known=(p,column='created_at')=>{const value=at(p,column);assert(value<=knowledge,'Selection cannot use an unknown future record');return value;};
 const inPeriod=p=>instant273(p)<=knowledge&&hkDay004(p)<=businessCutoff;
 const get=(kind,id)=>{const found=entries(kind).filter(p=>p.value[factualMap273[kind].id]===id);assert.equal(found.length,1,'Actual adoption FK missing/ambiguous '+kind);return found[0];};
 const ref=(kind,p)=>factualRef273(kind,p.row),contracts=entries('Contract').filter(p=>p.value.project_id===projectId),contractIds=new Set(contracts.map(p=>p.value.id)),terms=entries('ContractTermSnapshot').filter(p=>contractIds.has(p.value.contract_id)),witnesses=[],excluded=[];
 const exclude=(term,related,reason,observed)=>excluded.push({termRef:ref('ContractTermSnapshot',term),relatedSourceRefs:related,reasonCode:reason,observedBusinessAt:observed});
 for(const term of terms){const t=term.value;if(t.snapshot_status==='draft')continue;assert(['active','superseded'].includes(t.snapshot_status));known(term);at(term,'effective_at');
   if(!inPeriod(t.effective_at)){exclude(term,[],'term-effective-after-period',t.effective_at);continue;}
   const prep=get('ContractTermPreparation',t.source_preparation_id),p=prep.value;
   assert(['activated','superseded'].includes(p.status));assert.equal(p.project_id,projectId);assert.equal(p.contract_id,t.contract_id);assert.equal(p.activated_snapshot_id,t.id);assert.equal(p.payload_hash,t.payload_hash);known(prep);at(prep,'activated_at');
   if(!inPeriod(p.activated_at)){exclude(term,[ref('ContractTermPreparation',prep)],'preparation-activated-after-period',p.activated_at);continue;}
   const cost=get('ProjectTechnicalCostPackage',p.source_cost_package_id),c=cost.value,captured=p.source_facts?.cost;
   assert(captured);assert.equal(c.project_id,projectId);assert.equal(captured.id,c.id);assert.equal(captured.version,c.version);positive004(captured.version);positive004(captured.rowVersion);assert(positive004(c.row_version)>=captured.rowVersion);assert(['effective','superseded'].includes(c.status));known(cost);at(cost,'effective_at');
   if(!inPeriod(c.effective_at)){exclude(term,[ref('ContractTermPreparation',prep),ref('ProjectTechnicalCostPackage',cost)],'budget-effective-after-period',c.effective_at);continue;}
   const contract=get('Contract',t.contract_id),contractValue=contract.value;assert.equal(contractValue.project_id,projectId);assert.equal(contractValue.status,'active');known(contract);
   if(contractValue.signed_at!==null){at(contract,'signed_at');if(!inPeriod(contractValue.signed_at)){exclude(term,[ref('Contract',contract)],'contract-signed-after-period',contractValue.signed_at);continue;}}
   const bindings=entries('ContractReviewBinding').filter(({value:b})=>b.preparation_id===p.id&&b.preparation_version===p.version&&b.contract_id===t.contract_id&&b.payload_hash===p.payload_hash&&b.contract_amendment_id===t.source_amendment_id);
   assert(bindings.length>0,'An actual adopted preparation needs its full approved review relation');
   for(const binding of bindings){const b=binding.value;known(binding);const approval=get('ApprovalRecord',b.approval_record_id),a=approval.value;assert.equal(a.approval_type,'contract-review');assert.equal(a.target_object_id,t.contract_id);assert.equal(a.current_status,'approved');known(approval);const decided=at(approval,'decided_at'),activated=at(prep,'activated_at');assert(decided<=activated&&at(prep,'created_at')<=activated&&at(binding,'created_at')<=activated&&at(approval,'created_at')<=decided,'Approved/activation handling chronology must be actual');if(!inPeriod(a.decided_at))continue;
     const times=[c.effective_at,t.effective_at,p.activated_at,a.decided_at,...(contractValue.signed_at===null?[]:[contractValue.signed_at])],adoptedAt=times.reduce((x,y)=>instant273(x)>instant273(y)?x:y);
     witnesses.push({costRef:ref('ProjectTechnicalCostPackage',cost),recordedCostVersion:captured.version,recordedCostRowVersion:captured.rowVersion,contractRef:ref('Contract',contract),termRef:ref('ContractTermSnapshot',term),preparationRef:ref('ContractTermPreparation',prep),reviewBindingRef:ref('ContractReviewBinding',binding),approvalRef:ref('ApprovalRecord',approval),costEffectiveAt:c.effective_at,termEffectiveAt:t.effective_at,preparationActivatedAt:p.activated_at,approvalDecidedAt:a.decided_at,adoptedAt,eligibleForPeriod:true});
   }
 }
 assert(witnesses.length>0&&witnesses.length<=1000);assert(excluded.length<=1000);witnesses.sort((a,b)=>a.costRef.id.localeCompare(b.costRef.id)||(instant273(a.adoptedAt)<instant273(b.adoptedAt)?-1:instant273(a.adoptedAt)>instant273(b.adoptedAt)?1:0)||a.termRef.id.localeCompare(b.termRef.id)||a.approvalRef.id.localeCompare(b.approvalRef.id));excluded.sort((a,b)=>key(a.termRef).localeCompare(key(b.termRef)));
 const adoptedIds=[...new Set(witnesses.map(w=>w.costRef.id))],paths=new Map();
 for(const id of adoptedIds){const chain=[],seen=new Set();let current=id;while(current!==null){assert(!seen.has(current),'Cyclic actual technical ancestry');seen.add(current);assert(seen.size<=1000);const node=get('ProjectTechnicalCostPackage',current),v=node.value;assert.equal(v.project_id,projectId);positive004(v.version);at(node,'created_at');chain.push(current);if(v.supersedes_id!==null){const parent=get('ProjectTechnicalCostPackage',v.supersedes_id);assert.equal(parent.value.project_id,projectId);assert(positive004(parent.value.version)<v.version);assert(at(parent,'created_at')<=at(node,'created_at'));}current=v.supersedes_id;}paths.set(id,chain);}
 // Maximality is ancestry membership, never timestamp/current flag/UUID order.
 const maximal=adoptedIds.filter(id=>!adoptedIds.some(other=>other!==id&&paths.get(other).slice(1).includes(id)));assert.equal(maximal.length,1,'All eligible adopted budgets need one provable unique maximum');const allPath=paths.get(maximal[0]);assert(adoptedIds.every(id=>allPath.includes(id)),'Incomparable real adopted branch cannot be omitted');const chain=allPath.filter(id=>adoptedIds.includes(id)).reverse(),original=get('ProjectTechnicalCostPackage',chain[0]),selected=get('ProjectTechnicalCostPackage',chain.at(-1)),currency=original.value.currency_code;assert(/^[A-Z]{3}$/.test(currency));
 const monies=new Map();for(const id of chain){const c=get('ProjectTechnicalCostPackage',id).value;assert.equal(c.currency_code,currency);const net=netMoney273(c.total_estimated_amount_excluding_tax),tax=netMoney273(c.total_tax_cost_amount),gross=netMoney273(c.total_estimated_amount_including_tax);assert(net>=0n&&tax>=0n&&gross>=0n&&gross<=999999999999999999n&&net+tax===gross);monies.set(id,net);}
 const originalIndex=allPath.indexOf(chain[0]),path=allPath.slice(0,originalIndex+1).reverse(),transitions=chain.slice(1).map((id,i)=>({beforeCostRef:ref('ProjectTechnicalCostPackage',get('ProjectTechnicalCostPackage',chain[i])),afterCostRef:ref('ProjectTechnicalCostPackage',get('ProjectTechnicalCostPackage',id)),deltaNetCents:(monies.get(id)-monies.get(chain[i])).toString()}));
 return{witnesses,excluded,adoptionSourceRefs:uniqueRefs273(witnesses.flatMap(w=>witnessRefs004.map(f=>w[f]))),technicalLineageRefs:uniqueRefs273(allPath.map(id=>ref('ProjectTechnicalCostPackage',get('ProjectTechnicalCostPackage',id)))),adoptedBudgetIds:chain,technicalPathIds:path,originalRef:ref('ProjectTechnicalCostPackage',original),selectedRef:ref('ProjectTechnicalCostPackage',selected),originalNetCents:monies.get(chain[0]).toString(),selectedNetCents:monies.get(chain.at(-1)).toString(),transitionCount:transitions.length,transitions};
}
export function assertObservedSelection004(selection,observed){assert.deepEqual(selection.originalAdoptedCostRef,observed.originalRef,'Original must come from all eligible actual adoptions');assert.deepEqual(selection.selectedAdoptedCostRef,observed.selectedRef,'Latest must be the unique maximum of all actual adoptions');assert.deepEqual(refSet273(selection.adoptionSourceRefs),refSet273(observed.adoptionSourceRefs));assert.deepEqual(refSet273(selection.technicalLineageRefs),refSet273(observed.technicalLineageRefs),'Every real technical ancestor must be proved, including unadopted intermediates');}
export function assertObservedProof004(proof,rows,projectId,knowledgeCutoff,preparedFacts){
 const observed=observedAdoptionUniverse004(rows,projectId,proof.businessCutoff,knowledgeCutoff);assertObservedSelection004({originalAdoptedCostRef:proof.originalCostRef,selectedAdoptedCostRef:proof.selectedCostRef,adoptionSourceRefs:proof.adoptionSourceRefs,technicalLineageRefs:proof.technicalLineageRefs},observed);
 assert(Array.isArray(proof.observedAdoptions));assert.deepEqual(proof.observedAdoptions.map(witnessShape004),observed.witnesses.map(witnessShape004),'All eligible actual adoption combinations must be present exactly once');
 assert(Array.isArray(proof.excludedAdoptionCandidates));const shape=x=>{assert.deepEqual(Object.keys(x).sort(),['termRef','relatedSourceRefs','reasonCode','observedBusinessAt'].sort());return{termRef:key(sourceRef273(x.termRef)),relatedSourceRefs:x.relatedSourceRefs.map(r=>key(sourceRef273(r))),reasonCode:x.reasonCode,observedBusinessAt:instant273(x.observedBusinessAt).toString()};};assert.deepEqual(proof.excludedAdoptionCandidates.map(shape),observed.excluded.map(shape),'Future exclusions must exhaust actual candidates and preserve actual reasons/refs/times');
 assert.equal(preparedFacts.transitionCount,observed.transitionCount);assert.deepEqual(preparedFacts.adoptedBudgetIds,observed.adoptedBudgetIds);assert.deepEqual(preparedFacts.technicalPathIds,observed.technicalPathIds);assert.deepEqual(preparedFacts.transitions,observed.transitions);assert.equal(preparedFacts.originalNetCents,observed.originalNetCents);assert.equal(preparedFacts.selectedNetCents,observed.selectedNetCents);return observed;
}


// Normal271 observer: public preparation is checked against the complete real
// before batch; after relations come from real F replacements. No member set
// declared by the server context is used to enumerate the expected sources.
export function verifyActualAllocationClosure004(ctx,before,after,context,expected,readRows,replacements=new Map()){
 const raw=(snap,t)=>readRows(snap.databases[ctx.database].tables[t]),old=t=>raw(before,t),now=t=>raw(after,t);
 const pairs=(rows,t)=>rows(t).map(row=>({row,value:JSON.parse(row.raw)})),one=(rows,t,predicate)=>{const found=pairs(rows,t).filter(p=>predicate(p.value));assert.equal(found.length,1,'One actual normal source relation '+t);return found[0];};
 const ref=(kind,p)=>factualRef273(kind,p.row),asSource=r=>sourceRef273({kind:r.kind,id:r.id,rowVersion:r.rowVersion??r.expectedVersion,payloadHash:r.payloadHash}),sameRefs=(a,b,label)=>assert.deepEqual(refSet273(a.map(asSource)),refSet273(b.map(asSource)),label),required=[];
 const evidence=(id,target,rows)=>{const p=one(rows,'cost_governance_evidence',e=>e.id===id);assert.equal(p.value.target_id,target);assert.equal(p.value.schema_version,1);assert.equal(p.value.payload_hash,canonicalHash273(typedJSON273(p.row.raw).frozen_payload));return p;};
 const basis=(rows,id)=>one(rows,'shared_cost_allocation_basis',b=>b.id===id),snapshots=(rows,id)=>{const found=pairs(rows,'shared_cost_allocation_source_snapshot').filter(p=>p.value.basis_id===id);assert(found.length>0,'Complete actual allocation source set is mandatory');assert.equal(new Set(found.map(p=>p.value.cost_record_id)).size,found.length);return found.sort((a,b)=>a.value.cost_record_id.localeCompare(b.value.cost_record_id));};
 const peers=(rows,id)=>{const found=pairs(rows,'shared_cost_allocation_result').filter(p=>p.value.basis_id===id);assert(found.length>0);assert.equal(new Set(found.map(p=>p.value.project_id)).size,found.length);for(const p of found){assert.equal(p.value.status,'active');assert.equal(p.value.governance_schema_version,1);}const b=basis(rows,id),e=evidence(b.value.governance_evidence_id,id,rows);assert.equal(e.value.target_type,'SharedCostAllocationBasis');const declared=e.value.frozen_payload.projectShares;assert(Array.isArray(declared)&&declared.length>0);assert.equal(new Set(declared.map(p=>p.projectId)).size,declared.length);assert.deepEqual(found.map(p=>p.value.project_id).sort(),declared.map(p=>p.projectId).sort(),'Physical peers must exhaust the immutable F producer evidence');return found;};
 const sourceKinds={'labor':'InternalCostRateVersion','payment-record':'PaymentRecord','payable-record':'PayableRecord','expense-record':'ExpenseRecord','invoice-record':'InvoiceRecord'};
 let shares=0,sourceCount=0,peerCount=0;
 for(const unit of expected.units.filter(u=>u.kind==='SharedCostAllocationResult')){
   const prior=one(old,'shared_cost_allocation_result',r=>r.id===unit.id);assert.equal(prior.value.project_id,context.projectId);assert.deepEqual(asSource(unit.ref),ref('SharedCostAllocationResult',prior));
   const oldBasis=basis(old,prior.value.basis_id),oldSlots=snapshots(old,oldBasis.value.id),oldPeers=peers(old,oldBasis.value.id);assert(unit.sourceMembers.every(r=>r.kind==='SharedCostAllocationSourceSnapshot'),'Frozen public sourceMembers contract is the complete actual snapshot set, not arbitrary cost/peer refs');sameRefs(unit.sourceMembers,oldSlots.map(p=>ref('SharedCostAllocationSourceSnapshot',p)),'Prepared sources must exhaust the actual before batch');
   const successors=[...replacements].filter(([,oldId])=>oldId===unit.id);assert(successors.length<=1);const id=successors[0]?.[0]??unit.id,current=one(now,'shared_cost_allocation_result',r=>r.id===id),currentBasis=basis(now,current.value.basis_id),slots=snapshots(now,currentBasis.value.id),currentPeers=peers(now,currentBasis.value.id);assert.equal(current.value.project_id,context.projectId);assert.equal(currentBasis.value.status,'active');assert.equal(currentBasis.value.governance_schema_version,1);
   assert.deepEqual(slots.map(p=>p.value.cost_record_id),oldSlots.map(p=>p.value.cost_record_id),'Whole source cost set is preserved by explicit reweighting');assert.deepEqual(currentPeers.map(p=>p.value.project_id).sort(),oldPeers.map(p=>p.value.project_id).sort(),'All actual peer projects must survive the same whole-batch command');
   if(id!==unit.id){assert.equal(current.value.supersedes_id,unit.id);assert.equal(currentBasis.value.supersedes_id,oldBasis.value.id);for(const peer of currentPeers){assert.equal(peer.value.replacement_operation_id,currentBasis.value.replacement_operation_id);const original=oldPeers.filter(p=>p.value.project_id===peer.value.project_id);assert.equal(original.length,1);assert.equal(peer.value.supersedes_id,original[0].value.id);}}
   const matches=context.costs.filter(c=>c.allocationResultRef?.id===id);assert.equal(matches.length,1,'Every actual prepared share needs one current context unit');const cost=matches[0],resultRef=ref('SharedCostAllocationResult',current),basisRef=ref('SharedCostAllocationBasis',currentBasis);assert.deepEqual(cost.allocationResultRef,resultRef);assert.deepEqual(cost.sourceRef,resultRef);
   const allocation=context.allocations.filter(a=>a.resultRef.id===id);assert.equal(allocation.length,1,'The actual allocation fact cannot be omitted');const a=allocation[0];assert.deepEqual(a.resultRef,resultRef);assert.deepEqual(a.basisRef,basisRef);assert.equal(a.projectId,context.projectId);const slotRefs=slots.map(p=>ref('SharedCostAllocationSourceSnapshot',p));sameRefs(a.sourceSnapshotRefs,slotRefs,'Allocation snapshot refs are complete actual new batch');
   const be=evidence(currentBasis.value.governance_evidence_id,currentBasis.value.id,now),re=evidence(current.value.governance_evidence_id,current.value.id,now);assert.equal(be.value.target_type,'SharedCostAllocationBasis');assert.equal(re.value.target_type,'SharedCostAllocationResult');assert.equal(re.value.project_id,context.projectId);const gov=[ref('CostGovernanceEvidence',be),ref('CostGovernanceEvidence',re)];sameRefs(cost.governanceEvidenceRefs,uniqueRefs273(gov),'Both genuine F evidence records are required');required.push(resultRef,basisRef,...slotRefs,...gov);
   assert(Array.isArray(cost.allocationSourceMembers));assert.equal(cost.allocationSourceMembers.length,slots.length,'No actual shared source can disappear from allocationSourceMembers');const costRefs=[];
   for(const slot of slots){const s=slot.value,physical=one(now,'project_actual_cost_record',c=>c.id===s.cost_record_id),c=physical.value,costRef=ref('ProjectActualCostRecord',physical);assert.equal(s.is_current,true);assert.equal(s.cost_row_version,c.row_version);assert.equal(s.currency,c.currency);assert.equal(s.source_id,c.source_id);assert.equal(s.source_type,c.source_type);assert.equal(s.source_payload_hash,canonicalHash273(typedJSON273(slot.row.raw).source_payload));costRefs.push(costRef);
     const member=cost.allocationSourceMembers.filter(m=>m.costRef?.id===c.id);assert.equal(member.length,1);const m=member[0];assert.deepEqual(Object.keys(m).sort(),['costRef','sourceRef','stageAttributionRef','attributedStage','governanceEvidenceRefs','containsLabor','costType','businessDate'].sort());assert.deepEqual(m.costRef,costRef);
     const kind=sourceKinds[c.source_type];assert(kind,'Actual E producer kind must be registered');const meta=factualMap273[kind],upstream=one(now,meta.table,v=>v[meta.id]===c.source_id),upstreamRef=ref(kind,upstream);assert.deepEqual(m.sourceRef,upstreamRef);assert.equal(m.costType,c.cost_type);assert.equal(m.containsLabor,c.cost_type==='labor'?'yes':['payment-fact','procurement','invoice','expense'].includes(c.cost_type)?'no':'unknown');const business=/^\d{4}-\d{2}-\d{2}$/.test(c.occurred_on)?c.occurred_on:hkDay004(c.occurred_on);assert.equal(m.businessDate,business);assert(business<=expected.businessCutoff);
     const stages=pairs(now,'cost_stage_attribution_snapshot').filter(p=>p.value.cost_record_id===c.id&&p.value.status==='active');assert(stages.length<=1);let stageRef=null,stageGov=[];if(stages.length){stageRef=ref('CostStageAttributionSnapshot',stages[0]);assert.equal(m.attributedStage,stages[0].value.attributed_stage);const e=evidence(stages[0].value.governance_evidence_id,stages[0].value.id,now);stageGov=[ref('CostGovernanceEvidence',e)];}else assert.equal(m.attributedStage,null);assert.deepEqual(m.stageAttributionRef,stageRef);sameRefs(m.governanceEvidenceRefs,stageGov);required.push(costRef,upstreamRef,...(stageRef?[stageRef]:[]),...stageGov);sourceCount++;
   }
   sameRefs(a.sourceCostRefs,costRefs,'Every actual source cost ref must be present');
   const decision=one(now,'project_cost_inclusion_decision',d=>d.id===cost.classification.decisionId);assert.equal(decision.value.project_id,context.projectId);assert.equal(decision.value.allocation_result_id,id);assert.equal(decision.value.cost_record_id,null);assert.equal(decision.value.unit_key,'allocation:'+id);assert.equal(decision.value.source_row_version,current.value.row_version);required.push(ref('ProjectCostInclusionDecision',decision));shares++;peerCount+=currentPeers.length;
 }
 const actual=refSet273(context.scope.closureEvidenceRefs),needed=uniqueRefs273(required);for(const r of needed)assert(actual.includes(key(r)),'Actual physical allocation evidence missing from normal closure: '+r.kind+':'+r.id);
 return{allocationUnits:shares,actualSourceCosts:sourceCount,actualPeerRowsChecked:peerCount,independentlyRequiredRefs:needed.length,completePreparedBeforeAndPhysicalAfterVerified:true,peerAmountsPublishedAsLocal:false};
}
