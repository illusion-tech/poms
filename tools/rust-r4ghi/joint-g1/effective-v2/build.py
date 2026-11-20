"""Append-only tools input compiler. Writes only effective-v2; no product/SQL/Git.
Never imports or executes the sealed v1/capacity builders.
"""
from __future__ import annotations
import copy
import hashlib
import json
import re
from pathlib import Path

OUT=Path(__file__).resolve().parent
V1=OUT.parent
ROOT=V1.parents[2]
SOURCES=set()

def raw(rel):
    SOURCES.add(rel)
    return (ROOT/rel).read_text(encoding='utf-8-sig')
def load(rel):
    return json.loads(raw(rel))
def emit(name,value):
    target=OUT/name
    assert target.parent==OUT
    target.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def text(name,value):
    target=OUT/name
    assert target.parent==OUT
    target.write_text(value.replace('\r\n','\n'),encoding='utf-8')
def ref(name): return {'$ref':'#/components/schemas/'+name}
def nullable(shape): return {'anyOf':[shape,{'type':'null'}]}
def array(shape,minimum=None,maximum=None):
    result={'type':'array','items':shape}
    if minimum is not None: result['minItems']=minimum
    if maximum is not None: result['maxItems']=maximum
    return result
def obj(properties,required=None):
    return {'type':'object','additionalProperties':False,'properties':properties,'required':list(properties) if required is None else required}
UUID={'type':'string','format':'uuid'}
VERSION={'type':'integer','minimum':1,'maximum':2147483647}
HASH={'type':'string','pattern':'^[0-9a-f]{64}$'}
DATE={'type':'string','format':'date-time'}
ACTION={'type':'string','enum':['prompt','review','block']}
STAGES=['first','second','final','retention']
KNOWLEDGE={'type':'string','enum':['known','unknown']}
REVIEW={'type':'string','enum':['not-required','pending','acknowledged','manual-confirmed','stale']}
NONEMPTY={'type':'string','minLength':1,'maxLength':2000}

def normalize(value):
    """Normalize old OpenAPI nullable/boolean exclusiveMinimum into JSON Schema."""
    if isinstance(value,list): return [normalize(x) for x in value]
    if not isinstance(value,dict): return value
    result={k:normalize(v) for k,v in value.items() if k!='nullable'}
    if result.get('exclusiveMinimum') is True:
        result['exclusiveMinimum']=result.pop('minimum',0)
    elif result.get('exclusiveMinimum') is False: result.pop('exclusiveMinimum')
    if result.get('exclusiveMaximum') is True:
        result['exclusiveMaximum']=result.pop('maximum')
    elif result.get('exclusiveMaximum') is False: result.pop('exclusiveMaximum')
    if value.get('nullable'):
        return nullable(result)
    return result

def convert_g_refs(value):
    if isinstance(value,list): return [convert_g_refs(x) for x in value]
    if not isinstance(value,dict): return value
    return {k:(v.replace('#/$defs/','#/components/schemas/') if k=='$ref' else convert_g_refs(v)) for k,v in value.items()}

blue=load('tools/rust-r4ghi/joint-g1/blueprint.json')
INPUT_PRE_EFFECT_HASH=copy.deepcopy(blue['ssot']['sourceBeforeEffect'])
INPUT_PRE_EFFECT_HASH['fields']['affectedProjects']={
 'ordering':'complete real impacted set sorted projectId; each terminal set sorted scope/root/terminal id',
 'items':{'projectId':'actual affected projectUUID','projectRowVersion':'actual locked positive int4',
  'headRowVersion':'actual operating-head int4;0 only absent','baselinePackageId':'actual UUID|null',
  'currentSnapshotId':'actual UUID|null','terminalRootRefs':'all impacted live/period roots and their current terminal refs with actual IDs/rowVersions/payloadHashes; existing period anchor explicit|null'}}
capacity=load('tools/rust-r4ghi/joint-g1/capacity-delta02/capacity-audit.json')
spec=load('libs/shared/api-spec/openapi.json')
native=load('tools/rust-r4ghi/joint-g1/native-reference.schemas.json')
for path,methods in spec['paths'].items():
    for method,operation in methods.items():
        if isinstance(operation,dict) and operation.get('operationId')=='ContractFinanceController_confirmReceipt':
            if not any(x['operationId']==operation['operationId'] for x in native['operations']):
                native['operations'].append({'operationId':operation['operationId'],'method':method.upper(),'path':path,
                  **{key:operation[key] for key in ['parameters','requestBody','responses'] if key in operation}})
def native_closure(value):
    if isinstance(value,list):
        for item in value: native_closure(item)
    elif isinstance(value,dict):
        pointer=value.get('$ref','')
        if pointer.startswith('#/components/schemas/'):
            name=pointer.rsplit('/',1)[-1]
            if name not in native['components']['schemas']:
                native['components']['schemas'][name]=copy.deepcopy(spec['components']['schemas'][name])
                native_closure(native['components']['schemas'][name])
        for key,item in value.items():
            if key!='$ref': native_closure(item)
native_closure(native['operations'])
native['effectiveV2Note']='Augmented only with exact actual C confirm operation/schema closure omitted by the v1 wrong supporting operationId; original v1 file unchanged.'
emit('native-reference.schemas.json',native)
hd=blue['publicContractInputs']['H']
components=normalize(copy.deepcopy(spec['components']['schemas']))
gdefs=convert_g_refs(copy.deepcopy(blue['publicContractInputs']['G']['$defs']))
for name,shape in gdefs.items():
    # A collection retains its frozen array wire shape; each item is tagged.
    if shape.get('type')=='array':
        shape.pop('properties',None); shape.pop('required',None)
components.update(normalize(gdefs))
components.update(normalize(copy.deepcopy(blue['publicContractInputs']['I-R5']['schemas'])))
components['ProjectStage']['enum']=list(dict.fromkeys(components['ProjectStage']['enum']+['conditional-completed']))
components['ProjectArchiveRecordSummary']['properties']['archiveAnchorStage']['enum']=list(dict.fromkeys(
 components['ProjectArchiveRecordSummary']['properties']['archiveAnchorStage']['enum']+['conditional-completed']))
enum_h=hd['newEnumsNear9318']
for name,values in enum_h.items(): components[name]={'type':'string','enum':values}
components['OperatingSignalLevel']={'type':'string','enum':['normal','unknown','attention','alert']}
components['OperatingRiskLevel']={'type':'string','enum':['normal','unknown','attention','risk']}
components['OperatingReasonCode']={'type':'string','minLength':1,'maxLength':128,
 'x-registered-rule-codes':[row['code'] for row in blue['policy']['ruleRows']],
 'x-runtime-validation':'Must be a reason actually emitted by frozen policy for this exact evidence, not an arbitrary manual code'}
components['OperatingEvaluationContext']=obj({
 'schemaVersion':{'const':1},'projectId':UUID,'snapshotId':UUID,'snapshotRowVersion':VERSION,
 'snapshotMode':{'enum':['realtime','period-end','restated']},'maturityEvaluationId':UUID,'signalEvaluationId':UUID,
 'signalReviewRecordId':nullable(UUID),'sourceHash':HASH,'evaluationHash':HASH,
 'policyVersion':{'const':'r4h-operating-v1'},'policyHash':HASH,'producerVersion':{'const':1},
 'certification':ref('OperatingEvaluationCertification'),'evaluationStatus':{'enum':['complete','missing-evidence','manual-review-required','stale']},'rowVersion':VERSION})
components['OperatingMetricKnowledge']=obj({
 **{key:KNOWLEDGE for key in ['confirmedReceipts','includedCost','taxPending','grossMargin','grossMarginRate']},
 'grossMarginRateReason':nullable({'enum':['zero-denominator','missing-evidence','low-receipt-ratio','unstable']}),
 'ratiosStable':{'type':'boolean'},'grossMarginRateUse':{'enum':['unavailable','observation-only','business-judgment']}})
components['OperatingReasonView']=obj({
 'reasonId':HASH,'code':ref('OperatingReasonCode'),'category':{'enum':['evidence','maturity','cost','receipt','risk','restatement','formula','manual']},
 'ruleId':{'type':'string','minLength':1},'projectAction':ACTION,'stageActions':obj({x:ACTION for x in STAGES}),
 'isPrimaryProjectReason':{'type':'boolean'},'primaryStages':array(ref('OperatingGateStage'),0,4),
 'detailProjection':ref('SensitiveStringFieldProjection'),'evidenceProjection':ref('SensitiveStringFieldProjection')})
components['ManualOperatingMaterialityReview']=obj({
 'policyVersion':{'const':'r4h-operating-v1'},'issueCodes':array(ref('OperatingReasonCode'),1),
 'riskDecision':{'enum':['normal','attention','risk']},'evidenceRefs':array(ref('SourceRef'),1),
 'rationale':NONEMPTY})
