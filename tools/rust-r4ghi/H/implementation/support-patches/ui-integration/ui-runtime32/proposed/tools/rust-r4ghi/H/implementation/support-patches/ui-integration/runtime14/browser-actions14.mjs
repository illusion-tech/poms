import assert from 'node:assert/strict';
import { ownEvidenceFile } from './write-policy14.mjs';
const origin = 'http://127.0.0.1:44551';
const response = (page, method, predicate) => { const pending = page.waitForResponse(value => value.request().method() === method && predicate(new URL(value.url()).pathname)); void pending.catch(() => {}); return pending; };
const body = async value => { const parsed = await value.json(); return parsed?.data ?? parsed; };

/** UI inputs/events only. Never sends a substitute API request or edits a response/DOM. */
export async function performWriteAction14({ page, expect, test, primaryData }) {
  const action = test.writeAction; assert(action && action.kind === test.kind);
  if (test.kind === 'creator') {
    const component = page.locator('app-project-creator-first-assignment');
    await component.getByRole('button', { name: '读取可指派人员和组织', exact: true }).click();
    const selects = component.locator('select'); await selects.nth(0).selectOption(action.targetOwnerUserId); await selects.nth(1).selectOption(action.targetOwnerOrgId);
    await component.locator('textarea').fill(action.reason);
    const posted = response(page, 'POST', pathname => pathname === `/api/projects/${test.projectId}:reassignOwner`);
    await component.getByRole('button', { name: '确认首次指派', exact: true }).click();
    const actual = await posted; assert.equal(actual.status(), 200); const result = await body(actual); assert.equal(result.targetId, test.projectId); assert.equal(result.newOwnerUserId, action.targetOwnerUserId); assert.equal(result.newOwnerOrgId, action.targetOwnerOrgId);
    return { kind: 'creator-first-assignment-from-actual-UI', operationId: 'ProjectController_reassignOwner', actualStatus: actual.status(), actualTargetId: result.targetId, actualRecordId: result.projectOwnerReassignmentRecordId };
  }
  if (test.kind === 'execution-owner') {
    const component = page.locator('app-project-lifecycle-authoring'); await component.locator('textarea[name="execution-reason"]').fill(action.reason);
    const posted = response(page, 'POST', pathname => pathname === `/api/projects/${test.projectId}:startExecution`);
    await component.getByRole('button', { name: '核对当前移交与角色冻结并进入执行', exact: true }).click();
    const actual = await posted; assert.equal(actual.status(), 200); const result = await body(actual); assert.equal(result.businessStatusAfter, 'execution'); assert.equal(result.enteredBy, test.actor.id);
    return { kind: 'EO-start-execution-from-actual-UI', operationId: 'ProjectController_startExecution', actualStatus: actual.status(), actualStageRecordId: result.projectStageRecordId };
  }
  assert.equal(test.kind, 'own-condition'); assert.equal(primaryData.scopeKind, 'own-condition-only');
  const parent = primaryData.items.find(value => value.completionRecordId === action.completionRecordId); assert(parent);
  const pending = parent.ownTasks.filter(task => task.status === 'pending' && task.responsibleUserId === test.actor.id); assert.equal(pending.length, 1); const task = pending[0];
  const article = page.locator('article').filter({ has: page.getByRole('heading', { name: task.summary, exact: true }) });
  const file = ownEvidenceFile({ projectId: test.projectId, completionRecordId: parent.completionRecordId, conditionId: task.conditionId, actorId: test.actor.id, evidenceText: action.evidenceText });
  const completed = response(page, 'POST', pathname => /^\/api\/attachment-upload-sessions\/[0-9a-f-]+:complete$/i.test(pathname));
  await article.locator('input[type="file"]').setInputFiles({ name: file.name, mimeType: file.mimeType, buffer: file.bytes });
  const actualUpload = await completed; assert.equal(actualUpload.status(), 200); const attachment = await body(actualUpload); assert.equal(attachment.checksumSha256, file.checksumSha256); assert.equal(attachment.sizeBytes, file.sizeBytes);
  await expect(article).toContainText(file.name); await article.getByLabel('本人闭合说明', { exact: true }).fill(action.closureSummary);
  const reuse = article.getByLabel('同时提交本条件原有证据', { exact: true }); await reuse.uncheck();
  const closed = response(page, 'POST', pathname => pathname === `/api/project-completion-records/${parent.completionRecordId}/conditions/${task.conditionId}:close`);
  await article.getByRole('button', { name: '以本人身份闭合此条件', exact: true }).click();
  const actualClose = await closed; assert.equal(actualClose.status(), 200); const result = await body(actualClose); assert.equal(result.scopeKind, 'own-condition-only'); assert.equal(result.conditionId, task.conditionId); assert.equal(result.closedBy, test.actor.id); assert.equal(result.conditionStatus, 'closed');
  await expect(article).toContainText('已闭合');
  return { kind: 'own-purpose-upload-and-close-from-actual-UI', operationId: 'ProjectCompletionRecordController_closeCompletionCondition', actualStatus: actualClose.status(), parentId: parent.completionRecordId, childId: task.conditionId, actualClosureId: result.closureRecordId, actualUploadedAttachmentId: attachment.id, fileSHA256: file.checksumSha256 };
}
