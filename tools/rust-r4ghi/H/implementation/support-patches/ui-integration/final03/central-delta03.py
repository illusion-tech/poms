from pathlib import Path
HERE=Path(__file__).resolve().parent
ROOT=Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
def once(s,a,b):
    assert s.count(a)==1,(a,s.count(a))
    return s.replace(a,b)
def write(rel,s):
    p=HERE/'proposed'/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s,encoding='utf8',newline='\n')

rel='libs/admin/data-access/src/lib/project/project.store.ts';s=(ROOT/rel).read_text(encoding='utf8')
s=once(s,'    ProjectDetailView,','    FullProjectDetailView,')
s=once(s,'signal<ProjectDetailView | null>(null)','signal<FullProjectDetailView | null>(null)')
s=once(s,'    readonly #projectApi = inject(ProjectApi);','    readonly #projectApi = inject(ProjectApi);\n    #projectLoadEpoch = 0;')
s=once(s,'    async loadProject(id: string) {\n        this.#loading.set(true);','    async loadProject(id: string) {\n        const epoch = ++this.#projectLoadEpoch;\n        this.#loading.set(true);')
s=once(s,'            if (this.#selectedProject()?.id !== id) {','            if (this.#selectedProject()?.id !== id) {\n                this.#selectedProject.set(null);')
s=once(s,'            this.#selectedProject.set(project);\n            return project;\n        } finally {\n            this.#loading.set(false);\n        }','''            if (epoch !== this.#projectLoadEpoch) throw new Error('项目已变化，请重新读取。');
            if (project.scopeKind !== 'full-project') throw new Error('当前入口只读取完整项目范围，请返回项目责任锚点。');
            this.#selectedProject.set(project);
            return project;
        } catch (error) {
            if (epoch === this.#projectLoadEpoch) this.#selectedProject.set(null);
            throw error;
        } finally {
            if (epoch === this.#projectLoadEpoch) this.#loading.set(false);
        }''')
s=once(s,'        await Promise.all([this.loadProject(projectId), this.loadProjectTimeline(projectId).catch(() => undefined), this.loadProjectArchiveRecords(projectId).catch(() => undefined)]);','        await this.loadProject(projectId);\n        await Promise.all([this.loadProjectTimeline(projectId).catch(() => undefined), this.loadProjectArchiveRecords(projectId).catch(() => undefined)]);')
write(rel,s)

for rel,before,after in [
('apps/poms-admin/src/app/features/project/project-operating-overview.ts',
 "        return overview.allowedActions.includes('reviewOperatingSignalEvaluation') ? '当前需要人工复核' : '当前口径可直接下游使用';",
 "        return overview.currentActionLevel === 'block' ? '当前存在经营阻断' : overview.currentActionLevel === 'review' ? '当前口径需要复核' : '当前为提示；下游使用仍须核对对应阶段门禁';"),
('apps/poms-admin/src/app/features/project/project-variance-risk.ts',
 "        return current.allowedActions.includes('reviewOperatingSignalEvaluation') ? '当前结果仍要求人工复核后再进入下游判断。' : '当前结果可以作为下游判断输入。';",
 "        return current.currentActionLevel === 'block' ? '当前存在阻断，请先处理真实来源。' : current.currentActionLevel === 'review' ? '当前结果需要复核；阶段门禁按服务器当前结论处理。' : '当前为提示；使用前仍须核对数据知识状态和对应阶段门禁。';"),
('apps/poms-admin/src/app/features/commission/project-commission-gate-overview.ts',
 "        return gateOverview.allowedActions.includes('reviewCommissionGateBinding') ? '当前仍需人工复核 gate 结果后再进入发放判断。' : '当前 gate 已具备下游使用条件。';",
 "        return gateOverview.currentActionLevel === 'block' ? '当前存在经营阻断，请处理后重新读取具体阶段门禁。' : gateOverview.currentActionLevel === 'review' ? '当前仍需复核，具体阶段须按各自门禁处理。' : '当前为提示；能否进入后续办理仍由具体阶段门禁和权限决定。';")]:
    s=(ROOT/rel).read_text(encoding='utf8');write(rel,once(s,before,after))