components['OperatingGateFeedbackItem']=obj({
 'bindingId':UUID,'rowVersion':VERSION,'gateStageType':ref('OperatingGateStage'),'systemBindingAction':ACTION,
 'bindingAction':ACTION,'gateReviewDecision':nullable(ref('OperatingGateReviewDecision')),'reviewState':REVIEW,
 'summaryPackageKey':{'const':'project-operating-commission-gate-v1'},'summarySnapshotId':UUID,
 'projectionLevel':{'const':'commission-gate-review'},'exportPolicy':{'const':'internal-only'},'evaluationHash':HASH,
 'primaryReasonIds':array(HASH),'reasonItems':array(ref('OperatingReasonView')),
 'nextActionSummaryProjection':ref('SensitiveStringFieldProjection')})
components['OperatingEvaluationNotReadyError']=obj({
 'statusCode':{'const':409},'error':{'const':'Conflict'},'message':NONEMPTY,'projectId':UUID,
 'evaluationStatus':{'enum':['not-evaluated','missing-evidence']},'reasonCodes':array({'type':'string','minLength':1})})

def hfield(key,description):
    if key in ['expectedVersion','rowVersion']: return VERSION
    if key in ['expectedSourceHash','expectedEvaluationHash']: return HASH
    if key in ['requestKey','signalEvaluationId']: return UUID
    if key=='sourceSummarySnapshotId': return nullable(UUID)
    if key=='inputVersion': return {'const':'server-derived-v1'}
    if key=='manualMaterialityReview': return nullable(ref('ManualOperatingMaterialityReview'))
    if key=='gateBindingIds': return obj({x:UUID for x in STAGES})
    if key=='stageBindings': return array(ref('OperatingGateFeedbackItem'),4,4)
    if key=='reasonItems': return array(ref('OperatingReasonView'))
    if key=='blockingReasonCodes': return array(ref('OperatingReasonCode'))
    if key=='blockingReasonCode': return nullable(ref('OperatingReasonCode'))
    if key=='reviewState': return REVIEW
    if key=='reviewAction': return {'enum':['acknowledge','tighten-review','tighten-block']}
    if key=='gateStageType': return ref('OperatingGateStage')
    if key=='gateReviewDecision': return nullable(ref('OperatingGateReviewDecision')) if '|null' in description else ref('OperatingGateReviewDecision')
    if key in ['signalLevel','systemSignalLevel']: return ref('OperatingSignalLevel')
    if key in ['riskLevel','systemRiskLevel']: return ref('OperatingRiskLevel')
    if key in ['currentActionLevel','systemBindingAction','bindingAction','costActionRecommendation']: return ACTION
    if key=='evaluationContext': return ref('OperatingEvaluationContext')
    if key=='metricKnowledge': return ref('OperatingMetricKnowledge')
    raise ValueError('Uncompiled H field '+key+': '+description)

for delta in hd['fieldDeltas']:
    name=delta['schema']; shape=components[name]
    for key,description in {**delta.get('add',{}),**delta.get('change',{})}.items():
        shape['properties'][key]=hfield(key,description)
        if key not in {'manualMaterialityReview','blockingReasonCode'} and key not in shape.setdefault('required',[]): shape['required'].append(key)
    for key in delta.get('requiredExisting',[]):
        if key not in shape.setdefault('required',[]): shape['required'].append(key)
        if 'version' in key.lower(): shape['properties'][key]=VERSION
    for key in delta.get('protect',[]):
        shape['properties'][key]={'type':'null'}
        shape['properties'][key+'Projection']=ref('SensitiveStringFieldProjection')
        shape['required']=sorted(set(shape['required'])|{key,key+'Projection'})
    if name=='ReviewOperatingSignalEvaluationRequest':
        shape['properties']['reviewDecision']={'enum':['approve','manual-confirmed']}
    shape['additionalProperties']=False

# Existing unified-accounting GET: preparation is a typed response mode, no new GET.
components['OperatingAccountingPreparationView']=obj({
 'view':{'const':'preparation'},'outputVersion':{'const':'server-derived-v1'},
 'preparation':ref('OperatingPreparation'),'officialCurrent':nullable(ref('ProjectUnifiedAccountingView'))})
components['ProjectUnifiedAccountingResponse']={'oneOf':[ref('ProjectUnifiedAccountingView'),ref('OperatingAccountingPreparationView')]}

# The only public condition task information consists of parent IDs/version/
# aggregate status and the caller's actual task/evidence. No parent DTO copying.
components['OwnCompletionConditionClosure']=obj({
 'closureRecordId':UUID,'closedAt':DATE,'closedBy':UUID,'closureSummary':NONEMPTY,
 'evidenceRefs':array(ref('FrozenLifecycleEvidence'),1),'sourcePayloadHash':HASH})
components['OwnCompletionConditionTask']=obj({
 'conditionId':UUID,'conditionRowVersion':VERSION,'summary':NONEMPTY,'responsibleUserId':UUID,
 'dueAt':DATE,'status':{'enum':['pending','closed']},'evidenceRefs':array(ref('FrozenLifecycleEvidence'),1),
 'closure':nullable(ref('OwnCompletionConditionClosure'))})
components['OwnCompletionTaskParent']=obj({
 'completionRecordId':UUID,'completionRowVersion':VERSION,'conditionStatus':{'enum':['pending','closed']},
 'ownTasks':array(ref('OwnCompletionConditionTask'),1)})
components['FullProjectCompletionRecordListView']=obj({
 'scopeKind':{'const':'full-project'},'projectId':UUID,'items':array(ref('ProjectCompletionRecordSummary'))})
components['OwnCompletionTaskListView']=obj({
 'scopeKind':{'const':'own-condition-only'},'projectId':UUID,'items':array(ref('OwnCompletionTaskParent'))})
components['ProjectCompletionRecordList']={'oneOf':[ref('FullProjectCompletionRecordListView'),ref('OwnCompletionTaskListView')],
 'discriminator':{'propertyName':'scopeKind'}}
base_close=copy.deepcopy(components['CloseProjectCompletionConditionResult'])
for name,kind in [('FullProjectConditionCloseResult','full-project'),('OwnConditionCloseResult','own-condition-only')]:
    shape=copy.deepcopy(base_close)
    shape['properties']['scopeKind']={'const':kind}
    shape['properties']['closureEvidenceRefs']=array(ref('FrozenLifecycleEvidence'),1)
    shape['required']=sorted(set(shape['required'])|{'scopeKind','closureEvidenceRefs'})
    components[name]=shape
components['CloseProjectCompletionConditionResult']={'oneOf':[ref('FullProjectConditionCloseResult'),ref('OwnConditionCloseResult')],
 'discriminator':{'propertyName':'scopeKind'}}
components['FullProjectDetailView']=copy.deepcopy(components['ProjectDetailView'])
components['FullProjectDetailView']['properties']['scopeKind']={'const':'full-project'}
components['FullProjectDetailView']['required']=sorted(set(components['FullProjectDetailView']['required'])|{'scopeKind'})
components['CreatorFirstAssignmentAnchorView']=obj({
 'scopeKind':{'const':'creator-first-assignment-only'},'projectId':UUID,'projectNo':{'type':'string','minLength':1},
 'projectRowVersion':VERSION,'ownerOrgId':UUID,'ownerUserId':{'type':'null'},'creatorUserId':UUID,
 'ownershipOriginRowVersion':VERSION,'allowedActions':array({'const':'reassign-owner'},0,1)})
components['ProjectDetailView']={'oneOf':[ref('FullProjectDetailView'),ref('CreatorFirstAssignmentAnchorView')],
 'discriminator':{'propertyName':'scopeKind'}}
components['CurrentCommissionRoleAssignmentResponse']=nullable(ref('CommissionRoleAssignmentSummary'))

# True F producer inputs: exact current fields, tightened CAS only in this new
# modern restatement branch. Ordinary delivered F protocols are unchanged.
f_cloned={}
def clone_f_refs(value):
    if isinstance(value,list): return [clone_f_refs(x) for x in value]
    if not isinstance(value,dict): return value
    result={}
    for key,item in value.items():
        if key=='$ref' and item.startswith('#/components/schemas/'):
            name=item.rsplit('/',1)[-1]
            # Private modern source-evidence schemas avoid tightening ordinary
            # delivered F protocol components through a shared reference.
            new='Restatement'+name
            result[key]='#/components/schemas/'+new
            if new not in f_cloned:
                f_cloned[new]={}
                f_cloned[new]=clone_f_refs(copy.deepcopy(components[name]))
        else: result[key]=clone_f_refs(item)
    return result
for name,source_name in [('RestatementStageProducerRequest','ReclassifyCostStageAttributionRequest'),
                         ('RestatementTaxProducerRequest','ReplaceAccountingTaxTreatmentRequest')]:
    shape=clone_f_refs(copy.deepcopy(components[source_name]))
    shape['properties']['expectedVersion']=VERSION
    shape['required']=sorted(set(shape['required'])|{'expectedVersion'})
    if name=='RestatementStageProducerRequest':
        shape['properties']['lockedBySnapshotId']={'type':'null'}
        shape['required']=sorted(set(shape['required'])|{'lockedBySnapshotId'})
    components[name]=shape
components.update(f_cloned)
def expected_kind(kind):
    shape=copy.deepcopy(components['ExpectedRef'])
    shape['properties']['kind']={'const':kind}
    return shape
