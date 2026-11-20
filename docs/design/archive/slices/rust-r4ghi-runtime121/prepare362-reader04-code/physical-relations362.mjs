// Existing complete pure relations only; no business module imports or runtime contexts.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha = value => createHash('sha256').update(value).digest('hex');
const keyOf = (database, table, key) => JSON.stringify([database, table, key]);
const uuid = value => { assert(typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value), 'Actual UUID required'); return value; };
const text = value => { assert(typeof value === 'string' && value.trim()); return value; };
const rv = value => { assert(Number.isInteger(value) && value > 0 && value <= 2147483647); return value; };
function exactExpectedRef(reference) {
  assert(reference && typeof reference === 'object'); uuid(reference.id); text(reference.kind);
  assert(/^[a-f0-9]{64}$/.test(reference.payloadHash));
  if (reference.expectedVersion !== undefined && reference.rowVersion !== undefined) assert.equal(reference.expectedVersion, reference.rowVersion);
  return { kind: reference.kind, id: reference.id, expectedVersion: rv(reference.expectedVersion ?? reference.rowVersion), payloadHash: reference.payloadHash };
}
const ordered = values => values.map(value => ({ projectId: value.projectId, expectedVersion: value.expectedVersion,
  restatesSnapshotRef: exactExpectedRef(value.restatesSnapshotRef), periodEndSnapshotRef: value.periodEndSnapshotRef ? exactExpectedRef(value.periodEndSnapshotRef) : null }))
  .sort((a, b) => a.projectId.localeCompare(b.projectId) || a.restatesSnapshotRef.id.localeCompare(b.restatesSnapshotRef.id));
function assertSameCompleteTargets(primary, each) {
  assert(primary.length > 0); assert.equal(new Set(primary.map(t => t.projectId + ':' + t.restatesSnapshotRef.id)).size, primary.length);
  for (const value of each) assert.deepEqual(ordered(primary), ordered(value), 'A target-specific preparation discovered another terminal: stop, never truncate');
}

