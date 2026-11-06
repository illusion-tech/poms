"""Read-only effective-v2 checks. No SQL, network, subprocess or product work."""
import hashlib
import json
import re
import sys
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker

OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[3]
def load(name): return json.loads((OUT/name).read_text(encoding='utf-8-sig'))
blue=load('blueprint.json'); public=load('public-contracts.schema.json'); schemas=public['components']['schemas']
checks=[]
def check(name,passed,detail=None): checks.append({'check':name,'passed':bool(passed),'detail':detail})
check('not-a-gate-pass',not blue['gates']['G1Passed'] and not blue['gates']['G2Authorized'])
ops=blue['operationMap']
check('exact32-unique',len(ops)==32 and len({x['operationId'] for x in ops})==32)
check('exact3-new-planned',sum(x['newPublicOperation'] for x in ops)==3 and all(x['observedRows'] and x['inventoryStatus']=='planned' for x in ops if x['newPublicOperation']))
check('current-provided-head-and-userfix-state',blue['providedHead']=='d5c79b260fc58f78ff9adb4ac9fd69ed5bc838d5' and 'liveDeliveryIndex' not in blue)
for filename,base in [('sources.json',ROOT),('preserved-inputs.json',ROOT),('manifest.json',OUT)]:
    bad=[]
    for item in load(filename)['entries']:
        path=(base/item['path']).resolve()
        if base not in path.parents or not path.is_file(): bad.append(item['path']); continue
        content=path.read_bytes()
        if len(content)!=item['bytes'] or hashlib.sha256(content).hexdigest()!=item['sha256']: bad.append(item['path'])
    check(filename+'-byte-pins',not bad,bad)

missing=[]
def refs(value):
    if isinstance(value,list):
        for item in value: refs(item)
    elif isinstance(value,dict):
        pointer=value.get('$ref','')
        if pointer.startswith('#/components/schemas/') and pointer.rsplit('/',1)[-1] not in schemas: missing.append(pointer)
        for item in value.values(): refs(item)
refs(public)
check('all-concrete-public-reference-closure',not missing,missing)
invalid=[]
for name,shape in schemas.items():
    try: Draft202012Validator.check_schema(shape)
    except Exception as error: invalid.append({'schema':name,'error':str(error)[:300]})
check('all-public-schema-definitions-valid2020-12',not invalid,invalid)
try:
    Draft202012Validator.check_schema(load('source-context.schema.json'))
    check('context-schema-valid',True)
except Exception as error: check('context-schema-valid',False,str(error))
context=load('source-context.schema.json')
check('single-SSOT-input-hash-whitelist-deep-equality',blue['inputPreEffectHash']==blue['ssot']['sourceBeforeEffect']==context['x-preEffectInputHashWhitelist'] and 'affectedProjects' in blue['inputPreEffectHash']['fields'])
check('all32-DTO-entrypoints-resolve',all(x['responseDto'] in schemas and (not x['requestDto'] or x['requestDto'] in schemas) for x in ops))
check('all16-modern-write-tags',sum(x['method']=='POST' for x in ops)==16 and all('inputVersion' in schemas[x['requestDto']]['required'] and schemas[x['requestDto']]['properties']['inputVersion']['const']=='server-derived-v1' for x in ops if x['method']=='POST'))
check('C-real-operation-id',any(x.get('operationId')=='ContractFinanceController_confirmReceipt' for x in blue['supportingExistingOperations']) and not any(x.get('operationId')=='ContractFinanceController_confirmReceiptRecord' for x in blue['supportingExistingOperations']))
native=load('native-reference.schemas.json')
live=json.loads((ROOT/'libs/shared/api-spec/openapi.json').read_text(encoding='utf-8-sig'))
check('native-exact-component-bytes-as-objects',all(live['components']['schemas'].get(k)==v for k,v in native['components']['schemas'].items()))
check('native-C-confirm-reference-present',any(x['operationId']=='ContractFinanceController_confirmReceipt' for x in native['operations']))