components['StageReclassificationCorrection']=obj({
 'correctionKind':{'const':'stage-reclassification'},
 'stageAttributionRef':expected_kind('CostStageAttributionSnapshot'),
 'costRef':expected_kind('ProjectActualCostRecord'),
 'request':ref('RestatementStageProducerRequest')})
components['TaxTreatmentReplacementCorrection']=obj({
 'correctionKind':{'const':'tax-treatment-replacement'},
 'taxTreatmentRef':expected_kind('AccountingTaxTreatmentSnapshot'),
 'expectedSourceRefs':array(ref('ExpectedRef'),1,1000),
 'request':ref('RestatementTaxProducerRequest')})
restatement=components['CreateOperatingRestatementRequest']
for key,shape in [('stageCorrections',ref('StageReclassificationCorrection')),('taxCorrections',ref('TaxTreatmentReplacementCorrection'))]:
    restatement['properties'][key]=array(shape,0,1000)
    restatement['required']=sorted(set(restatement['required'])|{key})

# All modern row/logical versions are actual int4. A missing head remains0.
# Do not inspect/modify arbitrary source metadata or externalSourceVersion.
version_paths=[]
def bind_versions(shape,path=''):
    if not isinstance(shape,dict): return
    for key,value in shape.get('properties',{}).items():
        lower=key.lower()
        is_version=lower in {'version','rowversion','headversion','newheadversion','capturedrowversion','snapshotrowversion',
          'projectrowversion','conditionrowversion','completionrowversion','ownershiporiginrowversion','expectedversion'} or (
          lower.startswith('expected') and (lower.endswith('version') or lower.endswith('rowversion')))
        if key=='externalSourceVersion': is_version=False
        if is_version:
            def bound(node):
                if not isinstance(node,dict): return
                if node.get('type')=='integer':
                    node['maximum']=2147483647
                    if node.get('minimum',1)!=0: node['minimum']=1
                    node.pop('exclusiveMinimum',None)
                for alt in node.get('anyOf',[])+node.get('oneOf',[]): bound(alt)
            bound(value)
            version_paths.append(path+'.'+key)
        bind_versions(value,path+'.'+key)
    for key in ['items','additionalProperties']:
        if isinstance(shape.get(key),dict): bind_versions(shape[key],path+'.'+key)
    for key in ['allOf','oneOf','anyOf']:
        for index,value in enumerate(shape.get(key,[])): bind_versions(value,path+f'.{key}[{index}]')

modern_names=set(gdefs)|set(blue['publicContractInputs']['I-R5']['schemas'])|{x['schema'] for x in hd['fieldDeltas']}|set(hd['newSchemas'])|{
 'FullProjectDetailView','CreatorFirstAssignmentAnchorView','OwnCompletionConditionTask','OwnCompletionTaskParent',
 'FullProjectConditionCloseResult','OwnConditionCloseResult','RestatementStageProducerRequest','RestatementTaxProducerRequest',
 'StageReclassificationCorrection','TaxTreatmentReplacementCorrection'}
modern_names |= set(f_cloned)
for name in modern_names: bind_versions(components[name],name)

operations=copy.deepcopy(blue['operationMap'])
for op in operations:
    if op['operationId']=='CommissionController_getCurrentRoleAssignment':
        op['responseDto']='CurrentCommissionRoleAssignmentResponse'; op['nullableResponse']=True
    if op['operationId']=='ProjectCostController_getProjectUnifiedAccounting': op['responseDto']='ProjectUnifiedAccountingResponse'
    if op['newPublicOperation']: op['inventoryStatus']='planned'
    wanted=op['canonical']
    inventory=raw('docs/design/api-route-canonical-inventory.md')
    op['observedRows']=[{'line':n,'row':line} for n,line in enumerate(inventory.splitlines(),1) if f'`{wanted}`' in line]
    op['requestSchemaPointer']=None if not op['requestDto'] else '#/components/schemas/'+op['requestDto']
    op['responseSchemaPointer']='#/components/schemas/'+op['responseDto']
    if op['operationId'] in {'CommissionController_createRoleAssignment','ProjectArchiveRecordController_replaceProjectArchiveRecord','ProjectArchiveRecordController_voidProjectArchiveRecord'}:
        op['legacyNativeSuccessStatus']=201
        op['successStatus']=200
        op['statusDriftClass']='existing-baseline-drift'
        op['legacyRule']='Preserve implicit Native201 reference branch; modern Rust200. No blanket HttpCode200 or old reference rewrite.'

# Include only the complete dependency closure of every32 target and supporting
# modern/public/scoped DTO. No descriptions are used as placeholder schema types.
roots={name for op in operations for name in [op['requestDto'],op['responseDto']] if name}
roots |= {'ConfirmReceiptRecordRequest','ProjectDetailView','PrepareProjectHandoverRequest','CreateProjectRequest',
 'OperatingEvaluationNotReadyError','CreatorFirstAssignmentAnchorView','OwnCompletionTaskListView',
 'StageReclassificationCorrection','TaxTreatmentReplacementCorrection'}
selected=set()
def closure(value):
    if isinstance(value,list):
        for item in value: closure(item)
    elif isinstance(value,dict):
        target=value.get('$ref','')
        if target.startswith('#/components/schemas/'):
            name=target.rsplit('/',1)[-1]
            if name not in selected:
                if name not in components: raise KeyError('Unresolved public schema '+name)
                selected.add(name); closure(components[name])
        for key,item in value.items():
            if key!='$ref': closure(item)
for name in sorted(roots): closure(ref(name))
public={'$schema':'https://json-schema.org/draft/2020-12/schema','title':'Effective v2 public contract assembly input; no product generation',
 'components':{'schemas':{name:components[name] for name in sorted(selected)}},
 'x-operationMap':operations,'x-protocol':'Modern writes server-derived-v1; frozen Native schemas remain separate byte-preserved reference input',
 'x-versionBinding':{'maximum':2147483647,'headAbsentOnly':0,'externalSourceVersionUntouched':True,'paths':sorted(set(version_paths))}}
emit('public-contracts.schema.json',public)
emit('dto-index.json',{'format':'All target DTOs and full reference closure assembled in public-contracts.schema.json/components/schemas',
 'operations':operations,'supporting':[{'operationId':'ProjectController_getById','responseDto':'ProjectDetailView'},
 {'operationId':'ContractFinanceController_confirmReceipt','requestDto':'ConfirmReceiptRecordRequest'}],
 'schemas':sorted(selected),'normalization':'OpenAPI nullable and boolean exclusiveMinimum converted to JSON Schema2020-12; original Native source bytes untouched'})

scope_contract={
 'proofToWire':{'FullProject':'full-project','OwnConditionOnly':'own-condition-only','CreatorFirstAssignmentOnly':'creator-first-assignment-only'},
 'completionList':{'operationId':'ProjectController_listProjectCompletionRecords','dto':'ProjectCompletionRecordList',
  'FullProject':'FullProjectCompletionRecordListView with all existing full required values',
  'OwnConditionOnly':'OwnCompletionTaskListView: parent completion ID/rowVersion/global conditionStatus; only actor-owned tasks and their own frozen/closure evidence',
  'query':'SQL restrict parents to EXISTS own condition first, select own tasks only; parent aggregate computed from all real conditions in one coherent read. No parent acceptance/completion summary or evidence joins into the narrow projection.'},
 'conditionClose':{'dto':'CloseProjectCompletionConditionResult','sourceHashPayloadWhitelist':[
  'schemaVersion','projectId','completionRecordId','expectedCompletionVersion','conditionId','expectedConditionVersion',
  'responsibleUserId','closedBy','closedAt','closureSummary','ownConditionEvidenceRefs','closureEvidenceRefs'],
  'rule':'Actor equals responsible user and has project:write; both proof branches return only own closure result and parent ID/version/global aggregate status. Never embed full parent DTO, acceptance IDs, parent summaries or parent evidence.'},
 'creatorAnchor':{'operationId':'ProjectController_getById','dto':'CreatorFirstAssignmentAnchorView',
  'rule':'Exact new org-owned origin+creator+active ownerOrg membership; only assignment anchor IDs/versions/projectNo/currentNULL owner. Read requires project:read; allowedActions includes reassign-owner only if separate project:write and exact bootstrap still available. First write consumes forever.'},
 'evidence':'OwnConditionOnly may read only exact frozen evidence attached to its owned condition or own closure, with existing attachment permission/classification still AND. Validate actual project/link/attachment/version/checksum; no parent acceptance/completion evidence copying or project-wide attachment listing.',
 'frontend':{'ownTasks':{'path':'existing frontend project route with own-conditions task mode, or independent frontend /project-condition-tasks/:projectId route',
  'firstRequest':'existing GET /api/projects/{projectId}/completion-records directly; never require full ProjectDetail before task access',
  'components':['Root data-access typed loadCompletionRecords union','I project-condition-tasks.ts child','Root router mounts task child without full workspace preload'],
  'write':'post existing named dual-UUID close route with returned parent/task versions; replace safe result and refresh same list'},
 'creator':{'firstRequest':'existing GET /api/projects/{id}',
  'components':['Root project-workspace store ProjectDetailView union','I project-first-owner-assignment.ts child'],
  'rule':'Narrow by scopeKind before loading panels. Creator branch mounts only assignment form, calls existing owner reference lookup with its actual guard and reassignOwner; never loads G/H/R5/full evidence. No fill-empty/as-cast to FullProjectDetailView.'}},
 'backendGetDelta':0,'noGeneralSummaryHTTPFinding':'Independent review found no registered generic L summary HTTP GET; do not report this unproven earlier concern as a confirmed vulnerability. Actual domain responses and summary consumers still require scope/projection.'}
