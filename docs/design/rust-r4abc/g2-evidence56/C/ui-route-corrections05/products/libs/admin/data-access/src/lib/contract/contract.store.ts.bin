import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import type { ActivateContractRequest, ActivateContractResult, CommandResult, ContractSummary, ContractDetailView, CreateContractRequest, SubmitContractReviewRequest, SubmitContractReviewResult, UpdateContractBasicInfoRequest } from '@poms/shared-api-client';
import { ApprovalApi, ContractApi } from '@poms/shared-api-client';
import type { ContractStatus, DomainApprovalRecord } from '@poms/shared-contracts';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '../auth/auth.store';

export interface ContractCommandAcknowledgement {
    action: 'submit-review' | 'activate' | 'approve' | 'reject';
    contractId: string;
    result: CommandResult;
}

interface ContractScope {
    readonly id: string | null;
}

interface ContractCommandScope {
    readonly scope: ContractScope;
    readonly request: number;
}

@Injectable()
export class ContractStore {
    readonly #contractApi = inject(ContractApi);
    readonly #approvalApi = inject(ApprovalApi);
    readonly #authStore = inject(AuthStore);

    readonly #contracts = signal<ContractSummary[]>([]);
    readonly #selectedContract = signal<ContractDetailView | null>(null);
    readonly #currentApproval = signal<DomainApprovalRecord<ContractStatus> | null>(null);
    readonly #loading = signal(false);
    readonly #loadingApproval = signal(false);
    readonly #saving = signal(false);
    readonly #loaded = signal(false);
    readonly #lastAcknowledgement = signal<ContractCommandAcknowledgement | null>(null);
    readonly #commandRefreshError = signal<string | null>(null);
    readonly #refreshingAcknowledgement = signal(false);
    #scope: ContractScope = { id: null };
    #listRequest = 0;
    #detailRequest = 0;
    #approvalRequest = 0;
    #loadingRequest = 0;
    #commandRequest = 0;
    #acknowledgementRequest = 0;

