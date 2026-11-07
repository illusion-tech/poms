import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { disabled, form, FormField, maxLength, required } from '@angular/forms/signals';
import { AuthStore, PlatformStore } from '@poms/admin-data-access';
import type { CreatorFirstAssignmentAnchorView } from '@poms/shared-contracts';
import { ProjectGovernanceApi } from './project-governance-api';

@Component({
    selector: 'app-project-creator-first-assignment', standalone: true, imports: [FormField], providers: [PlatformStore],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="grid gap-4 rounded-xl border border-surface p-4" aria-label="首次项目主责指派">
            <h2 class="text-lg font-semibold">首次指派项目主责</h2>
            <p>项目 {{ anchor().projectNo }} · 版本 {{ anchor().projectRowVersion }}。创建者入口只提供本次首次指派。</p>
            @if (error()) { <p role="alert">{{ error() }}</p> }
            @if (canAssign()) {
                <button type="button" class="justify-self-start rounded border px-3 py-2" [disabled]="busy()" (click)="loadPeople()">读取可指派人员和组织</button>
                @if (referencesLoaded()) {
                    <form class="grid gap-4" (submit)="assign($event)">
                        <label>首次主责人
                            <select class="block w-full rounded border p-2" [formField]="assignmentForm.ownerUserId">
                                <option value="">请选择真实在职人员</option>
                                @for (user of users(); track user.id) { <option [value]="user.id">{{ user.displayName }}{{ user.primaryOrgUnitName ? ' · ' + user.primaryOrgUnitName : '' }}</option> }
                            </select>
                        </label>
                        <label>主责组织
                            <select class="block w-full rounded border p-2" [formField]="assignmentForm.ownerOrgId">
                                <option value="">请选择有效组织</option>
                                @for (org of organizations(); track org.id) { <option [value]="org.id">{{ org.name }}</option> }
                            </select>
                        </label>
                        <label>指派说明 <textarea rows="3" class="block w-full rounded border p-2" [formField]="assignmentForm.reason"></textarea></label>
                        <button type="submit" class="justify-self-start rounded bg-primary px-4 py-2 text-white" [disabled]="busy() || !assignmentForm().valid()">确认首次指派</button>
                    </form>
                }
            } @else { <p>当前锚点未授权首次指派，请重新读取责任范围。</p> }
        </section>
    `
})
export class ProjectCreatorFirstAssignment {
    readonly anchor = input.required<CreatorFirstAssignmentAnchorView>();
    readonly changed = output<void>();
    private readonly platform = inject(PlatformStore);
    private readonly auth = inject(AuthStore);
    private readonly api = inject(ProjectGovernanceApi);
    readonly busy = signal(false);
    readonly error = signal('');
    readonly referencesLoaded = signal(false);
    readonly users = computed(() => this.platform.ownerUsers().filter((user) => user.isActive));
    readonly organizations = computed(() => this.platform.ownerOrgUnits().filter((org) => org.isActive));
    readonly canAssign = computed(() => this.anchor().allowedActions.includes('reassign-owner') && this.auth.hasAnyPermission(['project:write']));
    readonly model = signal({ ownerUserId: '', ownerOrgId: '', reason: '' });
    readonly assignmentForm = form(this.model, (fields) => {
        required(fields.ownerUserId); required(fields.ownerOrgId); required(fields.reason); maxLength(fields.reason, 1000);
        disabled(fields, () => this.busy() || !this.canAssign());
    });
    async loadPeople() {
        if (!this.canAssign() || this.busy()) return;
        this.busy.set(true); this.error.set('');
        try { await this.platform.loadOwnerReferenceData(); this.referencesLoaded.set(true); this.model.update((value) => ({ ...value, ownerOrgId: this.anchor().ownerOrgId })); }
        catch { this.referencesLoaded.set(false); this.error.set('可指派人员和组织读取失败，请重试。'); }
        finally { this.busy.set(false); }
    }
    async assign(event: Event) {
        event.preventDefault();
        if (!this.canAssign() || this.busy() || !this.assignmentForm().valid()) return;
        const anchor = this.anchor(), selection = this.model();
        if (!this.users().some((user) => user.id === selection.ownerUserId) || !this.organizations().some((org) => org.id === selection.ownerOrgId)) { this.error.set('请从当前有效人员和组织选择。'); return; }
        this.busy.set(true); this.error.set('');
        try {
            await this.api.reassignFirstOwner(anchor.projectId, { ownerUserId: selection.ownerUserId, ownerOrgId: selection.ownerOrgId, expectedVersion: anchor.projectRowVersion, reason: selection.reason.trim() });
            this.changed.emit();
        } catch { this.referencesLoaded.set(false); this.error.set('首次指派未成功，请重新读取锚点后核对版本和人员。'); }
        finally { this.busy.set(false); }
    }
}