emit('scope-response-contract.json',scope_contract)

restatement_contract={
 'route':'POST /operating-restatements','operationId':'ProjectCostController_createOperatingRestatement','newHTTP':0,
 'supportedKinds':['labor-replacement','allocation-batch-replacement','stage-reclassification','tax-treatment-replacement'],
 'DTO':'CreateOperatingRestatementRequest now requires stageCorrections[] and taxCorrections[] (explicit empty allowed); full concrete nested fields in public-contracts.schema.json',
 'permit':'private sealed RestatementPermit enum variants LaborReplacement/AllocationBatchReplacement/StageReclassification/TaxTreatmentReplacement with exact locked source IDs/versions/hashes, same Root-minted private OuterTxToken/borrowed TX lifetime (not HTTP request_id), operation ID, complete affected projects+terminal roots and scope proofs; no client permit boolean/public constructor/serialization',
 'stage':{'producer':'project_cost_governance::reclassify_with_permit(session,ValidatedStageCorrection,StageReclassificationPermit,actor)',
  'refactor':'Extract real existing service::stage/evidence/store producer, not a new direct SQL fake. Normal F route keeps all old guards; internal permit only relaxes consumed membership/occupied checks for its exact locked graph.',
  'CAS':'For consumed included cost preserve record_status=included/is_included=true and original confirmedAt/By/all source/money. Update only execution-stage attribution fields + row_version/audit; do not use current unconditional SET record_status=confirmed or reset included flag.',
  'facts':'Validate actual new attribution evidence against the real original business date/currency/registered stage. Persist new real governance evidence + attribution with predecessor, preserve old snapshot/attribution payload bytes.',
  'sharedLineage':'If target participates in any consumed allocation source-set, use existing complete allocation producer with actual frozen measurement/weights and full source set to refresh provenance atomically; unchanged economic inputs must conserve existing cents. New basis/source snapshots/results carry real predecessor/version proof. No partial share or synthetic cost.',
  'transitionProof':'Actual stage governance evidence records costBefore/After and old/new attribution IDs. A typed validated stage-only transition (same cost/source/money/confirmation, only documented stage/version fields differ) is consumed by the real allocation source loader. Never relax general compare_source_transition to allow arbitrary row changes.'},
 'tax':{'producer':'project_cost_governance::replace_tax_with_permit(session,ValidatedTaxCorrection,TaxTreatmentReplacementPermit,actor)',
  'facts':'Call real existing tax/evidence/store replacement with active exact predecessor/CAS and actual sourceReferences/currency/responsible human assessment. TaxImpactAmount fields belong to the existing authorized F assessment, not a G aggregate override.',
  'effects':'Append new real tax snapshot/evidence and predecessor; preserve prior row payload. G collects new actual F refs; deductible VAT not added to cost and taxImpactAmount never automatically summed as a new cost component.'},
 'affectedClosure':'Discover reverse membership for direct costs, shared source members, stage/tax refs and every affected live or period current terminal root. Require action+project scope+all sensitive-write grants for every impacted project. Lock full sorted set, rediscover after batch locks, restart on expansion. Restate every target; no partial success or unacknowledged missing target.',
 'inputHash':'The pre-effect whitelist binds complete impacted project/head/target/source versions; include affectedProjects [{projectId,projectRowVersion,headRowVersion,baselinePackageId,currentSnapshotId,terminalRootRefs}] in the preparation/input hash. Assert before producer effects. Source hashes use actual post-producer refs and previously frozen acyclic output-ref policy.',
 'period':'Keep each original business cutoff/window; advance actual knowledge cutoff. New stage/tax evidence must refer to original in-window business facts; late-produced proof is labelled. No mixed-cutoff partial shared batch inference.',
 'overlaps':'Reject duplicate/conflicting primary correction targets before writes. Multiple independent corrections allowed. A labor replacement plus a stage correction of its now-old cost is conflicting; labor replacement already requires true new stage evidence. Any dependent allocation refresh caused by stage correction is server-derived from the exact locked prior batch, not a second conflicting arbitrary correction.',
 'atomic':'All real F/E source changes, classifications, all G contexts/snapshots/period/restatements, H evaluations/four gates/summaries, audit/security/pending-auth one borrowed CommonSession/outerTX. Capacity preinsert422 rolls everything back. Original published snapshots/context bytes never rewritten.',
 'unsupported':['non-labor payment/invoice/payable principal mutation without real correction producer','ordinary receipt reversal or re-rating of existing receipt basis without separately frozen producer','client monetary aggregate/conclusion override','only-one-project reclassification of shared batch'],
 'errors':{'unsupported':'409 operating_source_correction_unsupported','incompleteAffectedSet':'409 operating_restatement_scope_incomplete','conflictingTargets':'422 conflicting_correction_targets','changedSource':'409','moneyOverflow':'422 operating_money_capacity_exceeded'},
 'normalPaths':'Consumed facts on ordinary E/F mutation still409 operating_restatement_required. Unconsumed old protocols unchanged; no gratuitous input tag requirement.'}
emit('restatement-contract.json',restatement_contract)

legacy={
 'baseline':'Under project lock query all is_current baseline rows across every producer before interpreting a missing new head. Legacy current producer0 has no admission protocol in this batch:409 legacy_operating_baseline_admission_required. Do not initialize a new head or silently supersede legacy baseline. Truly absent current baseline remains normal initial creation.',
 'baselineGET':'Official current getter with only legacy current returns typed409 admission-required; genuinely absent baseline404. Preparation200 exposes safe blocking code/empty formal commands, never a fake empty state.',
 'period':'Query active/current(project,periodKey) across all producers. Legacy existing period409 legacy_period_reconciliation_required; v1 existing period409 period_snapshot_exists/use actual v1 restatement. Legacy predecessor/restatement source cannot be promoted without real certified admission, absent here.',
 'assignment':'Current role assignment query is cross-producer. Absent200/null. Any current frozen, including legacy,409 commission_frozen_change_requires_dispute on create/replace. Actual current draft replacement requires exact ID/version and newly verified participants; do not treat legacy as missing.',
 'unique':'Retain existing cross-producer current/version unique indexes; semantic guards/CAS precede INSERT. Concurrent residual23505 maps to a typed409 after known constraint classification; it is not the primary eligibility test.'}
emit('legacy-current-contract.json',legacy)

