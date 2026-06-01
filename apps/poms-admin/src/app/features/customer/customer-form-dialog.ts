import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CustomerStatus } from '@poms/admin-data-access';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { WorkspaceFeedback } from '../../shared/ui/workspace-feedback';

export type CustomerFormMode = 'create' | 'edit';
export type EditableCustomerStatus = CustomerStatus.Active | CustomerStatus.Inactive;

export interface CustomerFormValue {
    displayName: string;
    legalName: string;
    shortName: string;
    sourceChannel: string;
    remark: string;
    status: EditableCustomerStatus;
}

export const EMPTY_CUSTOMER_FORM_VALUE: CustomerFormValue = {
    displayName: '',
    legalName: '',
    shortName: '',
    sourceChannel: '',
    remark: '',
    status: CustomerStatus.Active
};

const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
    [CustomerStatus.Active]: '启用',
    [CustomerStatus.Inactive]: '停用',
    [CustomerStatus.Merged]: '已合并'
};

const EDITABLE_STATUS_OPTIONS = [
    { label: CUSTOMER_STATUS_LABELS[CustomerStatus.Active], value: CustomerStatus.Active },
    { label: CUSTOMER_STATUS_LABELS[CustomerStatus.Inactive], value: CustomerStatus.Inactive }
];

@Component({
    selector: 'app-customer-form-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, SelectModule, TextareaModule, WorkspaceFeedback],
    template: `
        <p-dialog [visible]="visible" [modal]="true" [header]="dialogTitle()" [style]="{ width: 'min(36rem, 94vw)' }" styleClass="p-fluid" (visibleChange)="setVisible($event)" (onHide)="handleHide()">
            <div class="flex flex-col gap-4 py-2">
                @if (error) {
                    <app-workspace-feedback severity="error" [summary]="errorSummary()" [detail]="error" />
                }

                <div class="flex flex-col gap-2">
                    <label for="customerDisplayName" class="text-sm font-medium text-surface-900 dark:text-surface-0">客户名称</label>
                    <input pInputText id="customerDisplayName" [ngModel]="form().displayName" (ngModelChange)="updateField('displayName', $event)" class="w-full rounded-md!" />
                    @if (attempted() && !form().displayName.trim()) {
                        <span class="text-xs text-red-600 dark:text-red-300">请填写客户名称。</span>
                    }
                </div>

                @if (mode === 'edit') {
                    <div class="flex flex-col gap-2">
                        <label for="customerStatus" class="text-sm font-medium text-surface-900 dark:text-surface-0">状态</label>
                        <p-select inputId="customerStatus" [ngModel]="form().status" (ngModelChange)="updateStatus($event)" [options]="statusOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-full rounded-md!" />
                    </div>
                }

                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div class="flex flex-col gap-2">
                        <label for="customerLegalName" class="text-sm font-medium text-surface-900 dark:text-surface-0">法定名称</label>
                        <input pInputText id="customerLegalName" [ngModel]="form().legalName" (ngModelChange)="updateField('legalName', $event)" class="w-full rounded-md!" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="customerShortName" class="text-sm font-medium text-surface-900 dark:text-surface-0">简称</label>
                        <input pInputText id="customerShortName" [ngModel]="form().shortName" (ngModelChange)="updateField('shortName', $event)" class="w-full rounded-md!" />
                    </div>
                </div>

                <div class="flex flex-col gap-2">
                    <label for="customerSourceChannel" class="text-sm font-medium text-surface-900 dark:text-surface-0">来源渠道</label>
                    <input pInputText id="customerSourceChannel" [ngModel]="form().sourceChannel" (ngModelChange)="updateField('sourceChannel', $event)" class="w-full rounded-md!" />
                </div>

                <div class="flex flex-col gap-2">
                    <label for="customerRemark" class="text-sm font-medium text-surface-900 dark:text-surface-0">备注</label>
                    <textarea pTextarea id="customerRemark" rows="4" [ngModel]="form().remark" (ngModelChange)="updateField('remark', $event)" class="w-full rounded-md!"></textarea>
                </div>
            </div>

            <ng-template #footer>
                <p-button label="取消" severity="secondary" styleClass="rounded-md!" (onClick)="close()" />
                <p-button [label]="submitLabel()" [loading]="saving" styleClass="rounded-md!" (onClick)="submit()" />
            </ng-template>
        </p-dialog>
    `
})
export class CustomerFormDialog implements OnChanges {
    @Input() visible = false;
    @Input() mode: CustomerFormMode = 'create';
    @Input() initialValue: CustomerFormValue = EMPTY_CUSTOMER_FORM_VALUE;
    @Input() saving = false;
    @Input() error: string | null = null;

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() save = new EventEmitter<CustomerFormValue>();

    readonly form = signal<CustomerFormValue>({ ...EMPTY_CUSTOMER_FORM_VALUE });
    readonly attempted = signal(false);
    readonly dialogTitle = computed(() => (this.mode === 'edit' ? '编辑客户' : '新建客户'));
    readonly submitLabel = computed(() => (this.mode === 'edit' ? '保存' : '创建'));

    readonly statusOptions = EDITABLE_STATUS_OPTIONS;

    ngOnChanges(changes: SimpleChanges) {
        if (changes['visible']?.currentValue === true || changes['initialValue']) {
            this.form.set({ ...EMPTY_CUSTOMER_FORM_VALUE, ...this.initialValue });
            this.attempted.set(false);
        }
    }

    setVisible(value: boolean) {
        this.visibleChange.emit(value);
    }

    handleHide() {
        this.visibleChange.emit(false);
        this.attempted.set(false);
    }

    close() {
        this.visibleChange.emit(false);
        this.attempted.set(false);
    }

    updateField(field: keyof Omit<CustomerFormValue, 'status'>, value: string) {
        this.form.update((form) => ({ ...form, [field]: value }));
    }

    updateStatus(value: EditableCustomerStatus) {
        this.form.update((form) => ({ ...form, status: value }));
    }

    submit() {
        this.attempted.set(true);
        if (!this.form().displayName.trim()) {
            return;
        }

        this.save.emit({ ...this.form() });
    }

    errorSummary(): string {
        return this.mode === 'edit' ? '客户信息没有保存成功' : '客户没有创建成功';
    }
}
