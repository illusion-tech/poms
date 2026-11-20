import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type {
    CommissionRoleAssignmentDetailView,
    CommissionRoleAssignmentSummary,
    CreateCommissionRoleAssignmentRequest,
    FreezeCommissionRoleAssignmentRequest,
    FreezeCommissionRoleAssignmentResult,
    ProjectHandoverDetailView
} from '@poms/shared-contracts';
import { SectionCard } from '../../shared/ui/sectioncard';

/** Root binds these methods to the generated client; no local mock/default transport. */
export interface RoleAssignmentAuthoringApi {
    loadCurrent(projectId: string): Promise<CommissionRoleAssignmentSummary | null>;
    loadDetail(assignmentId: string): Promise<CommissionRoleAssignmentDetailView>;
    loadHandover(projectId: string): Promise<ProjectHandoverDetailView>;
    create(projectId: string, request: CreateCommissionRoleAssignmentRequest): Promise<CommissionRoleAssignmentSummary>;
    freeze(assignmentId: string, request: FreezeCommissionRoleAssignmentRequest): Promise<FreezeCommissionRoleAssignmentResult>;
}

interface RoleDraft {
    duty: string;
    weight: string;
    responsibilitySummary: string;
    zeroWeightReason: string;
}

/** Decimal text is checked before Number conversion, including exponent input. */
export function roleWeightUnits(raw: string): number {
    const match = /^(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(raw.trim());
    if (!match) throw new Error('权重须为 0 到 1 的十进制数。');
    let digits = `${match[1]}${match[2] ?? ''}`.replace(/^0+/, '') || '0';
    const exponent = Number(match[3] ?? 0);
    if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 100) throw new Error('权重超出范围。');
    let scale = (match[2]?.length ?? 0) - exponent;
    while (scale > 6 && digits.endsWith('0')) {
        digits = digits.slice(0, -1) || '0';
        scale--;
    }
    if (scale > 6 || digits.length > 20 || scale < -20) throw new Error('权重最多支持六位有效小数。');
    const units = BigInt(digits) * 10n ** BigInt(6 - scale);
    if (units > 1000000n) throw new Error('权重须为 0 到 1 的十进制数。');
    return Number(units);
}