interfaces={
 'authority':'Root alone owns these types in apps/poms-api-rust/src/project_operating_common/model.rs; G/H import exactly this model. No independent shadows or policy in common.',
 'modules':{'model':'apps/poms-api-rust/src/project_operating_common/model.rs','hash':'apps/poms-api-rust/src/project_operating_common/hash.rs',
  'loader':'apps/poms-api-rust/src/project_operating_common/loader.rs','scope':'apps/poms-api-rust/src/project_action_authorization/mod.rs',
  'collector':'apps/poms-api-rust/src/project_operating/collector.rs','preparation':'apps/poms-api-rust/src/project_operating/preparation.rs',
  'GService':'apps/poms-api-rust/src/project_operating/service.rs','HPolicy':'apps/poms-api-rust/src/project_operating_signals/policy.rs',
  'HService':'apps/poms-api-rust/src/project_operating_signals/service.rs','correctionFacade':'apps/poms-api-rust/src/project_cost_governance/mod.rs'},
 'schemaAliases':{
  'OperatingPreparation':'public-contracts.schema.json#/components/schemas/OperatingPreparation',
  'OperatingSourceRow':'public-contracts.schema.json#/components/schemas/SourceRow',
  'ExpectedRef':'public-contracts.schema.json#/components/schemas/ExpectedRef',
  'SourceRef':'source-context.schema.json#/$defs/SourceRef',
  'OperatingSourceContext':'source-context.schema.json (entire object)',
  'OperatingCommandInput':'validated modern32 operation DTOs from dto-index.json, never raw Value/f64 money',
  'CostDecisionInput':'public-contracts.schema.json#/components/schemas/CostDecisionInput',
  'AffectedRestatementTarget':'public-contracts.schema.json#/components/schemas/AffectedRestatementTarget'},
 'scalarTypes':{'Uuid':'uuid::Uuid','Int4Version':'i32; actual row/logical1..2147483647','HeadVersion':'i32;0 means absent only',
  'Sha256':'String exactly lower64 hex, private validated constructor','CurrencyCode':'String exactly proven[A-Z]{3}',
  'OperatingMoneyCents':'private i128 wrapper,abs<=999999999999999999, exact cents; per-field nonnegative where required',
  'UtcInstant':'chrono::DateTime<chrono::Utc>','BusinessDate':'chrono::NaiveDate','PeriodKey':'validated actual month/ISOweek String',
 'OuterTxToken':'Root private opaque lifetime-bound token minted by the server for this exact borrowed outer transaction; no Serialize/Deserialize/public constructor and unrelated to HTTP request_id/correlation IDs',
  'VerifiedOperatingAccessSet':'Root private nonserializable struct VerifiedOperatingAccessSet<\'tx> {actor_id:Uuid,project_proofs:BTreeMap<Uuid,ProjectAccessProof>,outer_tx_token:&\'tx OuterTxToken}; no public/request constructor'},
 'enums':{
  'CollectLockMode':{'ReadCoherent':'domain read-only; no business/source/classification writes; existing required security audit still participates',
                   'WriteLocked':'only validated write input; full impacted project/source rank locks and expected hash before effects'},
  'OperatingPreparationIntent':{
   'BaselineActivation':{},'SnapshotCreate':{'mode':'SnapshotMode[Realtime|PeriodEnd]','period_key':'Option<PeriodKey>'},
   'PeriodClose':{'period_key':'PeriodKey'},'Restatement':{'scope':'RestatementScope[Live|Period]','restates_snapshot':'ExpectedRef','period_end_snapshot':'Option<ExpectedRef>'},
   'ReceiptBasis':{'receipt':'ExpectedRef'}},
  'OperatingCollectInput':{'Preview':'OperatingPreparationIntent','ActivateBaseline':'ActivateOperatingBaselinePackageRequest',
   'CaptureSnapshot':'CreateProjectOperatingSnapshotRequest','ClosePeriod':'CreatePeriodClosingSnapshotRequest','Restate':'CreateOperatingRestatementRequest'},
  'OperatingCollectionContext':{'BaselineOnly':'OperatingBaselineSourceDraft','Snapshot':'OperatingSourceContext'}},
 'structs':{
  'OperatingBusinessWindow':{'business_cutoff':'BusinessDate','knowledge_cutoff':'UtcInstant','source_window_start':'Option<BusinessDate>',
    'source_window_end':'Option<BusinessDate>','period_key':'Option<PeriodKey>','business_timezone':'String fixed Asia/Hong_Kong'},
  'OperatingGeneratedIds':{'baseline_source_id':'Option<Uuid>','snapshot_id':'Option<Uuid>','context_id':'Option<Uuid>',
    'paired_period_id':'Option<Uuid>','restatement_batch_id':'Option<Uuid>'},
  'OperatingCollectPlan':{'project_id':'Uuid','intent':'OperatingPreparationIntent','input':'OperatingCollectInput',
    'window':'OperatingBusinessWindow','generated_ids':'OperatingGeneratedIds','access':'VerifiedOperatingAccessSet<\'tx>; plan is OperatingCollectPlan<\'tx>'},
  'OperatingLockedProjectState':{'project_id':'Uuid','project_row_version':'Int4Version','head_row_version':'HeadVersion',
    'baseline_package_ref':'Option<SourceRef>','current_snapshot_ref':'Option<SourceRef>','terminal_root_refs':'Vec<SourceRef>'},
  'ApprovedProjectCostTransition':{'before_cost_ref':'SourceRef','after_cost_ref':'SourceRef','approval_source_refs':'Vec<SourceRef>',
    'delta_net_cents':'OperatingMoneyCents'},
  'OperatingBaselineSourceDraft':{'id':'Uuid','project_id':'Uuid','original_cost_ref':'SourceRef','current_cost_ref':'SourceRef',
    'handover_basis_ref':'Option<SourceRef>','handover_rebaseline_ref':'Option<SourceRef>','currency':'CurrencyCode',
    'approved_transitions':'Vec<ApprovedProjectCostTransition>','original_baseline_cost':'OperatingMoneyCents',
    'handover_baseline_cost':'OperatingMoneyCents','execution_change_package_total':'OperatingMoneyCents',
    'change_package_total':'OperatingMoneyCents','current_effective_baseline_cost':'OperatingMoneyCents','source_hash':'Sha256','payload_hash':'Sha256'},
  'VerifiedProducerTransition':{'kind':'CorrectionKind[LaborReplacement|AllocationBatchReplacement|StageReclassification|TaxTreatmentReplacement]',
    'before_refs':'Vec<SourceRef>','after_refs':'Vec<SourceRef>','evidence_refs':'Vec<SourceRef>','affected_project_ids':'Vec<Uuid>'},
  'OperatingCollection':{'context':'OperatingCollectionContext','preparation':'OperatingPreparation','source_rows':'Vec<OperatingSourceRow>',
    'locked_projects':'Vec<OperatingLockedProjectState>','producer_transitions':'Vec<VerifiedProducerTransition>','generated_ids':'OperatingGeneratedIds'}},
 'rules':['Intent and plan.project_id must exactly match the validated write DTO; expectedVersion/project/hash/refs/corrections read only from that one typed input, not duplicated shadows.',
  'Preview input can only use ReadCoherent. Write input only WriteLocked. Root access set binds every impacted project and same caller TX. generated IDs never factual hash authority.',
  'BaselineOnly never invents full context/snapshot/H evaluation. Snapshot branch always uses complete shared context; H pure derive precedes one final G INSERT.',
  'OperatingPreparation is the exact public schema type, including all required explicit-null fields. No separate guessed G/H preparation object.',
  'Actual source-set expansion returns typed409 scope-changed or restarts whole outerTX through Root coordinator; never add out-of-order project locks.'],
 'signatures':{
  'prepare':'pub async fn prepare_with_session(session:&mut CommonSession<\'_,\'_>, project_id:Uuid, intent:&OperatingPreparationIntent, actor:&Actor)->Result<OperatingPreparation,Error>',
  'collect':'pub async fn collect_with_session(session:&mut CommonSession<\'_,\'_>, plan:&OperatingCollectPlan<\'_>, lock_mode:CollectLockMode, actor:&Actor)->Result<OperatingCollection,Error>',
  'load':'pub async fn load_frozen_context_with_session(session:&mut CommonSession<\'_,\'_>, snapshot_id:Uuid, expected_row_version:i32, expected_source_hash:&str)->Result<OperatingSourceContext,Error>',
  'derive':'pub fn derive_operating_evaluation(context:&OperatingSourceContext, review:Option<&VerifiedMaterialityReview>)->Result<OperatingEvaluationDraft,Error>',
  'readiness':'pub fn derive_cost_readiness(context:&OperatingSourceContext)->Result<CostReadiness,Error>',
  'evaluate':'pub async fn evaluate_with_session(session:&mut CommonSession<\'_,\'_>, snapshot_id:Uuid, expected_row_version:i32, expected_source_hash:&str, actor:&Actor)->Result<OperatingEvaluationRefs,Error>',
  'stageCorrection':'pub(crate) async fn reclassify_with_permit(session:&mut CommonSession<\'_,\'_>, input:&ValidatedStageCorrection, permit:&StageReclassificationPermit, actor:&Actor)->Result<VerifiedProducerTransition,Error>',
  'taxCorrection':'pub(crate) async fn replace_tax_with_permit(session:&mut CommonSession<\'_,\'_>, input:&ValidatedTaxCorrection, permit:&TaxTreatmentReplacementPermit, actor:&Actor)->Result<VerifiedProducerTransition,Error>'}}
interfaces['schemaAliases'].update({
 'FormalEligibility':'source-context.schema.json#/properties/formalEligibility',
 'OperatingMetricKnowledge':'public-contracts.schema.json#/components/schemas/OperatingMetricKnowledge',
 'OperatingGateStage':'public-contracts.schema.json#/components/schemas/OperatingGateStage',
 'OperatingDataMaturityLevel':'public-contracts.schema.json#/components/schemas/OperatingDataMaturityLevel',
 'OperatingSnapshotActionLevel':'public-contracts.schema.json#/components/schemas/OperatingSnapshotActionLevel',
 'OperatingSignalLevel':'public-contracts.schema.json#/components/schemas/OperatingSignalLevel',
 'OperatingRiskLevel':'public-contracts.schema.json#/components/schemas/OperatingRiskLevel'})