const factual273=(()=>{
function sourceRef273(r){assert(r&&typeof r.kind==='string'&&r.kind);uuid(r.id);assert(Number.isSafeInteger(r.rowVersion)&&r.rowVersion>0);assert(/^[a-f0-9]{64}$/.test(r.payloadHash));return r;}

const factualMap273=Object.freeze({
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
  }
});
const numberToken273=Symbol('raw-json-number');
function typedJSON273(raw){return JSON.parse(raw,(k,v,c)=>typeof v==='number'?{[numberToken273]:c.source}:v);}
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
const canonicalHash273=v=>sha(canonicalText273(v));
function factualPayload273(kind,row){const metadata=factualMap273[kind];assert(metadata,'Unknown factual kind');const raw=typedJSON273(row.raw),out={};for(const field of metadata.fields)if(Object.hasOwn(raw,field)){const value=raw[field];if(metadata.decimals.includes(field)&&value!==null){assert(typeof value==='string'||value&&Object.hasOwn(value,numberToken273));out[field]=typeof value==='string'?value:value[numberToken273];}else out[field]=value;}return out;}
function factualRef273(kind,row){const meta=factualMap273[kind],value=JSON.parse(row.raw);assert(meta);const ref={kind,id:value[meta.id],rowVersion:meta.version===null?1:value[meta.version],payloadHash:canonicalHash273(factualPayload273(kind,row))};return sourceRef273(ref);}

return {typedJSON273,canonicalHash273,factualRef273};})();
const {typedJSON273,canonicalHash273,factualRef273}=factual273;
const shared58=(()=>{
const SHARED58_OPERATION='ProjectCostController_createOperatingRestatement';
function actualTwoOneWeight58(row){
 assert(row&&typeof row.raw==='string','Pinned original result row required');
 const value=JSON.parse(row.raw,(key,n,context)=>key==='allocation_weight'&&typeof n==='number'?{originalNumericLexeme:context?.source}:n);
 const lexeme=value.allocation_weight?.originalNumericLexeme;assert.equal(typeof lexeme,'string','PG NUMERIC must use its original JSON numeric lexeme, not a parsed number/string conversion');const exact=/^(1|2)(?:\.0+)?$/.exec(lexeme);assert(exact,'This closed actual fixture requires exact weights2/1, without rounding');return exact[1];
}
const F='apps/poms-api-rust/src/project_cost_governance/service.rs';
const G=name=>`apps/poms-api-rust/src/project_operating/${name}.rs`;
const H=name=>`apps/poms-api-rust/src/project_operating_signals/${name}.rs`;
const p=x=>Array.isArray(x)?x:[x],eq=(field,value)=>({eq:{path:p(field),value}}),all=(...and)=>({and});
const relation=(outer,table,inner,condition)=>({relation:{outer:p(outer),table,inner:p(inner),condition}});
const runtime=(field,name)=>({runtime:{path:p(field),name}}),exists=(table,condition)=>({exists:{table,condition}});
const andEq=values=>all(...Object.entries(values).map(([k,v])=>eq(k,v)));

function sharedWriteInventory58(operationId,scope){
 assert.equal(operationId,SHARED58_OPERATION);const f=scope.sharedFacts;assert.equal(f?.version,58);assert(['stage','tax'].includes(f.branch));const entries=[];const add=(key,table,event,match,source,options={})=>entries.push({key,table,event,match,source,expectedRows:1,...options});
 const newBasis=eq('supersedes_id',f.basisId),newStage=f.branch==='stage'?eq('supersedes_id',f.stageId):null,newTax=f.branch==='tax'?eq('supersedes_id',f.taxId):null;
 if(f.branch==='stage'){add('F-stage-evidence','cost_governance_evidence','INSERT',all(eq('target_type','CostStageAttributionSnapshot'),eq(['frozen_payload','predecessorAttributionId'],f.stageId)),F);add('F-old-stage','cost_stage_attribution_snapshot','UPDATE',andEq({id:f.stageId,status:'superseded'}),F);add('F-new-stage','cost_stage_attribution_snapshot','INSERT',newStage,F);add('F-stage-cost-cas','project_actual_cost_record','UPDATE',andEq({id:f.sourceCostId,row_version:f.sourceCostVersion+1}),F);}
 else {add('F-tax-evidence','cost_governance_evidence','INSERT',all(eq('target_type','AccountingTaxTreatmentSnapshot'),eq(['frozen_payload','predecessorTaxTreatmentId'],f.taxId)),F);add('F-old-tax','accounting_tax_treatment_snapshot','UPDATE',andEq({id:f.taxId,status:'superseded'}),F);add('F-new-tax','accounting_tax_treatment_snapshot','INSERT',newTax,F);}
 add('F-basis-evidence','cost_governance_evidence','INSERT',all(eq('target_type','SharedCostAllocationBasis'),eq(['frozen_payload','predecessorBasisId'],f.basisId)),F);add('F-old-basis','shared_cost_allocation_basis','UPDATE',andEq({id:f.basisId,status:'superseded'}),F);add('F-old-source-snapshot','shared_cost_allocation_source_snapshot','UPDATE',andEq({basis_id:f.basisId,is_current:false}),F,{expectedRows:f.sourceCount});add('F-new-basis','shared_cost_allocation_basis','INSERT',newBasis,F);add('F-new-source-snapshot','shared_cost_allocation_source_snapshot','INSERT',relation('basis_id','shared_cost_allocation_basis','id',newBasis),F,{expectedRows:f.sourceCount});
 for(const result of f.results){add('F-old-result:'+result.id,'shared_cost_allocation_result','UPDATE',andEq({id:result.id,status:'superseded'}),F);add('F-result-evidence:'+result.id,'cost_governance_evidence','INSERT',all(eq('target_type','SharedCostAllocationResult'),eq(['frozen_payload','predecessorResultId'],result.id)),F);add('F-new-result:'+result.id,'shared_cost_allocation_result','INSERT',andEq({project_id:result.projectId,supersedes_id:result.id}),F);add('G-share-consumption:'+result.id,'shared_cost_allocation_result','UPDATE',andEq({project_id:result.projectId,supersedes_id:result.id,is_included_in_project_cost:true,row_version:2}),G('inclusion'),{insertedThenUpdated:true});}
 const audit=(key,targetType,condition,projectId)=>add(key,'audit_log','INSERT',all(andEq({event_type:operationId,operator_id:f.actorId,result:'success',target_type:targetType}),runtime('request_id','requestId'),eq(['metadata','projectId'],projectId),condition),'apps/poms-api-rust/src/contract_support/mod.rs');
 if(f.branch==='stage')audit('F-stage-audit','CostStageAttributionSnapshot',relation('target_id','cost_stage_attribution_snapshot','id',newStage),f.sourceProjectId);else audit('F-tax-audit','AccountingTaxTreatmentSnapshot',relation('target_id','accounting_tax_treatment_snapshot','id',newTax),f.sourceProjectId);for(const project of f.projects)audit('F-basis-audit:'+project.projectId,'SharedCostAllocationBasis',relation('target_id','shared_cost_allocation_basis','id',newBasis),project.projectId);
 const inherited=[...(f.branch==='stage'?[{projectId:f.sourceProjectId,oldDecisionId:f.sourceDecisionId,headEvent:'UPDATE'}]:[]),...f.results.map(x=>({...x,headEvent:'INSERT'}))];for(const item of inherited){const decision=andEq({project_id:item.projectId,supersedes_id:item.oldDecisionId});add('G-transition-decision:'+item.oldDecisionId,'project_cost_inclusion_decision','INSERT',decision,G('inclusion'));add('G-transition-head:'+item.oldDecisionId,'project_cost_inclusion_head',item.headEvent,relation('decision_id','project_cost_inclusion_decision','id',decision),G('inclusion'));}
  for(const target of f.targets){
    const key=target.restatesSnapshotRef.id,pid=target.projectId;
    const snapshot=andEq({project_id:pid,supersedes_id:key,snapshot_mode:'restated'});
    const context=andEq({project_id:pid}); const targetContext=all(context,eq(['frozen_payload','snapshot','restatesSnapshotRef','id'],key));
    const throughSnapshot=field=>relation(field,'project_operating_snapshot','id',snapshot);
    const throughContext=field=>relation(field,'operating_source_context','id',targetContext);
    const evidence=all(eq('project_id',pid),throughSnapshot('snapshot_id'));
    const throughEvidence=field=>relation(field,'operating_evaluation_evidence','id',evidence);
    const binding=all(eq('project_id',pid),relation('signal_evaluation_id','operating_signal_evaluation_result','id',all(eq('project_id',pid),throughSnapshot('referenced_snapshot_id'))));
    const summary=all(andEq({approval_scenario_key:'commission-gate-review',summary_package_key:'project-operating-commission-gate-v1',target_type:'operating-signal-gate-binding',created_by:f.actorId}),relation('target_id','operating_signal_gate_binding','id',binding));
    add('G-terminal-cas:'+key,'project_operating_snapshot','UPDATE',andEq({id:key,status:'superseded'}),G('restatement'));
    add('G-context:'+key,'operating_source_context','INSERT',targetContext,G('capture'));
    add('G-snapshot:'+key,'project_operating_snapshot','INSERT',snapshot,G('capture'));
    add('G-source-members:'+key,'operating_source_member','INSERT',throughContext('context_id'),G('capture'),{selector:all(throughContext('context_id'),eq('source_kind','OperatingBaselinePackage')),expectedRows:{kind:'context-members',target:key}});
    add('G-cost-members:'+key,'operating_snapshot_cost_member','INSERT',all(eq('project_id',pid),throughSnapshot('snapshot_id')),G('capture'),{expectedRows:{kind:'context-costs',target:key}});
    add('G-head-cas:'+key,'project_operating_head','UPDATE',andEq({project_id:pid,row_version:target.finalHeadVersion}),G('store'),{selector:andEq({project_id:pid,row_version:target.newHeadVersion})});
    add('H-evidence:'+key,'operating_evaluation_evidence','INSERT',all(evidence,eq('evaluated_by',f.actorId)),H('service'));
    add('H-reasons:'+key,'operating_evaluation_reason','INSERT',throughEvidence('evidence_id'),H('service'),{selector:all(throughEvidence('evidence_id'),eq('reason_index',0)),expectedRows:{kind:'evaluation-reasons',target:key}});
    add('H-maturity:'+key,'data_maturity_evaluation_result','INSERT',all(eq('project_id',pid),throughSnapshot('referenced_snapshot_id')),H('service'));
    add('H-signal:'+key,'operating_signal_evaluation_result','INSERT',all(eq('project_id',pid),throughSnapshot('referenced_snapshot_id')),H('service'));
    add('H-bindings:'+key,'operating_signal_gate_binding','INSERT',binding,H('service'),{selector:all(binding,eq('gate_stage_type','retention')),expectedRows:4});
    add('H-summaries:'+key,'approval_summary_snapshot','INSERT',summary,H('summary'),{deferred:true,selector:all(summary,relation('target_id','operating_signal_gate_binding','id',eq('gate_stage_type','retention'))),expectedRows:4});
    add('H-summary-fields:'+key,'approval_summary_field_projection','INSERT',relation('summary_snapshot_id','approval_summary_snapshot','id',summary),H('summary'),{deferred:true,selector:all(eq('field_order',3),relation('summary_snapshot_id','approval_summary_snapshot','id',all(summary,relation('target_id','operating_signal_gate_binding','id',eq('gate_stage_type','retention'))))),expectedRows:16});
    add('H-summary-payloads:'+key,'operating_gate_summary_payload','INSERT',all(eq('project_id',pid),throughSnapshot('snapshot_id')),H('summary'),{selector:all(eq('project_id',pid),throughSnapshot('snapshot_id'),eq('gate_stage_type','retention')),expectedRows:4});
    const record=andEq({project_id:pid,restates_snapshot_id:key});
    add('G-restatement:'+key,'operating_restatement_record','INSERT',record,G('service'));
    audit(target===f.targets[0]?'required-success-audit':'G-root-audit:'+key,'OperatingRestatementRecord',relation('target_id','operating_restatement_record','id',record),pid);
    add('H-policy-audit:'+key,'audit_log','INSERT',all(andEq({event_type:'OperatingPolicy_evaluate',operator_id:f.actorId,result:'success'}),runtime('request_id','requestId'),eq(['metadata','projectId'],pid),relation('target_id','operating_signal_evaluation_result','id',all(eq('project_id',pid),throughSnapshot('referenced_snapshot_id')))),H('service'));
  }
  for(const project of f.projects){
    for(const id of project.oldBindingIds)add('H-old-binding:'+id,'operating_signal_gate_binding','UPDATE',andEq({id,status:'superseded'}),H('service'));
    for(const id of project.oldGateReviewIds)add('H-old-gate-review:'+id,'commission_gate_review_record','UPDATE',andEq({id,status:'superseded'}),H('service'));
  }
  const receipt=andEq({operation_id:operationId,actor_id:f.actorId,target_scope:f.primaryProjectId});
  add('SHARED-GH-command-receipt','operating_command_receipt','INSERT',receipt,G('service'));
  add('pending-auth-coflush','auth_session','UPDATE',all(runtime('id','sessionId'),eq('user_id',f.actorId),exists('audit_log',all(runtime('request_id','requestId'),andEq({event_type:operationId,operator_id:f.actorId,result:'success'})))), 'apps/poms-api-rust/src/auth/store.rs');
  assert.equal(new Set(entries.map(x=>x.key)).size,entries.length);return entries;
}

return {actualTwoOneWeight58,sharedWriteInventory58,SHARED58_OPERATION};})();
const {actualTwoOneWeight58,sharedWriteInventory58,SHARED58_OPERATION}=shared58;
const tax13=(()=>{
const TAX13_OPERATION=SHARED58_OPERATION;
function centsTax13(value){assert(typeof value==='string'&&/^-?(?:0|[1-9]\d*)\.\d{2}$/.test(value),'Exact original2dp monetary text required');return (value.startsWith('-')?-1n:1n)*BigInt(value.replace(/^-/,'').replace('.',''));}
function moneyTax13(value){const n=value<0n?-value:value;return `${value<0n?'-':''}${n/100n}.${String(n%100n).padStart(2,'0')}`;}
function exactValueTax13(row){return JSON.parse(row.raw,(key,value,context)=>typeof value==='number'&&/amount|total|ratio|rate|weight|margin|baseline_cost|^cash_gross$/.test(key)?context.source:value);}

const one=(values,predicate,message)=>{const matches=values.filter(predicate);assert.equal(matches.length,1,message);return matches[0];};
const sourceKey=reference=>reference.kind+':'+reference.id;
const amountFact=value=>{assert(value&&['known','unknown'].includes(value.knowledge));if(value.knowledge==='known')centsTax13(value.value);else assert.equal(value.value,null);return {knowledge:value.knowledge,value:value.value};};
function sumFactsTax13(facts){let sum=0n,known=true;for(const fact of facts){if(fact.knowledge!=='known')known=false;else sum+=centsTax13(fact.value);}return known?{knowledge:'known',value:moneyTax13(sum)}:{knowledge:'unknown',value:null};}
function physicalDecisionTax13(rows,projectId,row){
 const unit=(row.rowKind==='direct-cost'?'cost:':'allocation:')+row.sourceRef.id;
 const head=one(rows.values('project_cost_inclusion_head'),h=>h.project_id===projectId&&h.unit_key===unit,'Current project classification head missing');
 const decision=one(rows.values('project_cost_inclusion_decision'),d=>d.id===head.decision_id,'Current physical classification missing');assert.equal(decision.project_id,projectId);assert.equal(decision.id,row.currentDecisionRef?.id);assert.equal(decision.row_version,row.currentDecisionRef?.rowVersion);assert.equal(decision.source_row_version,row.sourceRef.rowVersion);return {id:decision.id,decision:decision.decision,role:decision.recognition_role,reasonCode:decision.reason_code};
}
function expectedCostScopeTax13(preparation,rows,explicit=[]){
 assert(preparation&&Array.isArray(preparation.sourceRows));const commands=new Map(explicit.map(c=>[sourceKey(c.target),c]));assert.equal(commands.size,explicit.length);const units=[];
 for(const row of preparation.sourceRows){
  if(!['direct-cost','allocation-share','supporting-source'].includes(row.rowKind))continue;
  if(row.blockingReasonCodes.includes('outside-business-cutoff'))continue;
  assert.notEqual(row.rowKind,'supporting-source','A real unexpected unmapped economic source requires its own reviewed producer');
  const projection=row.financialProjection;assert.equal(projection.mode,'full','The current M must hold both required sensitive read permissions');assert.equal(projection.value.currency,'CNY');
  const command=commands.get(sourceKey(row.sourceRef));let decision;
  if(command){assert(!row.currentDecisionRef);assert.equal(command.expectedVersion,0);assert.deepEqual(exactExpectedRef(command.target),exactExpectedRef(row.sourceRef));decision={id:null,decision:command.decision,role:command.recognitionRole,reasonCode:command.reasonCode};commands.delete(sourceKey(row.sourceRef));}
  else {assert(row.currentDecisionRef,'Never guess a missing cost classification');decision=physicalDecisionTax13(rows,preparation.projectId,row);}
  assert(['include','exclude'].includes(decision.decision));
  units.push({key:sourceKey(row.sourceRef),kind:row.sourceRef.kind,id:uuid(row.sourceRef.id),ref:exactExpectedRef(row.sourceRef),rowKind:row.rowKind,decision,amounts:{currency:'CNY',...Object.fromEntries(['net','tax','gross'].map(k=>[k,amountFact(projection.value[k])]))},sourceMembers:row.sourceMembers.map(exactExpectedRef),businessDate:row.sourceBusinessDate,blockingReasonCodes:row.blockingReasonCodes});
 }
 assert.equal(commands.size,0,'Every explicit choice must address the actual prepared economic scope');assert.equal(new Set(units.map(u=>u.key)).size,units.length);
 const totals=filter=>({currency:'CNY',...Object.fromEntries(['net','tax','gross'].map(k=>[k,sumFactsTax13(units.filter(filter).map(u=>u.amounts[k]))]))});
 return {projectId:preparation.projectId,businessCutoff:preparation.businessCutoff,units:units.sort((a,b)=>a.key.localeCompare(b.key)),included:totals(u=>u.decision.decision==='include'&&['direct-source','allocation-share'].includes(u.decision.role)),excluded:totals(u=>u.decision.decision==='exclude'),source:'actual-public-preparation-plus-current-physical-classification',oldSnapshotAggregateEqualityAssumed:false};
}

function completeTargetsTax13(primary,packets,projectIds){
 assert.equal(primary.intent,'restatement');const targets=primary.proposedAffectedTargets;assertSameCompleteTargets(targets,packets.map(p=>p.preparation.proposedAffectedTargets));assert.equal(packets.length,targets.length);
 assert.deepEqual([...new Set(targets.map(t=>t.projectId))].sort(),[...projectIds].sort(),'Never trim a real affected project from the server closure');
 for(const target of targets){if(target.periodEndSnapshotRef)exactExpectedRef(target.periodEndSnapshotRef);const found=packets.filter(p=>p.target.projectId===target.projectId&&p.target.restatesSnapshotRef.id===target.restatesSnapshotRef.id);assert.equal(found.length,1);}return targets;
}

function inventoryTax13(facts){return sharedWriteInventory58(TAX13_OPERATION,{sharedFacts:facts});}

return {centsTax13,exactValueTax13,expectedCostScopeTax13,completeTargetsTax13,inventoryTax13,TAX13_OPERATION};})();
const {centsTax13,exactValueTax13,expectedCostScopeTax13,completeTargetsTax13,inventoryTax13,TAX13_OPERATION}=tax13;
const tax15=(()=>{
const TABLES = Object.freeze({
    Contract: "contract",
    ContractTermSnapshot: "contract_term_snapshot",
    ReceiptRecord: "receipt_record",
    ReceiptAccountingBasis: "receipt_accounting_basis",
    ProjectActualCostRecord: "project_actual_cost_record",
    SharedCostAllocationBasis: "shared_cost_allocation_basis",
    SharedCostAllocationResult: "shared_cost_allocation_result",
    CostStageAttributionSnapshot: "cost_stage_attribution_snapshot",
    AccountingTaxTreatmentSnapshot: "accounting_tax_treatment_snapshot",
    OperatingBaselinePackage: "operating_baseline_package",
});
const currentCost = new Set(["registered", "confirmed", "included"]);
const refKey = (r) =>
    JSON.stringify([
        r.kind,
        r.id,
        r.rowVersion ?? r.expectedVersion,
        r.payloadHash,
    ]);
const targetKey = (t) => t.projectId + ":" + t.restatesSnapshotRef.id;
const one = (a, f, label) => {
    const m = a.filter(f);
    assert.equal(m.length, 1, label);
    return m[0];
};
function day(value) {
    assert.equal(typeof value, "string", "Actual business date required");
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        assert.equal(
            new Date(value + "T00:00:00Z").toISOString().slice(0, 10),
            value,
        );
        return value;
    }
    assert(/(?:Z|[+-]\d\d:\d\d)$/.test(value), "Timezone must be explicit");
    const d = new Date(value);
    assert(Number.isFinite(d.getTime()));
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Hong_Kong",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(d);
}

// Complete source membership is selected from physical rows, independently of
// public proposed targets. Ancestors and foreign peers remain internal facts.
function catalogRoots15(rawRows, projectId) {
    const raw = (t) => rawRows(t),
        values = (t) => raw(t).map((r) => JSON.parse(r.raw));
    const bases = values("shared_cost_allocation_basis"),
        results = values("shared_cost_allocation_result"),
        slots = values("shared_cost_allocation_source_snapshot"),
        costs = values("project_actual_cost_record");
    const ownCosts = new Set(
        costs.filter((c) => c.project_id === projectId).map((c) => c.id),
    );
    const directBases = new Set(
        results.filter((r) => r.project_id === projectId).map((r) =>
            r.basis_id
        ),
    );
    const lineage = new Set([
        ...directBases,
        ...slots.filter((s) => ownCosts.has(s.cost_record_id)).map((s) =>
            s.basis_id
        ),
    ]);
    for (let changed = true; changed;) {
        changed = false;
        for (const b of bases) {
            if (
                lineage.has(b.id) && b.supersedes_id &&
                !lineage.has(b.supersedes_id)
            ) {
                lineage.add(b.supersedes_id);
                changed = true;
            }
        }
    }
    const memberCosts = new Set(
        slots.filter((s) => lineage.has(s.basis_id)).map((s) =>
            s.cost_record_id
        ),
    );
    const stageCosts = new Set([
        ...ownCosts,
        ...slots.filter((s) => directBases.has(s.basis_id)).map((s) =>
            s.cost_record_id
        ),
    ]);
    const contracts = new Set(
        values("contract").filter((c) => c.project_id === projectId).map((c) =>
            c.id
        ),
    );
    const out = [];
    for (const [kind, table] of Object.entries(TABLES)) {
        for (const row of raw(table)) {
            const v = JSON.parse(row.raw);
            let included;
            if (kind === "SharedCostAllocationBasis") {
                included = lineage.has(v.id);
            } else if (kind === "SharedCostAllocationResult") {
                included = lineage.has(v.basis_id);
            } else if (kind === "ProjectActualCostRecord") {
                included = ownCosts.has(v.id) || memberCosts.has(v.id);
            } else if (kind === "CostStageAttributionSnapshot") {
                included = stageCosts.has(v.cost_record_id);
            } else if (kind === "ContractTermSnapshot") {
                included = contracts.has(v.contract_id);
            } else included = v.project_id === projectId;
            if (included) {
                out.push({
                    kind,
                    table,
                    row,
                    value: v,
                    ref: factualRef273(kind, row),
                });
            }
        }
    }
    return out.sort((a, b) => refKey(a.ref).localeCompare(refKey(b.ref)));
}
function isCurrent15(item, catalog, projectId) {
    const v = item.value;
    switch (item.kind) {
        case "ProjectActualCostRecord":
            return currentCost.has(v.record_status);
        case "ContractTermSnapshot":
            return v.snapshot_status === "active";
        case "Contract":
            return v.status === "active";
        case "ReceiptRecord":
            return ["pending-confirmation", "confirmed"].includes(v.status);
        case "SharedCostAllocationBasis":
            return ["active", "pending"].includes(v.status);
        case "SharedCostAllocationResult":
            return v.project_id === projectId &&
                ["active", "pending"].includes(v.status);
        case "CostStageAttributionSnapshot":
            return v.status === "active" &&
                catalog.some((c) =>
                    c.kind === "ProjectActualCostRecord" &&
                    c.value.id === v.cost_record_id &&
                    currentCost.has(c.value.record_status)
                );
        case "AccountingTaxTreatmentSnapshot":
            return ["active", "pending"].includes(v.status);
        case "OperatingBaselinePackage":
            return v.is_current === true;
        case "ReceiptAccountingBasis":
            return true;
        default:
            throw Error("Unsupported inferred kind");
    }
}
function inferRoots15(rawRows, projectId, snapshotId, explicitRoots) {
    const values = (t) => rawRows(t).map((r) => JSON.parse(r.raw));
    const snapshot = one(
        values("project_operating_snapshot"),
        (s) => s.id === snapshotId,
        "Physical selected root",
    );
    assert.equal(snapshot.project_id, projectId);
    const previous = values("operating_source_member").filter((m) =>
        m.context_id === snapshot.source_context_id
    ).map((m) => ({
        kind: m.source_kind,
        id: m.source_id,
        rowVersion: m.source_row_version,
        payloadHash: m.source_payload_hash,
    }));
    const prior = new Set(previous.map(refKey)),
        catalog = catalogRoots15(rawRows, projectId);
    const implicit = catalog.filter((i) =>
        !prior.has(refKey(i.ref)) && isCurrent15(i, catalog, projectId)
    ).map((i) => exactExpectedRef(i.ref));
    const merged = new Map();
    for (const r of [...implicit, ...explicitRoots]) {
        assert(TABLES[r.kind], "This Tax command permits only source roots");
        const row = one(
            rawRows(TABLES[r.kind]),
            (x) => JSON.parse(x.raw).id === r.id,
            "Actual selected root row",
        );
        assert.equal(
            refKey(factualRef273(r.kind, row)),
            refKey(r),
            "Selected root CAS changed",
        );
        const k = r.kind + ":" + r.id;
        if (merged.has(k)) {
            assert.equal(
                refKey(merged.get(k)),
                refKey(r),
                "Conflicting versions for one root",
            );
        }
        merged.set(k, r);
    }
    return {
        implicitRoots: implicit,
        explicitRoots: structuredClone(explicitRoots),
        roots: [...merged.values()].sort((a, b) =>
            refKey(a).localeCompare(refKey(b))
        ),
        previousMemberCount: previous.length,
        catalogMemberCount: catalog.length,
    };
}
function impactGraph15(rawRows, roots) {
    const values = (t) => rawRows(t).map((r) => JSON.parse(r.raw)),
        find = (t, id) =>
            one(
                values(t),
                (r) => r.id === id,
                "Actual dependency " + t + ":" + id,
            );
    const costs = values("project_actual_cost_record"),
        ids = new Set(),
        impacts = new Map();
    const add = (id, project, businessDate, producer = true) => {
        const v = {
            id,
            project: project ?? null,
            day: businessDate === null ? null : day(businessDate),
            producer,
        };
        impacts.set(JSON.stringify(v), v);
    };
    const addCost = (c) => {
        ids.add(c.id);
        add(c.id, c.project_id, c.occurred_on);
    };
    for (const root of roots) {
        assert(TABLES[root.kind]);
        const row = one(
            rawRows(TABLES[root.kind]),
            (r) => JSON.parse(r.raw).id === root.id,
            "Actual impact root",
        );
        assert.equal(refKey(factualRef273(root.kind, row)), refKey(root));
        const v = JSON.parse(row.raw);
        ids.add(v.id);
        let project = v.project_id ?? null, date = null;
        switch (root.kind) {
            case "ProjectActualCostRecord":
                date = v.occurred_on;
                break;
            case "ReceiptRecord":
                date = v.receipt_date;
                break;
            case "ContractTermSnapshot":
                project = find("contract", v.contract_id).project_id;
                date = v.effective_at;
                break;
            case "ReceiptAccountingBasis":
                date = find("receipt_record", v.receipt_id).receipt_date;
                break;
            case "CostStageAttributionSnapshot": {
                const c = find("project_actual_cost_record", v.cost_record_id);
                project = c.project_id;
                ids.add(c.id);
                date = v.evidence_business_date;
                break;
            }
            case "AccountingTaxTreatmentSnapshot": {
                const e = find(
                        "cost_governance_evidence",
                        v.governance_evidence_id,
                    ),
                    eraw = one(
                        rawRows("cost_governance_evidence"),
                        (r) => JSON.parse(r.raw).id === e.id,
                        "Actual Tax evidence raw",
                    );
                assert.equal(v.governance_schema_version, 1);
                assert.equal(v.status, "active");
                assert.equal(e.schema_version, 1);
                assert.equal(e.target_type, "AccountingTaxTreatmentSnapshot");
                assert.equal(e.target_id, v.id);
                assert.equal(e.project_id, v.project_id);
                assert(
                    e.frozen_payload && typeof e.frozen_payload === "object",
                );
                assert.equal(
                    e.payload_hash,
                    canonicalHash273(typedJSON273(eraw.raw).frozen_payload),
                );
                assert.deepEqual(
                    e.source_references,
                    e.frozen_payload.assessment.sourceReferences,
                );
                assert(
                    Array.isArray(e.source_references) &&
                        e.source_references.length > 0,
                );
                for (const s of e.source_references) {
                    assert(["source", "manual"].includes(s.kind));
                    if (s.kind === "manual") continue;
                    if (
                        ["project-actual-cost-record", "source-cost-fact"]
                            .includes(s.sourceType)
                    ) addCost(find("project_actual_cost_record", s.sourceId));
                    else if (
                        [
                            "payment-record",
                            "invoice-record",
                            "expense-record",
                            "payable-record",
                        ].includes(s.sourceType)
                    ) {
                        const sourceTable = s.sourceType.replaceAll("-", "_");
                        find(sourceTable, s.sourceId);
                        for (
                            const c of costs.filter((c) =>
                                c.source_type === s.sourceType &&
                                c.source_id === s.sourceId
                            )
                        ) addCost(c);
                    }
                }
                date = e.business_date;
                break;
            }
            case "Contract":
                date = v.signed_at;
                break;
            case "OperatingBaselinePackage":
                date = v.effective_at;
                break;
            case "SharedCostAllocationBasis":
            case "SharedCostAllocationResult":
                break;
            default:
                throw Error("Unsupported impact root");
        }
        add(v.id, project, date);
    }
    const slots = values("shared_cost_allocation_source_snapshot"),
        results = values("shared_cost_allocation_result");
    for (let changed = true; changed;) {
        const prior = ids.size, known = new Set(ids);
        for (const r of results) {
            for (const s of slots.filter((s) => s.basis_id === r.basis_id)) {
                if (
                    known.has(s.cost_record_id) || known.has(s.basis_id) ||
                    known.has(r.id)
                ) {
                    const c = find(
                        "project_actual_cost_record",
                        s.cost_record_id,
                    );
                    ids.add(s.basis_id);
                    ids.add(r.id);
                    add(r.id, r.project_id, c.occurred_on);
                    addCost(c);
                }
            }
        }
        changed = ids.size !== prior;
    }
    return [...impacts.values()].sort((a, b) =>
        JSON.stringify(a).localeCompare(JSON.stringify(b))
    );
}
function terminalUnion15(rawRows, primaryProjectId, graph) {
    const values = (t) => rawRows(t).map((r) => JSON.parse(r.raw)),
        snapshots = values("project_operating_snapshot"),
        contexts = values("operating_source_context"),
        members = values("operating_source_member");
    // Reverse-discovery only ignores non-producer children. Locked terminal state
    // deliberately observes every child, matching the actual public contract.
    const discoverable = snapshots.filter((s) =>
        s.producer_version === 1 && s.status === "active" &&
        !snapshots.some((n) =>
            n.producer_version === 1 && n.supersedes_id === s.id
        )
    );
    const producerIds = new Set(
            graph.filter((i) => i.producer).map((i) => i.id),
        ),
        projectIds = new Set([
            primaryProjectId,
            ...graph.map((i) => i.project).filter(Boolean),
        ]);
    for (const s of discoverable) {
        if (
            members.some((m) =>
                m.context_id === s.source_context_id &&
                producerIds.has(m.source_id)
            )
        ) projectIds.add(s.project_id);
    }
    const targets = [];
    for (
        const s of snapshots.filter((s) =>
            projectIds.has(s.project_id) && s.producer_version === 1 &&
            s.status === "active" && !snapshots.some((n) =>
                n.project_id === s.project_id && n.supersedes_id === s.id
            )
        )
    ) {
        const c = one(
                contexts,
                (c) => c.id === s.source_context_id,
                "Physical terminal context",
            ),
            cutoff = day(c.business_cutoff),
            applicable = new Set(
                graph.filter((i) =>
                    (i.producer || i.project === s.project_id) &&
                    i.day !== null && i.day <= cutoff
                ).map((i) => i.id),
            );
        const consumed = members.some((m) =>
            m.context_id === c.id && applicable.has(m.source_id)
        );
        if (
            !consumed &&
            !graph.some((i) =>
                i.project === s.project_id && i.day !== null && i.day <= cutoff
            )
        ) continue;
        const head = one(
                values("project_operating_head"),
                (h) => h.project_id === s.project_id,
                "Physical affected head",
            ),
            raw = one(
                rawRows("project_operating_snapshot"),
                (r) => JSON.parse(r.raw).id === s.id,
                "Physical terminal raw",
            );
        const period = s.period_end_snapshot_id
            ? one(
                rawRows("period_closing_snapshot"),
                (r) => JSON.parse(r.raw).id === s.period_end_snapshot_id,
                "Actual period root raw",
            )
            : null;
        targets.push({
            projectId: s.project_id,
            expectedVersion: head.row_version,
            restatesSnapshotRef: exactExpectedRef(
                factualRef273("ProjectOperatingSnapshot", raw),
            ),
            periodEndSnapshotRef: period
                ? exactExpectedRef(
                    factualRef273("PeriodClosingSnapshot", period),
                )
                : null,
        });
    }
    return {
        discoveredProjectIds: [...projectIds].sort(),
        targets: targets.sort((a, b) =>
            targetKey(a).localeCompare(targetKey(b))
        ),
    };
}
function deriveRootUnion15(
    rawRows,
    projectId,
    snapshotId,
    explicitRoots,
) {
    const inferred = inferRoots15(
            rawRows,
            projectId,
            snapshotId,
            explicitRoots,
        ),
        graph = impactGraph15(rawRows, inferred.roots),
        terminals = terminalUnion15(rawRows, projectId, graph);
    return {
        ...inferred,
        graph,
        ...terminals,
        oracle: "independent-complete-physical-root-impact-terminal-union15",
        dateOnlyPredicateIsNotTargetOracle: true,
    };
}
function deriveCapturedTax15Facts362(rows,body,legacy,packets,actorId) {
    const explicit = body.taxCorrections.map((c) => c.taxTreatmentRef);
    assert.equal(explicit.length, 1);
    assert.deepEqual(body.costDecisions, []);
    assert.deepEqual(
        body.affectedTargets.map((t) => t.costDecisions ?? []).flat(),
        [],
    );
    const rootUnion = deriveRootUnion15(
        rows.raw,
        body.projectId,
        body.restatesSnapshotRef.id,
        explicit,
    );
    const actual = [{
        projectId: body.projectId,
        expectedVersion: body.expectedVersion,
        restatesSnapshotRef: body.restatesSnapshotRef,
        periodEndSnapshotRef: body.periodEndSnapshotRef,
    }, ...body.affectedTargets];
    assertSameCompleteTargets(rootUnion.targets, [actual]);
    for (const packet of packets) {
        assertSameCompleteTargets(rootUnion.targets, [
            packet.preparation.proposedAffectedTargets,
        ]);
    }
    assert.deepEqual(
        [...new Set(rootUnion.targets.map((t) => t.projectId))].sort(),
        [...legacy.projectIds].sort(),
        "Unexpected physical affected project requires review; never trim",
    );
    // Legacy consumer checks the finite fixture's amount/classification/writes.
    // The independent complete union above is the target oracle. The preserved
    // detail function no longer contains the obsolete cost-date target equality.
    const facts = deriveCapturedTax15FixtureDetails362(rows,body,legacy,packets,actorId);
    return { ...facts, rootUnion };
}
const inventoryTax15 = inventoryTax13;

// Full original fixture detail span, with only the reviewed obsolete oracle removed.
function deriveCapturedTax15FixtureDetails362(rows,body,legacy,packets,actorId){
 const cost=rows.owned('project_actual_cost_record',legacy.costId),tax=rows.owned('accounting_tax_treatment_snapshot',legacy.taxId),basis=rows.owned('shared_cost_allocation_basis',legacy.basisId);assert.equal(body.projectId,legacy.sourceProjectId);assert.equal(cost.project_id,legacy.sourceProjectId);assert.equal(cost.record_status,'confirmed');assert.equal(cost.is_included_in_project_cost,false);assert.equal(cost.currency,'CNY');
 assert.equal(tax.status,'active');assert.equal(tax.deductibility_status,'pending');assert.equal(tax.tax_impact_amount,'0.00');assert.equal(tax.tax_impact_pending_amount,'130.00');assert.equal(tax.tax_pending_flag,true);assert.equal(body.taxCorrections.length,1);assert.deepEqual(body.allocationCorrections,[]);assert.deepEqual(body.stageCorrections,[]);assert.deepEqual(body.laborCorrections,[]);assert.deepEqual(body.costDecisions,[]);assert.deepEqual(body.acknowledgedChangedSourceRefs,[]);assert.equal(body.scope,'live');assert.equal(body.periodEndSnapshotRef,null);
 const correction=body.taxCorrections[0];assert.equal(correction.taxTreatmentRef.id,tax.id);assert.equal(correction.taxTreatmentRef.expectedVersion,tax.row_version);assert.equal(correction.request.expectedVersion,tax.row_version);assert.equal(correction.request.taxImpactAmount,tax.tax_impact_amount);assert.equal(correction.request.taxImpactPendingAmount,tax.tax_impact_pending_amount);assert.equal(correction.request.taxPendingFlag,true);assert.equal(correction.request.currency,cost.currency);assert.deepEqual(correction.expectedSourceRefs.map(r=>[r.kind,r.id,r.expectedVersion]),[['ProjectActualCostRecord',cost.id,cost.row_version]]);
 const evidence=rows.owned('cost_governance_evidence',tax.governance_evidence_id);assert.equal(evidence.target_id,tax.id);assert.equal(evidence.project_id,cost.project_id);assert.equal(evidence.source_references.length,1);assert.equal(evidence.source_references[0].sourceType,'project-actual-cost-record');assert.equal(evidence.source_references[0].sourceId,cost.id);
 assert.equal(basis.status,'active');assert.equal(basis.governance_schema_version,1);assert.equal(basis.measurement_basis,'excluding-tax');const slots=rows.values('shared_cost_allocation_source_snapshot').filter(s=>s.basis_id===basis.id&&s.is_current);assert.equal(slots.length,1);assert.equal(slots[0].cost_record_id,cost.id);assert.equal(slots[0].cost_row_version,cost.row_version);assert.equal(rows.values('shared_cost_allocation_source_snapshot').filter(s=>s.cost_record_id===cost.id&&s.is_current).length,1);
 const results=rows.values('shared_cost_allocation_result').filter(r=>r.basis_id===basis.id&&r.status==='active').map(r=>rows.owned('shared_cost_allocation_result',r.id));assert.deepEqual(results.map(r=>r.id).sort(),[...legacy.resultIds].sort());assert.deepEqual(results.map(r=>actualTwoOneWeight58(rows.raw('shared_cost_allocation_result').find(row=>row.key[0]===r.id))).sort(),['1','2']);assert(results.every(r=>r.is_included_in_project_cost===true&&r.row_version===2));
 const primary=packets.find(p=>p.target.projectId===body.projectId&&p.target.restatesSnapshotRef.id===body.restatesSnapshotRef.id);assert(primary);const targets=completeTargetsTax13(primary.preparation,packets,legacy.projectIds);assertSameCompleteTargets(targets,[[{projectId:body.projectId,expectedVersion:body.expectedVersion,restatesSnapshotRef:body.restatesSnapshotRef,periodEndSnapshotRef:null},...body.affectedTargets]]);
 const projects=[...legacy.projectIds].sort().map(projectId=>{const project=rows.owned('project',projectId),head=one(rows.values('project_operating_head'),h=>h.project_id===projectId,'Actual project head');const bindings=rows.values('operating_signal_gate_binding').filter(b=>b.project_id===projectId&&b.status==='active').map(b=>rows.owned('operating_signal_gate_binding',b.id));assert.equal(bindings.length,4);const reviews=rows.values('commission_gate_review_record').filter(r=>bindings.some(b=>b.id===r.binding_id)&&r.status==='active').map(r=>rows.owned('commission_gate_review_record',r.id));return {projectId,projectVersion:project.row_version,headVersion:head.row_version,currentSnapshotId:head.current_snapshot_id,baselineId:head.baseline_package_id,oldBindingIds:bindings.map(b=>b.id).sort(),oldGateReviewIds:reviews.map(r=>r.id).sort()};});assert.equal(projects.find(p=>p.projectId===body.projectId).projectVersion,body.expectedProjectVersion);
 const ordered=[{projectId:body.projectId,expectedVersion:body.expectedVersion,restatesSnapshotRef:body.restatesSnapshotRef,periodEndSnapshotRef:null},...body.affectedTargets],indices=new Map();
 const detailed=ordered.map(target=>{const old=rows.owned('project_operating_snapshot',target.restatesSnapshotRef.id),project=projects.find(p=>p.projectId===target.projectId);assert.equal(old.project_id,target.projectId);assert.equal(old.row_version,target.restatesSnapshotRef.expectedVersion);assert.equal(target.expectedVersion,project.headVersion);const oldContext=rows.owned('operating_source_context',old.source_context_id).frozen_payload,packet=packets.find(p=>p.target.projectId===target.projectId&&p.target.restatesSnapshotRef.id===old.id);assert(packet);const baselineCandidates={oldFrozenRef:oldContext.baseline.baselinePackageRef,currentPreparedRef:packet.preparation.selectedBaselinePackageRef,headBaselineId:project.baselineId,selectionPolicyAccepted:false};const n=(indices.get(target.projectId)??0)+1;indices.set(target.projectId,n);const expectedScope=expectedCostScopeTax13(packet.preparation,rows);const fixture=results.find(r=>r.project_id===target.projectId);const preparedShare=expectedScope.units.find(u=>u.id===fixture.id);assert(preparedShare&&preparedShare.decision.decision==='include'&&preparedShare.decision.role==='allocation-share');assert.equal(preparedShare.amounts.tax.knowledge,'known');assert(centsTax13(preparedShare.amounts.tax.value)>0n,'Actual nonzero share tax supplies the unknown-coverage predicate, not an inventedpending allocation');return {...target,selectedCurrent:project.currentSnapshotId===old.id,newHeadVersion:project.headVersion+n,finalHeadVersion:project.headVersion+ordered.filter(t=>t.projectId===target.projectId).length,expectedCostScope:expectedScope,baselineCandidates,preparedEligibility:packet.preparation.formalEligibility,preparedBlockingReasonCodes:packet.preparation.blockingReasonCodes};});for(const project of projects)assert(detailed.some(t=>t.projectId===project.projectId&&t.selectedCurrent));
 const decisionFor=(projectId,id)=>{const head=one(rows.values('project_cost_inclusion_head'),h=>h.project_id===projectId&&h.unit_key==='allocation:'+id,'Actual share classification head');return rows.owned('project_cost_inclusion_decision',head.decision_id);};
 return {version:58,branch:'tax',operationId:TAX13_OPERATION,actorId,primaryProjectId:body.projectId,sourceProjectId:cost.project_id,sourceCostId:cost.id,sourceCostVersion:cost.row_version,sourceBusinessDate:cost.occurred_on,stageId:null,taxId:tax.id,basisId:basis.id,sourceCount:slots.length,projects,targets:detailed,sourceDecisionId:null,results:results.map(r=>({id:r.id,projectId:r.project_id,oldDecisionId:decisionFor(r.project_id,r.id).id})).sort((a,b)=>a.projectId.localeCompare(b.projectId)),factsAreAuthority:false,explicitAllocationOverride:false,oldSnapshotAggregateEqualityAssumed:false,baselinePolicyDecisionAssumed:false};
}

return {deriveRootUnion15,deriveCapturedTax15Facts362,inventoryTax15};})();
function composeTax15Body(primary, targets, correction) {
    assert.equal(primary.kind, "preparation-only");
    assert.equal(primary.intent, "restatement");
    const roots = targets.filter((t) =>
        t.projectId === primary.projectId &&
        t.restatesSnapshotRef.id === primary.officialSnapshotRef?.id
    );
    assert.equal(roots.length, 1);
    const root = roots[0];
    const item = (t) => ({
        projectId: t.projectId,
        expectedVersion: t.expectedVersion,
        restatesSnapshotRef: exactExpectedRef(t.restatesSnapshotRef),
        periodEndSnapshotRef: t.periodEndSnapshotRef
            ? exactExpectedRef(t.periodEndSnapshotRef)
            : null,
        costDecisions: [],
    });
    return {
        inputVersion: "server-derived-v1",
        projectId: primary.projectId,
        expectedVersion: primary.headVersion,
        expectedProjectVersion: primary.projectVersion,
        expectedInputHash: primary.expectedInputHash,
        assertions: null,
        scope: "live",
        periodEndSnapshotRef: null,
        restatesSnapshotRef: exactExpectedRef(root.restatesSnapshotRef),
        restatementReason:
            "真实 Source12 共享费用仍为 pending 130.00，仅替代真实税务证据版本；Source15 按完整业务影响范围重述，不把来源 pending 复制给其他项目。",
        restatementSummary:
            "沿实际费用与全部分摊批次推导影响终端；保留真实业务日期和重算时间，不提供分摊覆盖，不改写历史快照。",
        costDecisions: [],
        laborCorrections: [],
        allocationCorrections: [],
        stageCorrections: [],
        taxCorrections: [correction],
        affectedTargets: targets.filter((t) => t !== root).map(item),
        acknowledgedChangedSourceRefs: [],
    };
}

export const physicalRelations362=Object.freeze({...factual273,...tax13,...tax15,composeTax15Body,exactExpectedRef,assertSameCompleteTargets,keyOf,uuid});
