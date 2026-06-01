import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AttachmentTargetType, AuthStore, BusinessDiscussionTargetObjectType, CustomerAliasType, CustomerStore, UpdateCustomerRequestStatusEnum, type CustomerDetailView } from '@poms/admin-data-access';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { AdminMetricGrid, type AdminMetricItem } from '../../shared/ui/admin-metric-grid';
import { AttachmentPanel } from '../../shared/ui/attachment-panel';
import { AuditHistoryPanel } from '../../shared/ui/audit-history-panel';
import { BusinessDiscussionPanel } from '../../shared/ui/business-discussion-panel';
import { SalesFollowUpPanel } from '../../shared/ui/sales-follow-up-panel';
import { SalesIntelligencePanel } from '../../shared/ui/sales-intelligence-panel';
import { WorkspaceFeedback } from '../../shared/ui/workspace-feedback';
import { CustomerFormDialog, EMPTY_CUSTOMER_FORM_VALUE, type CustomerFormValue } from './customer-form-dialog';
import { CUSTOMER_ALIAS_TYPE_OPTIONS, customerStatusLabel, customerStatusSeverity, displayText, optionalText, toCustomerFormValue } from './customer-view-model';

interface CustomerAliasForm {
    aliasName: string;
    aliasType: CustomerAliasType;
}

interface FollowUpReminderEntry {
    followUpId: string;
    todoId: string | null;
}

const EMPTY_ALIAS_FORM: CustomerAliasForm = {
    aliasName: '',
    aliasType: CustomerAliasType.Alias
};