@Component({
    selector: 'app-project-role-assignment-authoring',
    standalone: true,
    imports: [FormsModule, SectionCard],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section-card>
            <ng-template #title>提成角色与职责冻结</ng-template>
            <ng-template #description>按真实移交职责分配权重；冻结后仍须由执行负责人明确进入执行。</ng-template>
            @if (busy()) {
                <p role="status" class="my-2">正在核对角色与移交材料…</p>
            }
            @if (error()) {
                <p role="alert" class="my-2 text-red-600">{{ error() }}</p>
            }
            @if (notice()) {
                <p role="status" class="my-2 text-green-700">{{ notice() }}</p>
            }
            <button type="button" class="my-3 underline" [disabled]="busy()" (click)="reload()">重新读取当前分配</button>
            @if (current(); as assignment) {
                <p>分配版本 {{ assignment.version }} · {{ assignment.status === 'frozen' ? '已冻结' : assignment.status === 'draft' ? '草稿' : '历史版本' }}</p>
                @if (assignment.sourceQualification === 'legacy-unverified') {
                    <p role="alert" class="my-2 text-amber-700">历史角色来源尚未认证，不能用来进入执行。</p>
                }
                @for (person of assignment.participantsJson; track person.userId + ':' + person.roleType) {
                    <div class="my-2 rounded border border-surface-200 p-3">
                        <strong>{{ person.displayName }}</strong> · {{ dutyLabel(person.roleType) }} · 权重 {{ person.weightExact ?? '历史值待核对' }}
                        <p>{{ person.responsibilitySummary ?? '历史版本未固定职责说明' }}</p>
                        @if (person.zeroWeightReason) {
                            <p>零权重原因：{{ person.zeroWeightReason }}</p>
                        }
                    </div>
                }
                @if (assignment.status === 'frozen') {
                    <p class="my-3">本次角色与权重已固定。变更须走受控争议链；当前页面不提供新草稿覆盖冻结的入口。</p>
                }
            } @else if (!busy() && !error()) {
                <p class="my-3">尚无角色分配。先核对真实移交职责，再建立首份分配。</p>
            }
            @if (canCreate() && current()?.status !== 'frozen') {
                <form class="my-4 grid gap-3" (ngSubmit)="saveDraft()">
                    @for (row of rows; track $index; let i = $index) {
                        <fieldset class="grid gap-2 rounded border border-surface-200 p-3">
                            <legend>角色 {{ i + 1 }}</legend>
                            <label
                                >真实职责承担人
                                <select [name]="'duty-' + i" [(ngModel)]="row.duty" required (ngModelChange)="chooseDuty(row)">
                                    <option value="">请选择本次移交职责</option>
                                    @for (duty of duties(); track duty.key) {
                                        <option [value]="duty.key">{{ duty.displayName }} · {{ dutyLabel(duty.roleType) }}</option>
                                    }
                                </select>
                            </label>
                            <label>责任说明 <textarea [name]="'responsibility-' + i" [(ngModel)]="row.responsibilitySummary" required maxlength="2000"></textarea></label>
                            <label>权重（0–1，最多六位有效小数） <input [name]="'weight-' + i" [(ngModel)]="row.weight" inputmode="decimal" required /></label>
                            <label>零权重原因（权重为 0 时必填） <input [name]="'zero-reason-' + i" [(ngModel)]="row.zeroWeightReason" maxlength="1000" /></label>
                            <button type="button" class="justify-self-start underline" [disabled]="busy() || rows.length === 1" (click)="removeRow(i)">移除此角色</button>
                        </fieldset>
                    }
                    <button type="button" class="justify-self-start rounded border px-3 py-2" [disabled]="busy() || duties().length === 0" (click)="addRow()">增加真实职责</button>
                    <p>权重合计必须精确等于 1；同一人可承担多个不同职责。</p>
                    <button type="submit" class="justify-self-start rounded bg-primary px-4 py-2 text-white" [disabled]="busy() || duties().length === 0">保存新的分配版本</button>
                </form>
            }
            @if (current()?.status === 'draft') {
                @if (readyToFreeze()) {
                    <form class="my-4 grid gap-3" (ngSubmit)="freeze()">
                        <p>真实移交与全部本人确认已完成。冻结将引用同一承接基线及回款判断，并生成独立冻结摘要。</p>
                        <label>冻结意见 <input name="freeze-comment" [(ngModel)]="comment" maxlength="1000" /></label>
                        <button type="submit" class="justify-self-start rounded bg-primary px-4 py-2 text-white" [disabled]="busy()">确认本次角色与权重冻结</button>
                    </form>
                } @else {
                    <p class="my-3 text-amber-700">尚缺真实移交确认、当前材料或冻结权限。请先完成本人职责确认并刷新。</p>
                }
            }
        </section-card>
    `,
    styles: `
        label {
            display: grid;
            gap: 0.35rem;
        }
        input,
        select,
        textarea {
            border: 1px solid var(--p-surface-300);
            border-radius: 0.375rem;
            padding: 0.55rem;
            max-width: 100%;
        }
        button {
            min-height: 2.75rem;
        }
    `
})
export class ProjectRoleAssignmentAuthoring {
    readonly projectId = input.required<string>();
    readonly api = input.required<RoleAssignmentAuthoringApi>();
    readonly canCreate = input(false);
    readonly changed = output<void>();
    readonly current = signal<CommissionRoleAssignmentSummary | null>(null);
    readonly detail = signal<CommissionRoleAssignmentDetailView | null>(null);
    readonly handover = signal<ProjectHandoverDetailView | null>(null);
    readonly busy = signal(false);
    readonly error = signal('');
    readonly notice = signal('');
    readonly duties = computed(
        () =>
            this.handover()?.participantConfirmationSummary.participants.flatMap((p) =>
                (p.responsibilities ?? []).map((r) => ({ key: `${p.participantId}:${r.roleKey}`, userId: p.participantId, roleType: r.roleKey, summary: r.responsibilitySummary, displayName: p.participantDisplayName ?? '移交参与人' }))
            ) ?? []
    );
    readonly readyToFreeze = computed(() => {
        const h = this.handover();
        return (
            this.detail()?.allowedActions.includes('freeze-commission-role-assignment') === true &&
            h?.handoverStatus === 'confirmed' &&
            !h.sourceChanged &&
            !!h.handoverBasisSnapshotId &&
            !!h.summarySnapshotId &&
            !!h.sourcePayloadHash &&
            !!h.rowVersion
        );
    });
    rows: RoleDraft[] = [this.blank()];
    comment = '';
    private epoch = 0;

    constructor() {
        effect(() => {
            this.projectId();
            this.api();
            this.rows = [this.blank()];
            this.comment = '';
            this.notice.set('');
            void this.reload();
        });
    }
    dutyLabel(role: string): string {
        return ({ 'sales-owner': '销售主责', 'execution-owner': '执行主责', 'business-admin': '商务支持', 'technical-support': '技术支持', finance: '财务确认' } as Record<string, string>)[role] ?? role;
    }
    private blank(): RoleDraft {
        return { duty: '', weight: '', responsibilitySummary: '', zeroWeightReason: '' };
    }
    addRow(): void {
        this.rows = [...this.rows, this.blank()];
    }
    removeRow(index: number): void {
        this.rows = this.rows.filter((_, i) => i !== index);
    }
    chooseDuty(row: RoleDraft): void {
        row.responsibilitySummary = this.duties().find((d) => d.key === row.duty)?.summary ?? '';
    }

    async reload(): Promise<void> {
        const epoch = ++this.epoch;
        const projectId = this.projectId();
        this.busy.set(true);
        this.error.set('');
        this.current.set(null);
        this.detail.set(null);
        this.handover.set(null);
        try {
            const [current, handover] = await Promise.all([this.api().loadCurrent(projectId), this.api().loadHandover(projectId)]);
            const detail = current ? await this.api().loadDetail(current.id) : null;
            if (epoch !== this.epoch) return;
            this.current.set(current);
            this.handover.set(handover);
            this.detail.set(detail);
            this.rows =
                current?.sourceQualification === 'verified-producer' && current.status === 'draft'
                    ? current.participantsJson.map((p) => ({ duty: `${p.userId}:${p.roleType}`, weight: p.weightExact ?? '', responsibilitySummary: p.responsibilitySummary ?? '', zeroWeightReason: p.zeroWeightReason ?? '' }))
                    : [this.blank()];
        } catch (error) {
            if (epoch === this.epoch) this.error.set(this.errorText(error));
        } finally {
            if (epoch === this.epoch) this.busy.set(false);
        }
    }
    async saveDraft(): Promise<void> {
        await this.run(async () => {
            const participants = this.rows.map((row) => {
                const duty = this.duties().find((d) => d.key === row.duty);
                if (!duty) throw new Error('请选择本次真实移交职责。');
                const units = roleWeightUnits(row.weight);
                if (!row.responsibilitySummary.trim()) throw new Error('每项职责需要责任说明。');
                if (units === 0 && !row.zeroWeightReason.trim()) throw new Error('零权重必须填写原因。');
                if (units > 0 && row.zeroWeightReason.trim()) throw new Error('正权重不应填写零权重原因。');
                return { userId: duty.userId, roleType: duty.roleType, responsibilitySummary: row.responsibilitySummary.trim(), weight: units / 1000000, zeroWeightReason: units === 0 ? row.zeroWeightReason.trim() : null };
            });
            const sum = this.rows.reduce((total, row) => total + roleWeightUnits(row.weight), 0);
            if (sum !== 1000000) throw new Error('权重合计必须精确等于 1。');
            if (new Set(participants.map((p) => `${p.userId}:${p.roleType}`)).size !== participants.length) throw new Error('同一人的相同职责不可重复。');
            const current = this.current();
            await this.api().create(this.projectId(), { inputVersion: 'server-derived-v1', expectedCurrentAssignmentId: current?.id ?? null, expectedCurrentRowVersion: current?.rowVersion ?? null, participants });
        }, '已保存真实角色分配。');
    }
    async freeze(): Promise<void> {
        await this.run(async () => {
            const assignment = this.current();
            const h = this.handover();
            if (!assignment || !this.readyToFreeze() || !h?.handoverId || !h.summarySnapshotId || !h.handoverBasisSnapshotId || !h.sourcePayloadHash || !h.rowVersion) throw new Error('当前材料未满足冻结条件，请刷新核对。');
            await this.api().freeze(assignment.id, {
                inputVersion: 'server-derived-v1',
                expectedVersion: assignment.rowVersion,
                expectedHandoverVersion: h.rowVersion,
                sourceHandoverId: h.handoverId,
                handoverSummarySnapshotId: h.summarySnapshotId,
                handoverBasisSnapshotId: h.handoverBasisSnapshotId,
                expectedSourceHash: h.sourcePayloadHash,
                ...(this.comment.trim() ? { comment: this.comment.trim() } : {})
            });
        }, '已冻结当前角色、职责和权重；项目仍待明确执行准入。');
    }
    private async run(operation: () => Promise<void>, notice: string): Promise<void> {
        if (this.busy()) return;
        const epoch = this.epoch;
        this.busy.set(true);
        this.error.set('');
        this.notice.set('');
        try {
            await operation();
            if (epoch !== this.epoch) return;
            this.notice.set(notice);
            this.changed.emit();
            await this.reload();
        } catch (error) {
            if (epoch === this.epoch) this.error.set(this.errorText(error));
        } finally {
            if (epoch === this.epoch) this.busy.set(false);
        }
    }
    private errorText(error: unknown): string {
        const value = error as { status?: number; message?: string };
        if (value.status === 403) return '当前真实责任范围不允许此操作。';
        if (value.status === 404) return '当前项目或角色材料不可访问。';
        if (value.status === 409) return '材料或版本已变化，请重新读取后核对。';
        return value.message ?? '操作失败，请核对材料后重试。';
    }
}