interfaces['structs'].update({
 'VerifiedRestatementScope':{'outer_tx_token':'&\'tx OuterTxToken','operation_id':'Uuid server-generated correction batch',
  'actor_id':'Uuid','input_hash':'Sha256 pre-effect whitelist','access':'&\'tx VerifiedOperatingAccessSet<\'tx>',
  'locked_projects':'Vec<OperatingLockedProjectState>','consumed_context_refs':'Vec<SourceRef>',
  'locked_source_refs':'Vec<SourceRef>','complete_terminal_target_refs':'Vec<SourceRef>'},
 'ValidatedStageCorrection':{'request':'StageReclassificationCorrection exact schema alias','project_id':'Uuid',
  'cost_before_ref':'SourceRef','attribution_before_ref':'SourceRef','verified_evidence_refs':'Vec<SourceRef>'},
 'ValidatedTaxCorrection':{'request':'TaxTreatmentReplacementCorrection exact schema alias','project_id':'Uuid',
  'tax_before_ref':'SourceRef','verified_source_refs':'Vec<SourceRef>','verified_evidence_refs':'Vec<SourceRef>'},
 'StageReclassificationPermit':{'scope':'&\'tx VerifiedRestatementScope<\'tx>','cost_id':'Uuid','attribution_id':'Uuid','affected_allocation_basis_ids':'Vec<Uuid>'},
 'TaxTreatmentReplacementPermit':{'scope':'&\'tx VerifiedRestatementScope<\'tx>','tax_treatment_id':'Uuid','project_id':'Uuid'},
 'OperatingEvaluationRefs':{'snapshot_id':'Uuid','source_hash':'Sha256','evaluation_hash':'Sha256',
  'maturity_evaluation_id':'Uuid','signal_evaluation_id':'Uuid','signal_row_version':'Int4Version',
  'binding_ids':'BTreeMap<OperatingGateStage,Uuid> exactly4','summary_snapshot_ids':'BTreeMap<OperatingGateStage,Uuid> exactly4',
  'current_action_level':'OperatingSnapshotActionLevel','policy_version':'String fixed r4h-operating-v1',
  'certification':'OperatingEvaluationCertification'},
 'CostReadiness':{'data_maturity_level':'OperatingDataMaturityLevel','cost_action_recommendation':'OperatingSnapshotActionLevel',
  'reason_items':'Vec<OperatingReasonInternal>','known_metric_states':'OperatingMetricKnowledge','formal_eligibility':'FormalEligibility'},
 'OperatingReasonInternal':{'reason_id':'Sha256','code':'String registered actual rule code','category':'OperatingReasonCategory',
  'rule_id':'String','project_action':'OperatingSnapshotActionLevel','stage_actions':'BTreeMap<OperatingGateStage,OperatingSnapshotActionLevel> exactly4',
  'is_primary_project_reason':'bool','primary_stages':'Vec<OperatingGateStage>','detail':'String private sensitive text','evidence_refs':'Vec<SourceRef>'},
 'OperatingGateDraft':{'stage':'OperatingGateStage','system_action':'OperatingSnapshotActionLevel','effective_action':'OperatingSnapshotActionLevel',
  'reason_ids':'Vec<Sha256>','primary_reason_ids':'Vec<Sha256>'},
 'OperatingEvaluationDraft':{'cost_readiness':'CostReadiness','system_signal_level':'OperatingSignalLevel','system_risk_level':'OperatingRiskLevel',
  'effective_signal_level':'OperatingSignalLevel','effective_risk_level':'OperatingRiskLevel','current_action_level':'OperatingSnapshotActionLevel',
  'four_stage_drafts':'BTreeMap<OperatingGateStage,OperatingGateDraft> exactly4','all_reasons':'Vec<OperatingReasonInternal>',
  'ratio_use':'GrossMarginRateUse[Unavailable|ObservationOnly|BusinessJudgment]','evaluation_status':'OperatingEvaluationStatus',
  'certification':'OperatingEvaluationCertification','evaluation_hash':'Sha256'},
 'VerifiedMaterialityReview':{'source_hash':'Sha256','evaluation_hash_before':'Sha256','policy_hash':'Sha256','actor_id':'Uuid',
  'risk_decision':'OperatingRiskLevel only Normal|Attention|Risk','issue_codes':'Vec<String> verified unresolved actual issues',
  'evidence_refs':'Vec<SourceRef> exact frozen-context members','rationale':'String nonempty<=2000 sensitive','overlay_hash':'Sha256'}})
interfaces['rules'].append('H alone constructs VerifiedMaterialityReview through verification; internal reason text/evidence never serializes directly into public DTO. Public projection produces OperatingReasonView.')
interfaces['rules'].append('Access proofs and every permit bind the same Root-minted private OuterTxToken/borrowed TX lifetime. HTTP request_id may be reused/client-correlated and is audit metadata only, never transaction identity.')
interfaces['schemaAliases'].update({
 'StageReclassificationCorrection':'public-contracts.schema.json#/components/schemas/StageReclassificationCorrection',
 'TaxTreatmentReplacementCorrection':'public-contracts.schema.json#/components/schemas/TaxTreatmentReplacementCorrection'})
emit('interface-targets.json',interfaces)

sql=raw('tools/rust-r4ghi/joint-g1/migration.sql')
sql=sql.replace("to_stage IN ('handover','execution','acceptance','completed')", "to_stage IN ('handover','execution','acceptance','completed','conditional-completed')")
sql=sql.replace("(to_stage='completed' AND from_stage='acceptance'", "(to_stage IN ('completed','conditional-completed') AND from_stage='acceptance'")
sql=sql.replace("archive_anchor_stage='completed' AND archive_anchor_source_type='project-completion-record'", "archive_anchor_stage IN ('completed','conditional-completed') AND archive_anchor_source_type='project-completion-record'")
old_guard=re.search(r'CREATE FUNCTION poms\.jghi_assignment_participant_guard\(\).*?END \$\$;',sql,re.S)
assert old_guard
new_guard="""CREATE FUNCTION poms.jghi_assignment_participant_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_id uuid;
BEGIN
 IF TG_OP='UPDATE' AND NEW.assignment_id IS DISTINCT FROM OLD.assignment_id THEN
  RAISE EXCEPTION 'assignment participant cannot be reparented' USING ERRCODE='23514';
 END IF;
 IF TG_OP='DELETE' THEN parent_id:=OLD.assignment_id; ELSE parent_id:=NEW.assignment_id; END IF;
 IF EXISTS(SELECT 1 FROM poms.commission_role_assignment a WHERE a.id=parent_id AND a.status='frozen') THEN
  RAISE EXCEPTION 'frozen assignment participants immutable' USING ERRCODE='23514';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;"""
