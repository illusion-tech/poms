import { computed, inject, Injectable, signal } from '@angular/core';
import {
    AttachmentApi,
    AttachmentTargetType,
    ContractApi,
    CustomerApi,
    LeadApi,
    ProjectApi,
    type AttachmentSummary,
    type ContractSummary,
    type CustomerListView,
    type LeadListView,
    type ProjectListView
} from '@poms/shared-api-client';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '../auth/auth.store';

type AttachmentCenterTargetType = AttachmentTargetType.Customer | AttachmentTargetType.Lead | AttachmentTargetType.Project | AttachmentTargetType.Contract;

export interface AttachmentCenterTargetRef {
    targetType: AttachmentCenterTargetType;
    targetId: string;
    targetNo: string;
    targetName: string;
    targetOwnerName: string | null;
    routeCommands: unknown[];
    routeQueryParams?: Record<string, string>;
}

export interface AttachmentCenterRecord extends AttachmentCenterTargetRef {
    id: string;
    attachment: AttachmentSummary;
}

@Injectable()
export class AttachmentCenterStore {
    readonly #attachmentApi = inject(AttachmentApi);
    readonly #customerApi = inject(CustomerApi);
    readonly #leadApi = inject(LeadApi);
    readonly #projectApi = inject(ProjectApi);
    readonly #contractApi = inject(ContractApi);
    readonly #authStore = inject(AuthStore);

    readonly #records = signal<AttachmentCenterRecord[]>([]);
    readonly #loading = signal(false);
    readonly #loaded = signal(false);
    readonly #errors = signal<string[]>([]);

    readonly records = this.#records.asReadonly();
    readonly loading = this.#loading.asReadonly();
    readonly loaded = this.#loaded.asReadonly();
    readonly errors = this.#errors.asReadonly();
    readonly targetCount = computed(() => new Set(this.#records().map((record) => `${record.targetType}:${record.targetId}`)).size);

    async loadRecords(): Promise<AttachmentCenterRecord[]> {
        this.#loading.set(true);
        const errors: string[] = [];

        try {
            const targetRefs = await this.loadTargetRefs(errors);
            const buckets = await Promise.all(targetRefs.map((target) => this.loadTargetAttachments(target, errors)));
            const records = buckets.flat().sort((a, b) => b.attachment.uploadedAt.localeCompare(a.attachment.uploadedAt));
            this.#records.set(records);
            this.#errors.set(errors);
            this.#loaded.set(true);
            return records;
        } finally {
            this.#loading.set(false);
        }
    }

    clearRecords(): void {
        this.#records.set([]);
        this.#errors.set([]);
        this.#loaded.set(false);
    }

    private async loadTargetRefs(errors: string[]): Promise<AttachmentCenterTargetRef[]> {
        const permissions = new Set((this.#authStore.currentUser()?.permissions ?? []) as string[]);
        const tasks: Promise<AttachmentCenterTargetRef[]>[] = [];

        if (permissions.has('customer:read')) {
            tasks.push(this.loadCustomerTargets(errors));
        }

        if (permissions.has('lead:read')) {
            tasks.push(this.loadLeadTargets(errors));
        }

        if (permissions.has('project:read')) {
            tasks.push(this.loadProjectTargets(errors));
            tasks.push(this.loadContractTargets(errors));
        }

        const buckets = await Promise.all(tasks);
        return buckets.flat();
    }

    private async loadCustomerTargets(errors: string[]): Promise<AttachmentCenterTargetRef[]> {
        try {
            const customers = await firstValueFrom(this.#customerApi.customerControllerList({}));
            return (customers ?? []).map((customer) => this.customerToTarget(customer));
        } catch {
            errors.push('客户附件范围没有读取成功。');
            return [];
        }
    }

    private async loadLeadTargets(errors: string[]): Promise<AttachmentCenterTargetRef[]> {
        try {
            const leads = await firstValueFrom(this.#leadApi.leadControllerList({}));
            return (leads ?? []).map((lead) => this.leadToTarget(lead));
        } catch {
            errors.push('线索附件范围没有读取成功。');
            return [];
        }
    }

    private async loadProjectTargets(errors: string[]): Promise<AttachmentCenterTargetRef[]> {
        try {
            const projects = await firstValueFrom(this.#projectApi.projectControllerList({}));
            return (projects ?? []).map((project) => this.projectToTarget(project));
        } catch {
            errors.push('项目附件范围没有读取成功。');
            return [];
        }
    }

    private async loadContractTargets(errors: string[]): Promise<AttachmentCenterTargetRef[]> {
        try {
            const contracts = await firstValueFrom(this.#contractApi.contractControllerList({}));
            return (contracts ?? []).map((contract) => this.contractToTarget(contract));
        } catch {
            errors.push('合同附件范围没有读取成功。');
            return [];
        }
    }

    private async loadTargetAttachments(target: AttachmentCenterTargetRef, errors: string[]): Promise<AttachmentCenterRecord[]> {
        try {
            const attachments = await firstValueFrom(
                this.#attachmentApi.attachmentControllerList({
                    targetType: target.targetType,
                    targetId: target.targetId
                })
            );

            return (attachments ?? []).map((attachment) => ({
                ...target,
                id: `${target.targetType}:${target.targetId}:${attachment.id}`,
                attachment
            }));
        } catch {
            errors.push(`${this.targetTypeLabel(target.targetType)}「${target.targetName}」的附件没有读取成功。`);
            return [];
        }
    }

    private customerToTarget(customer: CustomerListView): AttachmentCenterTargetRef {
        return {
            targetType: AttachmentTargetType.Customer,
            targetId: customer.id,
            targetNo: customer.customerNo,
            targetName: customer.displayName,
            targetOwnerName: customer.ownerName,
            routeCommands: ['/customers'],
            routeQueryParams: { customerId: customer.id }
        };
    }

    private leadToTarget(lead: LeadListView): AttachmentCenterTargetRef {
        return {
            targetType: AttachmentTargetType.Lead,
            targetId: lead.id,
            targetNo: lead.leadNo,
            targetName: lead.leadName,
            targetOwnerName: lead.ownerName,
            routeCommands: ['/leads'],
            routeQueryParams: { leadId: lead.id }
        };
    }

    private projectToTarget(project: ProjectListView): AttachmentCenterTargetRef {
        return {
            targetType: AttachmentTargetType.Project,
            targetId: project.id,
            targetNo: project.projectNo,
            targetName: project.projectName,
            targetOwnerName: project.ownerName,
            routeCommands: ['/projects', project.id]
        };
    }

    private contractToTarget(contract: ContractSummary): AttachmentCenterTargetRef {
        return {
            targetType: AttachmentTargetType.Contract,
            targetId: contract.id,
            targetNo: contract.contractNo,
            targetName: contract.projectName,
            targetOwnerName: null,
            routeCommands: ['/contracts', contract.id]
        };
    }

    private targetTypeLabel(targetType: AttachmentCenterTargetType): string {
        switch (targetType) {
            case AttachmentTargetType.Customer:
                return '客户';
            case AttachmentTargetType.Lead:
                return '线索';
            case AttachmentTargetType.Project:
                return '项目';
            case AttachmentTargetType.Contract:
                return '合同';
        }
    }
}