@Component({
    selector: 'app-customer-workspace',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        InputTextModule,
        SelectModule,
        TagModule,
        AdminMetricGrid,
        AttachmentPanel,
        AuditHistoryPanel,
        BusinessDiscussionPanel,
        SalesFollowUpPanel,
        SalesIntelligencePanel,
        WorkspaceFeedback,
        CustomerFormDialog
    ],
    providers: [CustomerStore],
    template: `
        <div class="flex flex-col gap-5">
            @if (pageError()) {
                <app-workspace-feedback severity="error" summary="客户工作台暂时无法打开" [detail]="pageError()" />
            }

            @if (loadingDetail()) {
                <app-workspace-feedback severity="info" summary="正在读取客户工作台" detail="请稍候。" />
            } @else if (customer(); as customer) {
                <section class="card">
                    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div class="min-w-0">
                            <div class="mb-3 flex flex-wrap items-center gap-2">
                                <p-button icon="pi pi-arrow-left" severity="secondary" [outlined]="true" ariaLabel="返回客户列表" styleClass="rounded-md!" (onClick)="backToList()" />
                                <span class="text-xs font-medium uppercase tracking-wide text-surface-500 dark:text-surface-400">{{ customer.customerNo }}</span>
                                <p-tag [value]="statusLabel(customer.status)" [severity]="statusSeverity(customer.status)" class="rounded-[6px]" />
                            </div>
                            <h2 class="m-0 text-2xl font-semibold text-surface-950 dark:text-surface-0">{{ customer.displayName }}</h2>
                            <p class="mt-2 text-sm leading-6 text-surface-600 dark:text-surface-300">{{ displayText(customer.legalName || customer.shortName, '未维护法定名称/简称') }}</p>
                            <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-surface-500 dark:text-surface-400">
                                <span>主责：{{ displayText(customer.ownerName, '未指定') }}</span>
                                <span>组织：{{ displayText(customer.ownerOrgName, '未归属组织') }}</span>
                                <span>更新：{{ customer.updatedAt | date: 'yyyy-MM-dd HH:mm' }}</span>
                            </div>
                        </div>
                        <div class="flex shrink-0 flex-wrap items-center gap-2">
                            <app-audit-history-panel targetType="customer" [targetId]="customer.id" [targetTitle]="customer.displayName" />
                            <p-button icon="pi pi-pencil" label="编辑客户" severity="secondary" [outlined]="true" styleClass="rounded-md!" (onClick)="showEditDialog(customer)" />
                        </div>
                    </div>
                </section>

                <app-admin-metric-grid [items]="customerMetricItems()" [columns]="3" />

                <section class="card">
                    <div class="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h3 class="m-0 text-base font-semibold text-surface-950 dark:text-surface-0">基础档案</h3>
                            <p class="mt-1 text-sm text-surface-500 dark:text-surface-400">客户主档身份和长期备注。</p>
                        </div>
                    </div>
                    <dl class="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
                        <div>
                            <dt class="text-surface-500 dark:text-surface-400">法定名称</dt>
                            <dd class="mt-1 font-medium text-surface-950 dark:text-surface-0">{{ displayText(customer.legalName, '未维护') }}</dd>
                        </div>
                        <div>
                            <dt class="text-surface-500 dark:text-surface-400">简称</dt>
                            <dd class="mt-1 font-medium text-surface-950 dark:text-surface-0">{{ displayText(customer.shortName, '未维护') }}</dd>
                        </div>
                        <div>
                            <dt class="text-surface-500 dark:text-surface-400">来源渠道</dt>
                            <dd class="mt-1 font-medium text-surface-950 dark:text-surface-0">{{ displayText(customer.sourceChannel, '未维护') }}</dd>
                        </div>
                        <div>
                            <dt class="text-surface-500 dark:text-surface-400">创建时间</dt>
                            <dd class="mt-1 font-medium text-surface-950 dark:text-surface-0">{{ customer.createdAt | date: 'yyyy-MM-dd HH:mm' }}</dd>
                        </div>
                        <div class="md:col-span-2 xl:col-span-4">
                            <dt class="text-surface-500 dark:text-surface-400">备注</dt>
                            <dd class="mt-1 whitespace-pre-line text-surface-700 dark:text-surface-200">{{ displayText(customer.remark, '暂无备注') }}</dd>
                        </div>
                    </dl>
                </section>

                <section class="card">
                    <div class="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                            <h3 class="m-0 text-base font-semibold text-surface-950 dark:text-surface-0">客户别名</h3>
                            <p class="mt-1 text-sm text-surface-500 dark:text-surface-400">维护法定名称、简称、历史输入和导入名称。</p>
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
                            <input pInputText [ngModel]="aliasForm().aliasName" (ngModelChange)="updateAliasName($event)" placeholder="新增别名" class="w-48 rounded-md!" />
                            <p-select [ngModel]="aliasForm().aliasType" (ngModelChange)="updateAliasType($event)" [options]="aliasTypeOptions" optionLabel="label" optionValue="value" appendTo="body" class="w-36 rounded-md!" />
                            <p-button icon="pi pi-plus" label="添加" [loading]="saving()" [disabled]="!aliasForm().aliasName.trim()" styleClass="rounded-md!" (onClick)="createAlias(customer)" />
                        </div>
                    </div>

                    <div class="flex flex-wrap gap-2">
                        @for (alias of aliases(); track alias.id) {
                            <span class="rounded-[6px] border border-surface-200 px-2 py-1 text-xs text-surface-700 dark:border-surface-700 dark:text-surface-200">{{ alias.aliasName }}</span>
                        } @empty {
                            <span class="text-sm text-surface-500 dark:text-surface-400">暂无别名</span>
                        }
                    </div>
                </section>

                @if (followUpReminderEntry()) {
                    <app-workspace-feedback severity="info" summary="从销售跟进待办进入" detail="请在下方客户销售跟进中登记本次处理结果，系统会据此关闭或刷新提醒。" />
                }

                <app-sales-intelligence-panel [customerId]="customer.id" [canWrite]="canWriteCustomer()" title="客户关系" description="维护客户联系人，并作为线索和项目决策链的联系人来源。" />

                <app-business-discussion-panel
                    [customerId]="customer.id"
                    [targetObjectType]="customerDiscussionTargetType"
                    [targetObjectId]="customer.id"
                    [targetTitle]="customer.displayName"
                    [canWrite]="canWriteCustomer()"
                    title="客户业务讨论"
                    description="沉淀客户长期信息、跨线索判断和协同结论。"
                />

                <app-sales-follow-up-panel
                    [customerId]="customer.id"
                    [canWrite]="canWriteCustomer()"
                    title="客户销售跟进"
                    description="沉淀客户级沟通、长期采购信息、合作机会和下一步动作。"
                    createContextDetail="本次记录会挂到当前客户，用于跨线索和跨项目查看客户销售过程。"
                />

                <app-attachment-panel [targetType]="customerAttachmentTargetType" [targetId]="customer.id" [canWrite]="canWriteCustomer()" title="客户附件" description="保存客户资质、开票资料、采购制度、框架协议和长期合作资料。" />

                <app-customer-form-dialog
                    [visible]="editDialogVisible"
                    mode="edit"
                    [initialValue]="editFormInitial()"
                    [saving]="saving()"
                    [error]="formError()"
                    (visibleChange)="editDialogVisible = $event"
                    (save)="updateCustomer($event)"
                />
            }
        </div>
    `
})
export class CustomerWorkspace implements OnInit {
    readonly #customerStore = inject(CustomerStore);
    readonly #authStore = inject(AuthStore);
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #destroyRef = inject(DestroyRef);