sql=sql[:old_guard.start()]+new_guard+sql[old_guard.end():]
sql=sql.replace("WHERE id=COALESCE(NEW.assignment_id,OLD.assignment_id);","WHERE id=CASE WHEN TG_OP='DELETE' THEN OLD.assignment_id ELSE NEW.assignment_id END;")
sql+="""
-- Shared ProjectStage includes conditional-completed; conditions never rewrite
-- that original terminal result to completed after closure.
ALTER TABLE poms.project DROP CONSTRAINT chk_project_current_stage;
ALTER TABLE poms.project ADD CONSTRAINT chk_project_current_stage CHECK(current_stage IN
 ('assessment','scope-confirmation','commercial-closure','contracting','handover','execution','acceptance',
  'completed','conditional-completed','closed-lost','closed-terminated'));
-- EFFECTIVE V2: G pending-tax knowledge is identical to H and immutable context.
ALTER TABLE poms.project_operating_snapshot
 ALTER COLUMN tax_impact_pending_amount DROP NOT NULL,
 ADD COLUMN tax_pending_knowledge varchar(16) NULL,
 ADD CONSTRAINT ck_jghi_snapshot_pending_tax_v1 CHECK(producer_version=0 OR
  (producer_version=1 AND tax_pending_knowledge IS NOT NULL AND
   ((tax_pending_knowledge='known' AND tax_impact_pending_amount IS NOT NULL)
    OR (tax_pending_knowledge='unknown' AND tax_impact_pending_amount IS NULL))));
ALTER TABLE poms.period_closing_snapshot
 ALTER COLUMN tax_impact_pending_amount DROP NOT NULL,
 ADD COLUMN tax_pending_knowledge varchar(16) NULL,
 ADD CONSTRAINT ck_jghi_period_pending_tax_v1 CHECK(producer_version=0 OR
  (producer_version=1 AND tax_pending_knowledge IS NOT NULL AND
   ((tax_pending_knowledge='known' AND tax_impact_pending_amount IS NOT NULL)
    OR (tax_pending_knowledge='unknown' AND tax_impact_pending_amount IS NULL))));
CREATE FUNCTION poms.jghi_operating_pending_tax_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE s record; p record; c record; a jsonb; amount_text text;
BEGIN
 IF TG_TABLE_NAME='project_operating_snapshot' THEN
  SELECT * INTO s FROM poms.project_operating_snapshot WHERE id=NEW.id;
 ELSE
  SELECT * INTO s FROM poms.period_closing_snapshot WHERE id=NEW.id;
 END IF;
 IF s.producer_version<>1 THEN RETURN NULL; END IF;
 SELECT * INTO c FROM poms.operating_source_context WHERE id=s.source_context_id;
 a:=c.frozen_payload->'metrics'->'taxPendingAmount';
 IF c.id IS NULL OR c.project_id IS DISTINCT FROM s.project_id
  OR a->>'knowledge' IS DISTINCT FROM s.tax_pending_knowledge THEN
  RAISE EXCEPTION 'snapshot pending tax knowledge differs from context' USING ERRCODE='23514';
 END IF;
 IF s.tax_pending_knowledge='known' THEN
  amount_text:=a->>'value';
  IF amount_text IS NULL OR amount_text!~'^(0|[1-9][0-9]*)\\.[0-9]{2}$' THEN
   RAISE EXCEPTION 'known pending tax requires exact nonnegative cents' USING ERRCODE='23514';
  END IF;
  IF amount_text::numeric IS DISTINCT FROM s.tax_impact_pending_amount THEN
   RAISE EXCEPTION 'snapshot pending tax amount differs from context' USING ERRCODE='23514';
  END IF;
 ELSE
  IF a->'value' IS DISTINCT FROM 'null'::jsonb OR s.tax_impact_pending_amount IS NOT NULL THEN
   RAISE EXCEPTION 'unknown pending tax cannot become zero' USING ERRCODE='23514';
  END IF;
 END IF;
 IF TG_TABLE_NAME='period_closing_snapshot' THEN
  SELECT * INTO p FROM poms.project_operating_snapshot WHERE id=s.project_snapshot_id;
  IF p.id IS NULL OR p.source_context_id IS DISTINCT FROM s.source_context_id
   OR p.tax_pending_knowledge IS DISTINCT FROM s.tax_pending_knowledge
   OR p.tax_impact_pending_amount IS DISTINCT FROM s.tax_impact_pending_amount THEN
   RAISE EXCEPTION 'paired period/project pending tax differs' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER jghi_snapshot_pending_tax AFTER INSERT OR UPDATE ON poms.project_operating_snapshot
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION poms.jghi_operating_pending_tax_guard();
CREATE CONSTRAINT TRIGGER jghi_period_pending_tax AFTER INSERT OR UPDATE ON poms.period_closing_snapshot
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION poms.jghi_operating_pending_tax_guard();
CREATE FUNCTION poms.jghi_terminal_stage_result_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c record;
BEGIN
 IF NEW.to_stage NOT IN ('completed','conditional-completed') THEN RETURN NULL; END IF;
 SELECT * INTO c FROM poms.project_completion_record WHERE id=NEW.source_completion_record_id;
 IF c.id IS NULL OR c.project_id IS DISTINCT FROM NEW.project_id OR c.producer_version<>1
   OR c.completion_result IS DISTINCT FROM NEW.to_stage THEN
  RAISE EXCEPTION 'terminal ledger stage must match actual completion result' USING ERRCODE='23514';
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER jghi_terminal_stage_result AFTER INSERT ON poms.project_stage_record
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION poms.jghi_terminal_stage_result_guard();
-- No new money capacity DDL: all existing20/new8 money fields stay18,2.
-- F corrections use real producers and immutable evidence/predecessors already
-- modeled above; no extra table, fake source, permission seed or business approval.
"""
text('migration.sql',sql)
emit('orm-delta.json',{'RootOwns':True,'capacityChanges':[],
 'projectStage':{'sharedEnum':'ProjectStage adds conditional-completed; no new ProjectStatus value',
 'ORM':'Project.currentStage and archiveAnchorStage typed union/check derive same shared values; native frozen legacy branch cannot be widened by as-cast',
 'SQL':'chk_project_current_stage + project_stage_record.to_stage + v1 archive anchor check include conditional-completed; terminal ledger trigger matches actual completion_result'},
 'G':[{ 'entity':name,'property':'taxImpactPendingAmount','target':'p.decimal().precision(18).scale(2).nullable().default(0); legacy default only; modern unknown writes explicitNULL',
  'newProperty':'taxPendingKnowledge: nullable known|unknown; required valid for producer1; producer0 remainsNULL'}
  for name in ['ProjectOperatingSnapshot','PeriodClosingSnapshot']],
 'alreadyFrozenH':'DMER and binding pending nullable+knowledge unchanged; Root must apply mapping together with G',
 'grossMarginRate':'Existing frozen38,6 target unchanged; source money18,2 unchanged',
 'Native':'Use exact frozen aliases; legacy queries cannot format a producer1 unknownNULL as a legacy zero. Modern unsupported path422, no as-cast or optional weakening.'})

context=load('tools/rust-r4ghi/joint-g1/source-context.schema.json')
context=json.loads(json.dumps(context).replace('ContractFinanceController_confirmReceiptRecord','ContractFinanceController_confirmReceipt'))
context['x-effectiveVersion']=2
bind_versions(context,'OperatingSourceContext')
for name,shape in context.get('$defs',{}).items(): bind_versions(shape,'OperatingSourceContext.'+name)
context['x-preEffectInputHashWhitelist']=INPUT_PRE_EFFECT_HASH
context['x-moneyCapacity']=capacity['moneyContract']
context['x-pendingTaxPersistence']='G snapshot+paired period+H DMER/binding all null+knowledge, tied to metrics.taxPendingAmount; known-zero proof retained, unknown never zero'
context['x-restatementCorrectionKinds']=restatement_contract['supportedKinds']
emit('source-context.schema.json',context)
text('policy-definition.json',raw('tools/rust-r4ghi/joint-g1/policy-definition.json'))

tests={
 'status':'planned-not-run; no SQL/HTTP/product execution',
 'BG1-01':['True known0 tax and unknown optional pending tax from same real source chain persist distinct knowledge/value across G snapshot/period/H; context/amount mismatch rolls back; producer0 unchanged'],
 'BG1-02':['OwnConditionOnly list has only own parent IDs/versions/global aggregate/own tasks; hidden other pending task keeps globalpending; close response has own closure evidence only',
 'Own frontend task route loads existing completion list directly while fullProjectDetail404; creator anchor is strict minimal union and never triggers G/H/R5/full-page preload; no backend GET added',
 'Try parent acceptanceRecordId/completionSummary/evidenceRefs/full audit injection into narrow DTO: JSON Schema rejects additional properties; no empty fillers/as-cast'],
 'BG1-03':['Actual frozen A includes real zero-weight member; actual draft B sums1000000. UPDATE member.assignment_id=A->B must23514 and both memberships/totals unchanged; also draft->draft reparent denied',
 'Frozen member insert/update/delete denied; draft changes still deferred sum1000000; DELETE usesOLD parent; no COALESCE new-parent bypass'],
 'F':['Actual consumed direct cost stage correction preserves included and money/confirmation; new stage evidence/predecessor/source versions and all affected G/H outputs oneTX',
 'Stage in shared batch refreshes real complete F provenance at same frozen economic weights/cents and every impacted live/period target; omit target or one scope403/409 and no partialwrites',
 'Actual tax replace creates new evidence/predecessor with responsible F assessment; deductible VAT not doublecounted; hard-source missing cannot be manually erased',
 'Ordinary consumed mutation409 restatement-required, unsupported nonlabor/receipt reversal409; fail each real producer/G/H/summary/audit/auth step and assert complete rollback'],
 'legacy':['No current role assignment200/null; legacy current frozen blockscreate; legacy current baseline blocks even missinghead; legacy active period blocks beforeINSERT; no23505 used as normal admission',
 'Native R5create/archive replace/void legacy201 retained, modernRust200; modern Nativeunsupported422; platform3 old status drift remains separate'],
 'versions':['Modern actual row/logical int4 versions accept1/MAX, rejectMAX+1 as validation400 before i32/DB; head absent0 only; externalSourceVersion string/UUID untouched'],
 'capacity':capacity['fixtures']}
emit('tests-plan.json',tests)
text('trigger-counterexamples.sql',"""-- PLANNED ONLY. NOT RUN. Bind IDs from real HTTP-produced assignments.
-- PREPARE move_member(uuid,uuid) AS
-- UPDATE poms.commission_role_assignment_participant SET assignment_id=$2 WHERE id=$1;
-- Case: $1 frozen A's zero-weight participant; $2 draft B already sum1000000.
-- Expected23514 assignment participant cannot be reparented. After rollback,
-- membership A/B and both totals are byte-equivalent. Also deny draft->draft.
-- Verify frozen INSERT/UPDATE/DELETE and draft deferred exact total independently.
""")

# Complete effective blueprint supersedes v1 as a freeze candidate, preserving
# its old bytes. Current task state comes from Root's newly provided head/G4.
blue.pop('liveDeliveryIndex',None)
blue['schemaVersion']=2
blue['status']='EFFECTIVE-V2-ROOT-FREEZE-CANDIDATE-NOT-G1-PASS'
blue['providedHead']='d5c79b260fc58f78ff9adb4ac9fd69ed5bc838d5'
blue['providedState']={'source':'Root explicit current-state message; no Git/API used here',
 'userFix115':'actualG4/Closed confirmed byRoot; separate from GHI admission','canonicalThreeNew':'registered planned in6.25; none implemented'}
blue['operationMap']=operations
blue['publicContractInputs']={'assembled':'public-contracts.schema.json','index':'dto-index.json','NativeFrozenReference':'native-reference.schemas.json',
 'sourceTypes':'All modern row_version and int4 logical version bounds1..2147483647, missing head0 only. externalSourceVersion textual/UUID untouched.'}
blue['scopeResponseContract']=scope_contract
for support in blue['supportingExistingOperations']:
    if support.get('operationId')=='ContractFinanceController_confirmReceiptRecord':
        support['operationId']='ContractFinanceController_confirmReceipt'