def valid(name,value):
    root={'$ref':'#/components/schemas/'+name,'components':public['components']}
    return Draft202012Validator(root,format_checker=FormatChecker()).is_valid(value)
u='11111111-1111-4111-8111-111111111111'; h='a'*64; at='2026-11-06T00:00:00Z'
evidence={'attachmentLinkId':u,'attachmentId':u,'attachmentRowVersion':1,'checksumSha256':h,'fileName':'own.txt'}
task={'conditionId':u,'conditionRowVersion':1,'summary':'本人事项','responsibleUserId':u,'dueAt':at,'status':'pending','evidenceRefs':[evidence],'closure':None}
parent={'completionRecordId':u,'completionRowVersion':1,'conditionStatus':'pending','ownTasks':[task]}
narrow={'scopeKind':'own-condition-only','projectId':u,'items':[parent]}
check('own-task-list-exact-safe-example',valid('ProjectCompletionRecordList',narrow))
leaked=json.loads(json.dumps(narrow)); leaked['items'][0]['acceptanceRecordId']=u
check('own-task-list-rejects-parent-acceptance-leak',not valid('ProjectCompletionRecordList',leaked))
leaked=json.loads(json.dumps(narrow)); leaked['items'][0]['evidenceRefs']=[evidence]
check('own-task-list-rejects-parent-evidence-leak',not valid('ProjectCompletionRecordList',leaked))
closed={'scopeKind':'own-condition-only','targetId':u,'conditionId':u,'conditionStatus':'closed','completionConditionStatus':'pending',
 'completionRowVersion':2,'conditionRowVersion':2,'closureRecordId':u,'closedAt':at,'closedBy':u,'sourcePayloadHash':h,'closureEvidenceRefs':[evidence]}
check('own-close-safe-example-with-other-global-pending',valid('CloseProjectCompletionConditionResult',closed))
leaked={**closed,'completionSummary':'not allowed'}
check('own-close-rejects-parent-summary-leak',not valid('CloseProjectCompletionConditionResult',leaked))
anchor={'scopeKind':'creator-first-assignment-only','projectId':u,'projectNo':'P001','projectRowVersion':1,'ownerOrgId':u,'ownerUserId':None,
 'creatorUserId':u,'ownershipOriginRowVersion':1,'allowedActions':['reassign-owner']}
