from pathlib import Path
HERE=Path(__file__).resolve().parent
rel='apps/poms-admin/src/app/features/project/project-governance-api.ts'
p=HERE/'proposed'/rel;s=p.read_text(encoding='utf8')
header="import * as ClientValue from './project-governance-client-values';\n"
assert header not in s
s=header+s
for key,variable,function in [
('activateOperatingBaselinePackageRequest','command.request','activate'),('createProjectOperatingSnapshotRequest','command.request','snapshot'),('createPeriodClosingSnapshotRequest','command.request','period'),('createOperatingRestatementRequest','command.request','restatement'),
('reviewOperatingSignalEvaluationRequest','request','signalReview'),('reviewCommissionGateBindingRequest','request','gateReview'),('confirmReceiptRecordRequest','request','receipt'),
('startProjectExecutionRequest','body','execution'),('startProjectAcceptanceRequest','body','acceptanceAdmission'),('createAcceptanceRecordRequest','body','acceptance'),('createProjectCompletionRecordRequest','body','completion'),
('createProjectArchiveRecordRequest','body','archive'),('replaceProjectArchiveRecordRequest','body','replaceArchive'),('voidProjectArchiveRecordRequest','body','voidArchive'),('closeProjectCompletionConditionRequest','body','closeCondition'),
('createCommissionRoleAssignmentRequest','request','createRole'),('freezeCommissionRoleAssignmentRequest','request','freezeRole')]:
    before=f'{key}: {variable}';after=f'{key}: ClientValue.{function}({variable})'
    assert s.count(before)==1,(before,s.count(before));s=s.replace(before,after)
for name in ['StartExecution','StartAcceptance']:
    before=f'projectController{name}({{ projectId: id,'
    assert s.count(before)==1;s=s.replace(before,f'projectController{name}({{ id,')
p.write_text(s,encoding='utf8',newline='\n')