rel='libs/admin/data-access/src/lib/project/project-workspace.store.ts';s=(ROOT/rel).read_text(encoding='utf8')
s=once(s,"import { firstValueFrom, type Observable } from 'rxjs';", "import { firstValueFrom } from 'rxjs';")
s=once(s,'}) as unknown as Observable<CommissionRoleAssignmentSummary | null>','})')
s=once(s,'            this.#businessOutcomeOverview.set(overview);\n            this.#unifiedAccounting.set(accounting);',"            if ('view' in accounting) throw new Error('正式经营视图尚未返回，请进入经营编制核对来源。');\n            this.#businessOutcomeOverview.set(overview);\n            this.#unifiedAccounting.set(accounting);")
write(rel,s)

rel='apps/poms-admin/src/app/features/project/project-detail.ts';s=(ROOT/rel).read_text(encoding='utf8')
s=once(s,'    type ProjectDetailView,\n','')
s="import { CreateProjectArchiveRecordRequestInputVersionEnum, ReplaceProjectArchiveRecordRequestInputVersionEnum, VoidProjectArchiveRecordRequestInputVersionEnum, type FullProjectDetailView as ProjectDetailView } from '@poms/shared-api-client';\n"+s
s=once(s,"            void this.#projectStore.loadProject(id);\n            void this.#projectStore.loadProjectTimeline(id).catch(() => undefined);\n            void this.#projectStore.loadProjectArchiveRecords(id).catch(() => undefined);",'''            void this.#projectStore.loadProject(id).then(async () => {
                await Promise.all([this.#projectStore.loadProjectTimeline(id).catch(() => undefined), this.#projectStore.loadProjectArchiveRecords(id).catch(() => undefined)]);
            }).catch(() => undefined);''')
s=once(s,'            await this.#projectStore.createProjectArchiveRecord(project.id, {','            await this.#projectStore.createProjectArchiveRecord(project.id, {\n                inputVersion: CreateProjectArchiveRecordRequestInputVersionEnum.ServerDerivedV1,\n                expectedProjectVersion: project.projectRowVersion,')
s=once(s,'            await this.#projectStore.replaceProjectArchiveRecord(record.id, {','            await this.#projectStore.replaceProjectArchiveRecord(record.id, {\n                inputVersion: ReplaceProjectArchiveRecordRequestInputVersionEnum.ServerDerivedV1,')
s=once(s,'            await this.#projectStore.voidProjectArchiveRecord(record.id, {','            await this.#projectStore.voidProjectArchiveRecord(record.id, {\n                inputVersion: VoidProjectArchiveRecordRequestInputVersionEnum.ServerDerivedV1,')
write(rel,s)

rel='apps/poms-admin/src/app/features/project/project-presentation.ts';s=(ROOT/rel).read_text(encoding='utf8')
s=once(s,'    OperatingSnapshotActionLevel,\n','')
s=once(s,'const ACTION_LEVEL_LABELS = OperatingSnapshotActionLevelLabel as Record<OperatingSnapshotActionLevel, string>;','const ACTION_LEVEL_LABELS = OperatingSnapshotActionLevelLabel;')
s=once(s,'export type ActionLevelCode = OperatingSnapshotActionLevel;','export type ActionLevelCode = keyof typeof ACTION_LEVEL_LABELS;')
s=once(s,'const ACTION_LEVEL_SEVERITIES = OperatingSnapshotActionLevelSeverity as Record<ActionLevelCode, UiTagSeverityValue>;','const ACTION_LEVEL_SEVERITIES = OperatingSnapshotActionLevelSeverity;')
write(rel,s)

for rel in ['apps/poms-admin/src/app/features/project/project-workspace-shell.ts','apps/poms-admin/src/app/features/commission/project-commission-shell.ts']:
    s=(ROOT/rel).read_text(encoding='utf8')
    s=once(s,'            void this.#projectStore.loadProject(projectId);\n            void this.#workspaceStore.loadGuidance(projectId).catch(() => undefined);',"            void this.#projectStore.loadProject(projectId).then(() => this.#workspaceStore.loadGuidance(projectId)).catch(() => {\n                void this.#router.navigate(['/projects', projectId]);\n            });")
    s=once(s,'        if (projectId) {\n            void this.#workspaceStore.loadGuidance(projectId).catch(() => undefined);','        if (projectId && this.project()?.id === projectId) {\n            void this.#workspaceStore.loadGuidance(projectId).catch(() => undefined);')
    write(rel,s)

rel='apps/poms-admin/src/app/features/project/project-handover-actions.ts';s=(ROOT/rel).read_text(encoding='utf8')
s=once(s,"            if (sales && !sales.userId) sales.userId = project.ownerUserId ?? '';", "            if (project.scopeKind === 'full-project' && sales && !sales.userId) sales.userId = project.ownerUserId ?? '';")
write(rel,s)