    readonly contracts = this.#contracts.asReadonly();
    readonly selectedContract = this.#selectedContract.asReadonly();
    readonly currentApproval = this.#currentApproval.asReadonly();
    readonly loading = this.#loading.asReadonly();
    readonly loadingApproval = this.#loadingApproval.asReadonly();
    readonly saving = this.#saving.asReadonly();
    readonly loaded = this.#loaded.asReadonly();
    readonly lastAcknowledgement = this.#lastAcknowledgement.asReadonly();
    readonly commandRefreshError = this.#commandRefreshError.asReadonly();
    readonly refreshingAcknowledgement = this.#refreshingAcknowledgement.asReadonly();
    readonly recentContracts = computed(() => this.#contracts().slice(0, 5));

    setContractScope(id: string | null): void {
        const normalizedId = id?.toLowerCase() ?? null;
        if (normalizedId !== this.#scope.id) this.#replaceScope(normalizedId);
    }

    async loadContracts() {
        const scope = this.#scope;
        const request = ++this.#listRequest;
        const loadingRequest = ++this.#loadingRequest;
        this.#loading.set(true);
        try {
            const contracts = await firstValueFrom(this.#contractApi.contractControllerList());
            if (this.#scope === scope && request === this.#listRequest) {
                this.#contracts.set(contracts);
                this.#loaded.set(true);
            }
            return contracts;
        } finally {
            if (this.#scope === scope && loadingRequest === this.#loadingRequest) this.#loading.set(false);
        }
    }

    async loadContract(id: string) {
        this.setContractScope(id);
        return this.#readContract(id, this.#scope);
    }

    async #readContract(id: string, scope: ContractScope) {
        const request = ++this.#detailRequest;
        const loadingRequest = ++this.#loadingRequest;
        this.#loading.set(true);
        try {
            const contract = await firstValueFrom(this.#contractApi.contractControllerGetById({ id }));
            if (contract.id.toLowerCase() !== id.toLowerCase()) throw new Error('返回合同与请求合同不一致，请重新加载。');
            if (this.#scope === scope && request === this.#detailRequest) {
                this.#selectedContract.set(contract);
                this.#upsertContract(contract);
            }
            return contract;
        } finally {
            if (this.#scope === scope && loadingRequest === this.#loadingRequest) this.#loading.set(false);
        }
    }

    async loadCurrentApproval(id: string) {
        this.setContractScope(id);
        return this.#readCurrentApproval(id, this.#scope);
    }

    async #readCurrentApproval(id: string, scope: ContractScope) {
        const request = ++this.#approvalRequest;
        this.#loadingApproval.set(true);
        this.#currentApproval.set(null);
        try {
            const approvalRecord = await firstValueFrom(this.#contractApi.contractControllerGetCurrentApproval({ id }));
            if (approvalRecord && approvalRecord.targetObjectId.toLowerCase() !== id.toLowerCase()) throw new Error('返回审批与请求合同不一致，请重新加载。');
            if (this.#scope === scope && request === this.#approvalRequest) this.#currentApproval.set(approvalRecord as DomainApprovalRecord<ContractStatus> | null);
            return approvalRecord;
        } catch (error) {
            if (error instanceof HttpErrorResponse && error.status === 404) return null;
            throw error;
        } finally {
            if (this.#scope === scope && request === this.#approvalRequest) this.#loadingApproval.set(false);
        }
    }

    async createContract(request: CreateContractRequest) {
        const command = this.#beginCommand();
        try {
            const contract = await firstValueFrom(this.#contractApi.contractControllerCreate({ createContractRequest: request }));
            if (this.#isCurrentCommand(command)) this.#upsertContract(contract, true);
            return contract;
        } finally {
            this.#finishCommand(command);
        }
    }

    async updateContract(id: string, request: UpdateContractBasicInfoRequest) {
        const command = this.#beginCommand(id);
        try {
            const contract = await firstValueFrom(this.#contractApi.contractControllerUpdateBasicInfo({ id, updateContractBasicInfoRequest: request }));
            if (this.#isCurrentCommand(command)) {
                this.#upsertContract(contract);
                await this.#readContract(id, command.scope);
            }
            return contract;
        } finally {
            this.#finishCommand(command);
        }
    }

    async submitReview(id: string, request: SubmitContractReviewRequest): Promise<SubmitContractReviewResult> {
        if (!request.preparationId) throw new Error('请先准备本合同条款，再提交审核。');
        const command = this.#beginCommand(id);
        try {
            const result = await firstValueFrom(this.#contractApi.contractControllerSubmitReview({ id, submitContractReviewRequest: request }));
            await this.#rememberAcknowledgement('submit-review', id, result, command);
            return result;
        } finally {
            this.#finishCommand(command);
        }
    }

    async activateContract(id: string, request: ActivateContractRequest = {}): Promise<ActivateContractResult> {
        const command = this.#beginCommand(id);
        try {
            const result = await firstValueFrom(this.#contractApi.contractControllerActivate({ id, activateContractRequest: request }));
            await this.#rememberAcknowledgement('activate', id, result, command);
            return result;
        } finally {
            this.#finishCommand(command);
        }
    }

    async approveRecord(id: string, expectedVersion?: number, comment?: string): Promise<CommandResult> {
        const command = this.#beginCommand();
        try {
            const result = await firstValueFrom(this.#approvalApi.approvalControllerApproveRecord({ id, approveRecordRequest: { expectedVersion, ...(comment ? { comment } : {}) } }));
            await this.#rememberAcknowledgement('approve', result.targetId, result, command);
            return result;
        } finally {
            this.#finishCommand(command);
        }
    }

    async rejectRecord(id: string, reason: string, expectedVersion?: number, comment?: string): Promise<CommandResult> {
        const command = this.#beginCommand();
        try {
            const result = await firstValueFrom(this.#approvalApi.approvalControllerRejectRecord({ id, rejectApprovalRecordRequest: { reason, expectedVersion, ...(comment ? { comment } : {}) } }));
            await this.#rememberAcknowledgement('reject', result.targetId, result, command);
            return result;
        } finally {
            this.#finishCommand(command);
        }
    }

    clearSelectedContract() {
        this.#replaceScope(null);
    }

    #replaceScope(id: string | null): void {
        // Object identity also distinguishes A -> B -> A; never reuse a prior scope token.
        this.#scope = { id };
        ++this.#commandRequest;
        ++this.#acknowledgementRequest;
        this.#selectedContract.set(null);
        this.#currentApproval.set(null);
        this.#lastAcknowledgement.set(null);
        this.#commandRefreshError.set(null);
        this.#refreshingAcknowledgement.set(false);
        this.#loading.set(false);
        this.#loadingApproval.set(false);
        this.#saving.set(false);
    }

    #beginCommand(contractId?: string): ContractCommandScope {
        if (contractId) {
            if (this.#scope.id === null) this.setContractScope(contractId);
            if (this.#scope.id !== contractId.toLowerCase()) throw new Error('当前页面合同已变化，请重新加载后操作。');
        }
        const command = { scope: this.#scope, request: ++this.#commandRequest };
        this.#saving.set(true);
        return command;
    }

    #isCurrentCommand(command: ContractCommandScope): boolean {
        return this.#scope === command.scope && command.request === this.#commandRequest;
    }

    #finishCommand(command: ContractCommandScope): void {
        if (this.#isCurrentCommand(command)) this.#saving.set(false);
    }

    async reloadAcknowledgedState(): Promise<boolean> {
        const acknowledgement = this.#lastAcknowledgement();
        const scope = this.#scope;
        if (!acknowledgement) return true;
        if (acknowledgement.contractId.toLowerCase() !== scope.id || this.#refreshingAcknowledgement()) return false;
        const request = ++this.#acknowledgementRequest;
        const isCurrent = () => this.#scope === scope && this.#lastAcknowledgement() === acknowledgement && request === this.#acknowledgementRequest;
        this.#refreshingAcknowledgement.set(true);
        try {
            // Private reads retain this captured scope and cannot reselect an old contract.
            const outcomes = await Promise.allSettled([
                this.#readContract(acknowledgement.contractId, scope),
                this.#readCurrentApproval(acknowledgement.contractId, scope),
                this.#authStore.refreshTodos({ propagateErrors: true, isCurrent })
            ]);
            if (!isCurrent()) return false;
            const errors = outcomes.flatMap((outcome) => outcome.status === 'rejected' ? [this.#readRefreshError(outcome.reason)] : []);
            this.#commandRefreshError.set(errors.length ? [...new Set(errors)].join('；') : null);
            return errors.length === 0;
        } finally {
            if (isCurrent()) this.#refreshingAcknowledgement.set(false);
        }
    }

    async #rememberAcknowledgement(action: ContractCommandAcknowledgement['action'], contractId: string, result: CommandResult, command: ContractCommandScope): Promise<void> {
        if (!this.#isCurrentCommand(command)) return;
        if (command.scope.id === null) this.setContractScope(contractId);
        else if (command.scope.id !== contractId.toLowerCase()) return;
        this.#lastAcknowledgement.set({ action, contractId, result });
        this.#commandRefreshError.set(null);
        this.#refreshingAcknowledgement.set(false);
        ++this.#acknowledgementRequest;
        await this.reloadAcknowledgedState();
    }

    #readRefreshError(error: unknown): string {
        if (error instanceof HttpErrorResponse && typeof error.error?.message === 'string') return error.error.message;
        if (error instanceof Error) return error.message;
        return '读取未完成，请重新加载合同、审批与待办。';
    }

    #upsertContract(contract: ContractSummary, prepend = false) {
        const contracts = this.#contracts();
        const existingIndex = contracts.findIndex((item) => item.id === contract.id);
        if (existingIndex === -1) {
            this.#contracts.set(prepend ? [contract, ...contracts] : [...contracts, contract]);
            return;
        }
        const nextContracts = [...contracts];
        nextContracts[existingIndex] = contract;
        this.#contracts.set(nextContracts);
    }
}
