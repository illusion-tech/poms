import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { disabled, form, FormField, maxLength, required } from '@angular/forms/signals';
import type { OperatingPreparation, ReceiptRecordSummary } from '@poms/shared-contracts';
import { ProjectGovernanceApi } from './project-governance-api';
import { receiptBasisChoices, receiptConfirmation, receiptCurrencyChoices, sourceIdentity } from './project-governance-facts';

@Component({
    selector: 'app-project-receipt-basis-authoring', standalone: true, imports: [FormField],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="grid gap-4 rounded-xl border border-surface p-4" aria-label="回款净税依据确认">
            <h2 class="text-lg font-semibold">确认回款净税依据</h2>
            <p>选择真实回款和已激活条款。净额、税额与币种由服务器依来源计算。</p>
            @if (busy()) { <p role="status">正在读取或固定回款依据…</p> }
            @if (error()) { <p role="alert">{{ error() }}</p> }
            @if (notice()) { <p role="status">{{ notice() }}</p> }
            <label>实际回款
                <select class="block w-full rounded border p-2" [value]="selectedReceiptId()" [disabled]="busy()" (change)="chooseReceipt($event)">
                    <option value="">请选择实际回款</option>
                    @for (receipt of receipts(); track receipt.id) {
                        <option [value]="receipt.id">{{ receipt.receiptDate }} · {{ receipt.status === 'confirmed' ? '历史已确认回款补证' : '待确认回款' }} · 版本 {{ receipt.rowVersion }}</option>
                    }
                </select>
            </label>
            @if (selectedReceipt(); as receipt) {
                <button type="button" class="justify-self-start rounded border px-3 py-2" [disabled]="busy()" (click)="prepareReceipt(receipt)">重新核对回款和来源</button>
            }
            @if (preparation(); as prepared) {
                @if (!prepared.allowedCommandCodes.includes('receipt-basis')) {
                    <p role="status">当前依据尚不允许确认：{{ prepared.blockingReasonCodes.join('；') }}</p>
                }
                @if (!choices().terms.length) { <p role="status">本次来源中尚无经过认证的已激活条款。请先完成条款来源认证后重新读取。</p> }
                <form class="grid gap-4" (submit)="confirm($event)">
                    <label>已激活合同条款
                        <select class="block w-full rounded border p-2" [formField]="basisForm.termKey">
                            <option value="">请选择服务器返回的条款</option>
                            @for (ref of choices().terms; track identity(ref)) { <option [value]="identity(ref)">{{ termLabel(ref.id) }} · {{ ref.id.slice(0, 8) }} · 来源版本 {{ ref.rowVersion }}</option> }
                        </select>
                    </label>
                    <label>真实币种来源
                        <select class="block w-full rounded border p-2" [formField]="basisForm.currencyKey">
                            <option value="">请选择实际币种依据</option>
                            @for (ref of currencyChoices(); track identity(ref)) { <option [value]="identity(ref)">{{ ref.kind === 'ContractTermSnapshot' ? '所选条款的已固定币种' : '所选条款的已激活商务来源' }} · 版本 {{ ref.rowVersion }}</option> }
                        </select>
                    </label>
                    <label>条款选择方式
                        <select class="block w-full rounded border p-2" [formField]="basisForm.selectionPolicy">
                            <option value="receipt-date-effective-terms">回款当日有效条款</option>
                            <option value="explicit-activated-terms-evidence">有附件证据的显式已激活条款</option>
                        </select>
                    </label>
                    <fieldset class="grid gap-2 rounded border p-3">
                        <legend>真实佐证附件</legend>
                        @for (ref of evidenceChoices(); track identity(ref)) {
                            <div class="flex flex-wrap items-center gap-2"><label class="flex items-center gap-2"><input type="checkbox" [checked]="model().evidenceKeys.includes(identity(ref))" [disabled]="busy()" (change)="toggleEvidence($event, identity(ref))" />{{ attachmentNames()[ref.id] }} · 来源版本 {{ ref.rowVersion }}</label><button type="button" class="underline" [disabled]="busy()" (click)="download(ref.id)">读取附件</button></div>
                        }
                        @if (!evidenceChoices().length) { <p>尚无可读取并引用的有效附件。</p> }
                        <label>上传回款依据附件 <input type="file" [disabled]="busy()" (change)="upload($event)" /></label>
                        <p class="text-sm">上传经现有附件会话挂载项目，重新读取后才会出现在真实来源中。</p>
                    </fieldset>
                    <label>依据说明 <textarea class="block w-full rounded border p-2" rows="3" [formField]="basisForm.reason"></textarea></label>
                    <button type="submit" class="justify-self-start rounded bg-primary px-4 py-2 text-white" [disabled]="busy() || !canSubmit()">{{ selectedReceipt()?.status === 'confirmed' ? '追加认证历史回款依据' : '确认回款并固定依据' }}</button>
                </form>
            }
        </section>
    `
})
export class ProjectReceiptBasisAuthoring {
    readonly projectId = input.required<string>();
    readonly changed = output<void>();
    private readonly api = inject(ProjectGovernanceApi);
    readonly receipts = signal<ReceiptRecordSummary[]>([]);
    readonly selectedReceiptId = signal('');
    readonly selectedReceipt = computed(() => this.receipts().find((receipt) => receipt.id === this.selectedReceiptId()) ?? null);
    readonly preparation = signal<OperatingPreparation | null>(null);
    readonly busy = signal(false);
    readonly error = signal('');
    readonly notice = signal('');
    readonly attachmentNames = signal<Record<string, string>>({});
    readonly model = signal<{ termKey: string; currencyKey: string; evidenceKeys: string[]; selectionPolicy: string; reason: string }>({ termKey: '', currencyKey: '', evidenceKeys: [], selectionPolicy: 'receipt-date-effective-terms', reason: '' });
    readonly basisForm = form(this.model, (fields) => {
        required(fields.termKey); required(fields.currencyKey); required(fields.reason); maxLength(fields.reason, 2000);
        disabled(fields, () => this.busy());
    });
    readonly identity = sourceIdentity;
    readonly choices = computed(() => {
        const preparation = this.preparation(), receipt = this.selectedReceipt();
        return preparation && receipt ? receiptBasisChoices(preparation, receipt.contractId) : { contract: null, terms: [], currencies: [], evidence: [] };
    });
    readonly currencyChoices = computed(() => {
        const preparation = this.preparation();
        return preparation ? receiptCurrencyChoices(preparation, this.model().termKey) : [];
    });
    readonly evidenceChoices = computed(() => this.choices().evidence.filter((ref) => this.attachmentNames()[ref.id]));
    readonly canSubmit = computed(() => {
        const preparation = this.preparation(), receipt = this.selectedReceipt();
        if (!preparation || !receipt || !preparation.allowedCommandCodes.includes('receipt-basis') || !this.basisForm().valid()) return false;
        try { receiptConfirmation(preparation, receipt, this.model()); return true; } catch { return false; }
    });
    private epoch = 0;
    constructor() { effect(() => { const id = this.projectId(); void this.load(id); }); }
    private async load(projectId: string) {
        const epoch = ++this.epoch;
        this.receipts.set([]); this.preparation.set(null); this.attachmentNames.set({}); this.selectedReceiptId.set(''); this.busy.set(true); this.error.set('');
        try {
            const groups = await this.api.receiptChoices(projectId);
            if (epoch === this.epoch) this.receipts.set(groups.flatMap((group) => group.receipts).filter((receipt) => receipt.projectId === projectId));
        } catch (error) { if (epoch === this.epoch) this.error.set(this.errorText(error)); }
        finally { if (epoch === this.epoch) this.busy.set(false); }
    }
    chooseReceipt(event: Event) {
        const select = event.target;
        if (!(select instanceof HTMLSelectElement)) return;
        this.selectedReceiptId.set(select.value);
        this.preparation.set(null);
        this.attachmentNames.set({});
        this.model.set({ termKey: '', currencyKey: '', evidenceKeys: [], selectionPolicy: 'receipt-date-effective-terms', reason: '' });
        const receipt = this.selectedReceipt(); if (receipt) void this.prepareReceipt(receipt);
    }
    async prepareReceipt(receipt: ReceiptRecordSummary) {
        const epoch = ++this.epoch;
        this.busy.set(true); this.error.set(''); this.preparation.set(null);
        try {
            const response = await this.api.prepare(this.projectId(), { view: 'preparation', intent: 'receipt-basis', receiptId: receipt.id });
            const files = await this.api.receiptEvidenceFiles(this.projectId(), receipt.contractId, response.preparation);
            if (epoch === this.epoch && this.selectedReceiptId() === receipt.id) {
                this.attachmentNames.set(Object.fromEntries(files.map((file) => [file.id, file.fileName])));
                this.preparation.set(response.preparation);
            }
        } catch (error) { if (epoch === this.epoch) this.error.set(this.errorText(error)); }
        finally { if (epoch === this.epoch) this.busy.set(false); }
    }
    toggleEvidence(event: Event, key: string) {
        const checkbox = event.target; if (!(checkbox instanceof HTMLInputElement)) return;
        if (!this.evidenceChoices().some((ref) => sourceIdentity(ref) === key)) return;
        this.model.update((value) => ({ ...value, evidenceKeys: checkbox.checked ? [...new Set([...value.evidenceKeys, key])] : value.evidenceKeys.filter((candidate) => candidate !== key) }));
    }
    async upload(event: Event) {
        const input = event.target, receipt = this.selectedReceipt();
        const file = input instanceof HTMLInputElement ? input.files?.[0] : undefined;
        if (!file || !receipt || this.busy()) return;
        this.busy.set(true); this.error.set('');
        try { await this.api.uploadReceiptEvidence(this.projectId(), file); await this.prepareReceipt(receipt); }
        catch (error) { this.error.set(this.errorText(error)); }
        finally { this.busy.set(false); }
    }
    async confirm(event: Event) {
        event.preventDefault();
        const preparation = this.preparation(), receipt = this.selectedReceipt();
        if (!preparation || !receipt || !this.canSubmit() || this.busy()) return;
        this.busy.set(true); this.error.set('');
        try {
            const result = await this.api.confirmReceipt(this.projectId(), receipt.id, receiptConfirmation(preparation, receipt, this.model()));
            this.receipts.update((items) => items.map((item) => item.id === result.id ? result : item));
            this.preparation.set(null); this.notice.set('已追加不可变回款依据。净税与币种按真实来源固定。'); this.changed.emit();
        } catch (error) { this.preparation.set(null); this.error.set(this.errorText(error)); }
        finally { this.busy.set(false); }
    }
    async download(attachmentId: string) {
        if (!this.evidenceChoices().some((ref) => ref.id === attachmentId)) return;
        try { await this.api.downloadReceiptEvidence(this.projectId(), attachmentId); }
        catch (error) { this.error.set(this.errorText(error)); }
    }
    private errorText(error: unknown) { return error instanceof Error ? error.message : '操作失败，请重新核对回款和真实来源。'; }
    termLabel(id: string) {
        const row = this.preparation()?.sourceRows.find((source) => source.sourceRef.kind === 'ContractTermSnapshot' && source.sourceRef.id === id);
        const date = row?.sourceEffectiveBusinessDate ?? row?.sourceBusinessDate;
        return date ? `${date} 生效条款` : '已激活合同条款';
    }
}