    readonly customer = this.#customerStore.selectedCustomer;
    readonly aliases = this.#customerStore.aliases;
    readonly loadingDetail = this.#customerStore.loadingDetail;
    readonly saving = this.#customerStore.saving;

    readonly pageError = signal<string | null>(null);
    readonly formError = signal<string | null>(null);
    readonly aliasForm = signal<CustomerAliasForm>({ ...EMPTY_ALIAS_FORM });
    readonly editFormInitial = signal<CustomerFormValue>({ ...EMPTY_CUSTOMER_FORM_VALUE });
    readonly followUpReminderEntry = signal<FollowUpReminderEntry | null>(null);

    readonly aliasTypeOptions = CUSTOMER_ALIAS_TYPE_OPTIONS;
    readonly customerAttachmentTargetType = AttachmentTargetType.Customer;
    readonly customerDiscussionTargetType = BusinessDiscussionTargetObjectType.Customer;
    readonly canWriteCustomer = computed(() => this.#authStore.hasAnyPermission(['customer:write'] as const));
    readonly customerMetricItems = computed<AdminMetricItem[]>(() => {
        const customer = this.customer();
        return [
            { label: '线索', value: customer?.leadCount ?? 0 },
            { label: '项目', value: customer?.projectCount ?? 0 },
            { label: '合同', value: customer?.contractCount ?? 0 }
        ];
    });

    editDialogVisible = false;

    ngOnInit() {
        this.#route.paramMap.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params) => {
            const customerId = params.get('id');
            if (!customerId) {
                this.pageError.set('缺少客户标识，无法打开客户工作台。');
                return;
            }

            void this.loadCustomer(customerId);
        });

        this.#route.queryParamMap.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params) => {
            const followUpId = params.get('followUpId');
            this.followUpReminderEntry.set(followUpId ? { followUpId, todoId: params.get('todoId') } : null);
        });
    }

    async loadCustomer(customerId: string) {
        this.pageError.set(null);
        this.aliasForm.set({ ...EMPTY_ALIAS_FORM });
        try {
            const customer = await this.#customerStore.loadCustomer(customerId);
            this.editFormInitial.set(toCustomerFormValue(customer));
        } catch {
            this.pageError.set('客户详情没有读取成功，请稍后重试。');
        }
    }

    backToList() {
        void this.#router.navigate(['/customers']);
    }

    showEditDialog(customer: CustomerDetailView) {
        this.formError.set(null);
        this.editFormInitial.set(toCustomerFormValue(customer));
        this.editDialogVisible = true;
    }

    async updateCustomer(form: CustomerFormValue) {
        const customer = this.customer();
        if (!customer) {
            return;
        }

        try {
            await this.#customerStore.updateCustomer(customer.id, {
                displayName: form.displayName.trim(),
                legalName: optionalText(form.legalName),
                shortName: optionalText(form.shortName),
                status: form.status === EMPTY_CUSTOMER_FORM_VALUE.status ? UpdateCustomerRequestStatusEnum.Active : UpdateCustomerRequestStatusEnum.Inactive,
                sourceChannel: optionalText(form.sourceChannel),
                remark: optionalText(form.remark)
            });
            this.editDialogVisible = false;
        } catch {
            this.formError.set('请稍后重试。');
        }
    }

    updateAliasName(value: string) {
        this.aliasForm.update((form) => ({ ...form, aliasName: value }));
    }

    updateAliasType(value: CustomerAliasForm['aliasType']) {
        this.aliasForm.update((form) => ({ ...form, aliasType: value }));
    }

    async createAlias(customer: CustomerDetailView) {
        const form = this.aliasForm();
        if (!form.aliasName.trim()) {
            return;
        }

        try {
            await this.#customerStore.createAlias(customer.id, {
                aliasName: form.aliasName.trim(),
                aliasType: form.aliasType
            });
            this.aliasForm.set({ ...EMPTY_ALIAS_FORM });
        } catch {
            this.pageError.set('客户别名没有添加成功，请检查是否重复。');
        }
    }

    statusLabel = customerStatusLabel;
    statusSeverity = customerStatusSeverity;
    displayText = displayText;
}