check('creator-anchor-minimal-valid',valid('ProjectDetailView',anchor))
check('creator-anchor-rejects-full-contract-detail',not valid('ProjectDetailView',{**anchor,'currentContractSummary':{}}))
check('current-role-none-is200-null',valid('CurrentCommissionRoleAssignmentResponse',None) and next(x for x in ops if x['operationId']=='CommissionController_getCurrentRoleAssignment')['nullableResponse'])
status_ops=[x for x in ops if x['operationId'] in {'CommissionController_createRoleAssignment','ProjectArchiveRecordController_replaceProjectArchiveRecord','ProjectArchiveRecordController_voidProjectArchiveRecord'}]
check('three-Native201-modern200-differences-explicit',len(status_ops)==3 and all(x['legacyNativeSuccessStatus']==201 and x['successStatus']==200 for x in status_ops))
check('conditional-completed-shared-stage-and-archive-target','conditional-completed' in schemas['ProjectStage']['enum'] and 'conditional-completed' in schemas['ProjectArchiveRecordSummary']['properties']['archiveAnchorStage']['enum'])
check('modern-int4-overflow-example-rejected',valid('CreatorFirstAssignmentAnchorView',{**anchor,'projectRowVersion':2147483647}) and not valid('CreatorFirstAssignmentAnchorView',{**anchor,'projectRowVersion':2147483648}))
check('ExpectedRef-int4-bound',schemas['ExpectedRef']['properties']['expectedVersion']['maximum']==2147483647)
rest=load('restatement-contract.json')
check('all-four-real-correction-kinds',set(rest['supportedKinds'])=={'labor-replacement','allocation-batch-replacement','stage-reclassification','tax-treatment-replacement'})
check('stage-tax-arrays-required-in-existing-restatement',{'stageCorrections','taxCorrections'}<=set(schemas['CreateOperatingRestatementRequest']['required']))
check('nested-stage-tax-CAS-required-int4',all('expectedVersion' in schemas[n]['required'] and schemas[n]['properties']['expectedVersion']=={'type':'integer','minimum':1,'maximum':2147483647} for n in ['RestatementStageProducerRequest','RestatementTaxProducerRequest']))
scope=load('scope-response-contract.json')
check('own-task-frontend-never-needs-full-detail-first','directly' in scope['frontend']['ownTasks']['firstRequest'] and scope['backendGetDelta']==0)
interfaces=load('interface-targets.json')
check('G-public-shared-interface-fields-exact',{'OperatingCollectPlan','OperatingCollection','OperatingBusinessWindow','OperatingGeneratedIds'}<=set(interfaces['structs']) and {'CollectLockMode','OperatingPreparationIntent','OperatingCollectInput'}<=set(interfaces['enums']))
check('private-transaction-token-not-request-id','OuterTxToken' in interfaces['scalarTypes'] and 'outer_tx_token' in interfaces['scalarTypes']['VerifiedOperatingAccessSet'] and 'transaction_request_id' not in interfaces['scalarTypes']['VerifiedOperatingAccessSet'])
sql=(OUT/'migration.sql').read_text(encoding='utf-8')
check('full19-table-migration',len(re.findall(r'(?i)CREATE TABLE poms\.',sql))==19)
check('G-pending-tax-both-nullable-knowledge',all(f'ALTER TABLE poms.{table}\n ALTER COLUMN tax_impact_pending_amount DROP NOT NULL' in sql for table in ['project_operating_snapshot','period_closing_snapshot']) and 'jghi_operating_pending_tax_guard' in sql)
guard=re.search(r'CREATE FUNCTION poms\.jghi_assignment_participant_guard\(\).*?END \$\$;',sql,re.S)[0]
check('participant-reparent-unconditionally-denied',"NEW.assignment_id IS DISTINCT FROM OLD.assignment_id" in guard and 'COALESCE' not in guard and 'parent_id:=OLD.assignment_id' in guard)
check('terminal-stage-result-matches-completion','jghi_terminal_stage_result_guard' in sql and "'conditional-completed'" in sql and 'chk_project_current_stage' in sql)
check('capacity-no-money-column-widening',not re.search(r'(?i)TYPE\s+(?:numeric|decimal)\(20,4\)',sql) and blue['capacityContract']['maximumCents']=='999999999999999999')
legacy=load('legacy-current-contract.json')
check('legacy-current-is-fail-closed-not-head-empty','no admission protocol' in legacy['baseline'] and 'across all producers' in legacy['period'])
check('same-policy-artifact-bytes-preserved',(OUT/'policy-definition.json').read_bytes()==(OUT.parent/'policy-definition.json').read_bytes())
failed=[x for x in checks if not x['passed']]
report={'kind':'effective-v2-read-only-structural-verification','status':'PASS' if not failed else 'FAIL','G1Certified':False,'G2Authorized':False,
 'SQLExecuted':False,'HTTPExecuted':False,'productCodeChanged':False,'checks':checks,'errors':failed,
 'observed':{'operations':len(ops),'publicSchemas':len(schemas),'newTables':19},
 'limits':'Checks local schemas, strict safe DTO examples, byte pins and specified SQL structure only. PostgreSQL semantic/transaction tests, real HTTP/UI/security/concurrency acceptance remain planned-not-run.'}
print(json.dumps(report,ensure_ascii=False,indent=2))
sys.exit(0 if not failed else 1)
