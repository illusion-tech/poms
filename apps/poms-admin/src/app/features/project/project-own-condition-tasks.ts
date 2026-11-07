import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { AttachmentStore, AuthStore } from '@poms/admin-data-access';
import { ProjectGovernanceApi } from './project-governance-api';
import { ProjectLifecycleAuthoring } from './project-lifecycle-authoring';

/** Standalone route: no workspace store, project detail, resolver or finance request. */
@Component({
    selector: 'app-project-own-condition-tasks', standalone: true, imports: [ProjectLifecycleAuthoring],
    providers: [AttachmentStore, ProjectGovernanceApi], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <main class="mx-auto grid max-w-5xl gap-4 p-4">
            <h1 class="text-2xl font-semibold">我的项目完成条件</h1>
            <p>先读取本人的条件任务。父记录只用于核对版本和全体条件状态。</p>
            @if (projectId(); as id) {
                <app-project-lifecycle-authoring [projectId]="id" [api]="lifecycleApi()" [ownTasksOnly]="true"
                    [actorUserId]="actorId()" [canCloseOwnConditions]="canClose()" [canUploadOwnConditionEvidence]="true" />
                <p class="text-sm">请在对应条件中上传闭合证明并提交说明。任务证据按本人责任范围读取。</p>
            } @else { <p role="alert">路由中没有实际项目，请从本人任务重新打开。</p> }
        </main>
    `
})
export class ProjectOwnConditionTasks {
    private readonly route = inject(ActivatedRoute);
    private readonly auth = inject(AuthStore);
    private readonly api = inject(ProjectGovernanceApi);
    private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
    readonly projectId = computed(() => this.params().get('id') ?? '');
    readonly actorId = computed(() => this.auth.currentUser()?.id ?? null);
    readonly canClose = computed(() => this.auth.hasAnyPermission(['project:write']));
    readonly lifecycleApi = computed(() => this.api.lifecycleApi(this.projectId(), true, this.actorId()));
}
