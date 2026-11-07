from pathlib import Path
root=Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
here=Path(__file__).resolve().parent
rel=Path('apps/poms-admin/src/app/features/project/project-lifecycle-authoring.ts')
s=(root/rel).read_text(encoding='utf8')
s=s.replace('export interface LifecycleAuthoringContext {', '''/** Upload selection carries real R2 summary fields; the server owns the frozen row version. */
export type LifecycleEvidenceSelection = Pick<FrozenLifecycleEvidence, 'attachmentLinkId' | 'attachmentId' | 'checksumSha256' | 'fileName'>;

export interface LifecycleAuthoringContext {''')
s=s.replace('Promise<FrozenLifecycleEvidence>', 'Promise<LifecycleEvidenceSelection>')
s=s.replace('FrozenLifecycleEvidence[]', 'LifecycleEvidenceSelection[]')
s=s.replace('evidence: FrozenLifecycleEvidence', 'evidence: LifecycleEvidenceSelection')
s=s.replace('    uploadEvidence(projectId: string, file: File): Promise<LifecycleEvidenceSelection>;', '''    uploadEvidence(projectId: string, file: File): Promise<LifecycleEvidenceSelection>;
    uploadConditionEvidence(projectId: string, completionRecordId: string, conditionId: string, file: File): Promise<LifecycleEvidenceSelection>;''')
s=s.replace('· 版本 {{ file.attachmentRowVersion }}','· 已上传，提交时由服务器固定证据版本')
s=s.replace('    readonly ownTasksOnly = input(false);','''    readonly ownTasksOnly = input(false);
    /** Enable only when a real condition-scoped upload adapter is available. */
    readonly canUploadOwnConditionEvidence = input(false);''')
s=s.replace('    async uploadClosure(event: Event, conditionId: string): Promise<void> {','''    async uploadClosure(event: Event, task: TaskRow): Promise<void> {
        const conditionId = task.conditionId;
        if (this.ownTasksOnly() && !this.canUploadOwnConditionEvidence()) {
            this.error.set('当前本人任务尚未接通条件范围的新证据上传，请等待服务支持后重新打开。');
            return;
        }''')
s=s.replace('''                            <label>上传本人闭合证据 <input type="file" [disabled]="busy()" (change)="uploadClosure($event, task.conditionId)" /></label>''','''                            @if (!ownTasksOnly() || canUploadOwnConditionEvidence()) {
                                <label>上传本人闭合证据 <input type="file" [disabled]="busy()" (change)="uploadClosure($event, task)" /></label>
                            }''')
s=s.replace("const file = (event.target as HTMLInputElement).files?.[0];", "const input = event.target;\n        const file = input instanceof HTMLInputElement ? input.files?.[0] : undefined;")
start=s.index('    async uploadClosure(')
s=s[:start]+s[start:].replace('this.api().uploadEvidence(projectId, file)', 'this.api().uploadConditionEvidence(projectId, task.completionRecordId, task.conditionId, file)',1)
target=here/'proposed'/rel;target.parent.mkdir(parents=True,exist_ok=True);target.write_text(s,encoding='utf8',newline='\n')

# Root-owned R2 helper receives the exact existing create-session purpose field.
rel=Path('libs/admin/data-access/src/lib/attachment/attachment.store.ts')
s=(root/rel).read_text(encoding='utf8')
old='export interface UploadAttachmentInput extends AttachmentTargetRef {'
assert s.count(old)==1
s=s.replace(old,old+"\n    completionConditionContext?: CreateAttachmentUploadSessionRequest['completionConditionContext'];")
old='                    operationType: AttachmentUploadSessionOperationType.CreateAttachment,'
assert s.count(old)==1
s=s.replace(old,old+'\n                    ...(input.completionConditionContext ? { completionConditionContext: input.completionConditionContext } : {}),')
target=here/'proposed'/rel;target.parent.mkdir(parents=True,exist_ok=True);target.write_text(s,encoding='utf8',newline='\n')