def fix_receipt_id(value):
    if isinstance(value,str): return value.replace('ContractFinanceController_confirmReceiptRecord','ContractFinanceController_confirmReceipt')
    if isinstance(value,list): return [fix_receipt_id(x) for x in value]
    if isinstance(value,dict): return {k:fix_receipt_id(v) for k,v in value.items()}
    return value
blue=fix_receipt_id(blue)
blue['lifecycleContract']['conditionalStageBinding']='Final accepted writes project/ledger completed; final conditional writes project/ledger conditional-completed. ProjectStatus uses existing completed terminal status. Condition closure changes only conditionStatus, never original completionResult/stage. Archive retains true terminal anchor and requires all conditions closed.'
blue['scope']['actions']['first-assignment-anchor']='project:read AND exact CreatorFirstAssignmentOnly; strict minimal DTO, no finance/commission scope'
blue['restatementContract']=restatement_contract
blue['legacyCurrentContract']=legacy
blue['capacityContract']=capacity['moneyContract']
blue['migration']['draft']='migration.sql'
blue['migration']['newTableCount']=19
blue['migration']['capacityChanges']=0
blue['migration']['GUnknownPendingTax']='snapshot/period nullable+knowledge and deferred context consistency'
blue['migration']['participantParent']='assignment_id immutable; DELETE checksOLD, all frozen membership immutable'
blue['ssot']['sourceContext']='source-context.schema.json'
blue['inputPreEffectHash']=INPUT_PRE_EFFECT_HASH
blue['ssot']['sourceBeforeEffect']=INPUT_PRE_EFFECT_HASH
blue['inclusion']['restatementReplacement']='Sealed four-kind permit; '+restatement_contract['atomic']
blue['rootDecisionItems']=[]
blue['effectiveFiles']={'publicDTO':'public-contracts.schema.json','dtoIndex':'dto-index.json','sourceContext':'source-context.schema.json',
 'migration':'migration.sql','ORM':'orm-delta.json','scope':'scope-response-contract.json','restatement':'restatement-contract.json','legacy':'legacy-current-contract.json','tests':'tests-plan.json','interfaces':'interface-targets.json'}
blue['interfaces']=interfaces
for owner in blue['owners']:
    if owner['owner']=='I': owner['paths'] += ['apps/poms-admin/src/app/features/project/project-condition-tasks.ts','apps/poms-admin/src/app/features/project/project-first-owner-assignment.ts']
emit('blueprint.json',blue)

text('integration.md',"""# 联合 G1 effective-v2 冻结候选

**仅输入草案，G1未通过、G2未准入。** 本目录是唯一新的有效拼接候选，原v1与capacity02字节保持原样。Root当前提供HEAD为d5c79b260fc58f78ff9adb4ac9fd69ed5bc838d5；#115已实际G4/Closed，但不代表本业务批次通过。3新canonical已在6.25登记planned。

Root正式manifest入口是`manifest.json`；完整有效机器契约`blueprint.json`；所有32目标和必要supporting DTO及传递依赖已具体拼成`public-contracts.schema.json#/components/schemas`，逐操作位置见`dto-index.json`。完整新forward migration是`migration.sql`（94->95、仍19新表），不是额外第二迁移。Root单写共享TS/DTO/OpenAPI/client/Cargo/http/ORM与关键controllers，G/H/I按原owner表写独立业务模块和UI子件。没有生成产品。

## 独审修复

BG1-01：G snapshot/period pending税额与H同为nullable+knowledge；producer1必须known+非NULL或unknown+NULL，deferred检查与不可变context及paired snapshot一致；producer0原值不回填。ORM精确差异见orm-delta.json。18,2容量不扩，preinsert checked money与422按capacity02纳入。

BG1-02：completion列表现代响应明确full-project/own-condition-only两个scopeKind wrapper，full原有required字段保留；own仅父ID/version/全体conditionStatus及本人任务/本人证据。close也是精确scope分支，只返回本次本人关闭与父聚合，不复制父验收/完成摘要/evidence。ProjectDetail独立full与creator-first-assignment-only最小指派锚点，禁止填空或as-cast。Own task前端独立入口直接调用既有completion列表，不先拿full detail；creator branch只挂指派表单。own evidence限真实任务/关闭绑定并继续附件原guard，不能据project归属扩到父全部证据。backend GET数量0变化。独审未发现通用L summary HTTP GET，不把这个旧疑问当已证漏洞。

BG1-03：participant.assignment_id一律不可更新；DELETE查OLD、INSERT查NEW、同parent UPDATE查真实父，冻结集合任何变化拒绝。真实冻结A的零权重成员不能挪到draftB，即使两边权重总和仍1也23514；反例计划见trigger-counterexamples.sql。

## F真纠正闭环与旧事实

同一existing restatement现在显式支持labor/allocation/stage-reclassification/tax-treatment-replacement四种封闭permit。stage调用真实F evidence/attribution/store生产链，consumed included成本保持included/金额/原确认，只CAS阶段事实；共享来源必须联动真实整批allocation来源刷新与全部受影响live/period重述。tax调用真实F负责评估/证据/replace，不把taxImpactAmount当G直接aggregate覆盖或自动成本。所有受影响项目权限/敏感写/完整锁与重述均须满足，任一失败全outerTX回滚。其他无真实producer的nonlabor付款/发票/普通回款冲正明确409阻断。精确nested F DTO、CAS、来源链、期末窗口与冲突目标规则见restatement-contract.json/public-contracts。

currentRoleAssignment无包200/null。R5create及archive replace/void旧Native默认201/声明200差异保留legacy，现代Rust目标200；不能全局HttpCode200改变参考。baseline/period/current assignment都先跨producer查询旧current事实，不能因新head空当第一次。此批无legacy baseline/period admission：旧baseline409 admission-required、旧period409 reconciliation-required；不静默supersede，不让23505代替语义。

所有现代row/logical int4版本绑定1..2147483647，只有缺head可0，字符串/UUID externalSourceVersion不加数字约束。原始weight token到百万整数规则不变。

## 验证与后续

verify.py只读核字节、完整schema引用/合法性、32操作/3planned、新SQL结构、严格scope DTO样例、17现代write输入、版本界限、四纠正类型与v1/capacity02保留。真实SQL/HTTP/浏览器/故障并发验收在tests-plan.json，全部planned-not-run。Root须正式canonical/baseline/manifest一致并经独立G1后方可G2。
""")

# Observe all previously relevant source bytes afresh; old source manifests are
# provenance, not a claim that their old mutable metadata pins remain current.
for item in load('tools/rust-r4ghi/joint-g1/sources.json')['entries']:
    raw(item['path'])
for item in load('tools/rust-r4ghi/joint-g1/capacity-delta02/sources.json')['entries']:
    raw(item['path'])
for path in [
 'tools/rust-r4ghi/independent/business-g1/prereview01/review.md',
 'tools/rust-r4ghi/independent/business-g1/prereview01/review.json',
 'tools/rust-r4ghi/independent/business-g1/prereview01/supplement01.md',
 'apps/poms-api-rust/src/project_cost_governance/mod.rs',
 'apps/poms-api-rust/src/project_cost_governance/service.rs',
 'apps/poms-api-rust/src/project_cost_governance/evidence.rs',
 'apps/poms-api-rust/src/project_cost_governance/store.rs',
 'apps/poms-api/src/app/features/commission/commission.controller.ts',
 'apps/poms-api/src/app/features/project/project.controller.ts']:
    raw(path)
acceptance_plan='docs/design/rust-r4ghi/acceptance-plan01.json'
if (ROOT/acceptance_plan).is_file(): raw(acceptance_plan)
preserved=[]
for path in sorted(V1.rglob('*')):
    if path.is_file() and OUT not in path.parents:
        content=path.read_bytes()
        preserved.append({'path':path.relative_to(ROOT).as_posix(),'bytes':len(content),'sha256':hashlib.sha256(content).hexdigest()})
emit('preserved-inputs.json',{'rule':'all sealed v1/capacity files untouched; excludes this effective-v2','entries':preserved})
emit('sources.json',{'kind':'effective-v2-current-observed-source-byte-manifest','providedHead':blue['providedHead'],
 'GitVerifiedHere':False,'entries':[{'path':rel,'bytes':len((ROOT/rel).read_bytes()),'sha256':hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()} for rel in sorted(SOURCES)]})
artifacts=[]
for path in sorted(OUT.iterdir()):
    if path.is_file() and path.name!='manifest.json':
        content=path.read_bytes()
        artifacts.append({'path':path.name,'bytes':len(content),'sha256':hashlib.sha256(content).hexdigest()})
emit('manifest.json',{'kind':'effective-v2-root-freeze-input-manifest','status':'CANDIDATE-NOT-G1-PASS','excludesSelf':True,
 'entryPoints':['blueprint.json','public-contracts.schema.json','dto-index.json','source-context.schema.json','migration.sql'],
 'entries':artifacts})
print(json.dumps({'status':blue['status'],'operations':len(operations),'publicSchemas':len(selected),'newTables':19,'sourceFiles':len(SOURCES),'RootDecisionItems':[]},ensure_ascii=False))
