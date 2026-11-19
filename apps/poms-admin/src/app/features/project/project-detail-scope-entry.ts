import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AttachmentStore } from '@poms/admin-data-access';
import { ProjectStageLabel, type ProjectDetailView } from '@poms/shared-contracts';
import { ProjectCreatorFirstAssignment } from './project-creator-first-assignment';
import { ProjectDetail } from './project-detail';
import { ProjectGovernanceApi } from './project-governance-api';

/** Keeps the existing complete project page behind a real full-project anchor. */
@Component({
    selector: 'app-project-detail-scope-entry', standalone: true,
    imports: [RouterLink, ProjectCreatorFirstAssignment, ProjectDetail], providers: [AttachmentStore, ProjectGovernanceApi],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (loading()) { <p role="status">正在读取项目责任范围…</p> }
        @if (error()) { <p role="alert">{{ error() }}</p> }
        @if (anchor(); as detail) {
            @switch (detail.scopeKind) {
                @case ('full-project') {
                    <nav class="mb-4 flex flex-wrap gap-3" aria-label="项目办理入口">
                        <a class="rounded border px-3 py-2" [routerLink]="['/projects', detail.id, 'governance']">经营、角色与交付办理</a>
                        <a class="rounded border px-3 py-2" [routerLink]="['/projects', detail.id, 'condition-tasks']">本人的完成条件</a>
                    </nav>
                    <app-project-detail />
                }
                @case ('creator-first-assignment-only') { <app-project-creator-first-assignment [anchor]="detail" (changed)="reload()" /> }
                @case ('legacy-owner-anchor-only') {
                    <section class="grid gap-3 rounded border p-4" aria-label="历史项目基础锚点">
                        <h1 class="text-2xl font-semibold">{{ detail.projectNo }} · {{ detail.projectName }}</h1>
                        <p>{{ stageLabel[detail.currentStage] }} · 版本 {{ detail.rowVersion }}</p>
                        <p>{{ detail.explanation }}</p>
                    </section>
                }
            }
        }
        <button type="button" class="my-3 rounded border px-3 py-2" [disabled]="loading()" (click)="reload()">重新读取责任范围</button>
    `
})
export class ProjectDetailScopeEntry {
    private readonly route = inject(ActivatedRoute);
    private readonly api = inject(ProjectGovernanceApi);
    private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
    readonly anchor = signal<ProjectDetailView | null>(null);
    readonly stageLabel = ProjectStageLabel;
    readonly loading = signal(false);
    readonly error = signal('');
    private epoch = 0;
    constructor() { effect(() => { const id = this.params().get('id'); void this.load(id); }); }
    reload() { void this.load(this.params().get('id')); }
    private async load(id: string | null) {
        const epoch = ++this.epoch;
        this.anchor.set(null); this.loading.set(true); this.error.set('');
        try {
            if (!id) throw new Error('缺少实际项目。');
            const anchor = await this.api.loadAnchor(id);
            if (epoch === this.epoch) this.anchor.set(anchor);
        } catch { if (epoch === this.epoch) this.error.set('无法读取项目责任范围，请从项目或本人任务重新打开。'); }
        finally { if (epoch === this.epoch) this.loading.set(false); }
    }
}
