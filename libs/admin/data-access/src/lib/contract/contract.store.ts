import { computed, inject, Injectable, signal } from '@angular/core';
import type { ActivateContractRequest, CommandResult, ContractSummary, CreateContractRequest, SubmitContractReviewRequest, UpdateContractBasicInfoRequest } from '@poms/shared-api-client';
import { ApprovalApi, ContractApi } from '@poms/shared-api-client';
import type { ContractStatus, DomainApprovalRecord } from '@poms/shared-contracts';
import { catchError, firstValueFrom, of } from 'rxjs';
import { AuthStore } from '../auth/auth.store';

@Injectable()
export class ContractStore {
    readonly #contractApi = inject(ContractApi);
    readonly #approvalApi = inject(ApprovalApi);
    readonly #authStore = inject(AuthStore);

    readonly #contracts = signal<ContractSummary[]>([]);
    readonly #selectedContract = signal<ContractSummary | null>(null);
    readonly #currentApproval = signal<DomainApprovalRecord<ContractStatus> | null>(null);
    readonly #loading = signal(false);
    readonly #loadingApproval = signal(false);
    readonly #saving = signal(false);
    readonly #loaded = signal(false);

    readonly contracts = this.#contracts.asReadonly();
    readonly selectedContract = this.#selectedContract.asReadonly();
    readonly currentApproval = this.#currentApproval.asReadonly();
    readonly loading = this.#loading.asReadonly();
    readonly loadingApproval = this.#loadingApproval.asReadonly();
    readonly saving = this.#saving.asReadonly();
    readonly loaded = this.#loaded.asReadonly();
    readonly recentContracts = computed(() => this.#contracts().slice(0, 5));

    async loadContracts() {
        this.#loading.set(true);

        try {
            const contracts = await firstValueFrom(this.#contractApi.contractControllerList());
            this.#contracts.set(contracts);
            this.#loaded.set(true);
            return contracts;
        } finally {
            this.#loading.set(false);
        }
    }

    async loadContract(id: string) {
        this.#loading.set(true);

        try {
            const contract = await firstValueFrom(this.#contractApi.contractControllerGetById({ id }));
            this.#selectedContract.set(contract);
            this.#upsertContract(contract);
            return contract;
        } finally {
            this.#loading.set(false);
        }
    }

    async loadCurrentApproval(id: string) {
        this.#loadingApproval.set(true);

        try {
            const approvalRecord = await firstValueFrom(this.#contractApi.contractControllerGetCurrentApproval({ id }).pipe(catchError(() => of(null))));
            this.#currentApproval.set(approvalRecord as DomainApprovalRecord<ContractStatus> | null);
            return approvalRecord;
        } finally {
            this.#loadingApproval.set(false);
        }
    }

    async createContract(request: CreateContractRequest) {
        this.#saving.set(true);

        try {
            const contract = await firstValueFrom(this.#contractApi.contractControllerCreate({ createContractRequest: request }));
            this.#upsertContract(contract, true);
            return contract;
        } finally {
            this.#saving.set(false);
        }
    }

    async updateContract(id: string, request: UpdateContractBasicInfoRequest) {
        this.#saving.set(true);

        try {
            const contract = await firstValueFrom(
                this.#contractApi.contractControllerUpdateBasicInfo({
                    id,
                    updateContractBasicInfoRequest: request
                })
            );
            this.#selectedContract.set(contract);
            this.#upsertContract(contract);
            return contract;
        } finally {
            this.#saving.set(false);
        }
    }

    async submitReview(id: string, request: SubmitContractReviewRequest = {}): Promise<CommandResult> {
        this.#saving.set(true);

        try {
            const result = await firstValueFrom(
                this.#contractApi.contractControllerSubmitReview({
                    id,
                    submitContractReviewRequest: request
                })
            );

            await this.#reloadDetailState(id);
            await this.#authStore.refreshTodos();

            return result;
        } finally {
            this.#saving.set(false);
        }
    }

    async activateContract(id: string, request: ActivateContractRequest = {}): Promise<CommandResult> {
        this.#saving.set(true);

        try {
            const result = await firstValueFrom(
                this.#contractApi.contractControllerActivate({
                    id,
                    activateContractRequest: request
                })
            );

            await this.#reloadDetailState(id);
            await this.#authStore.refreshTodos();

            return result;
        } finally {
            this.#saving.set(false);
        }
    }

    async approveRecord(id: string, expectedVersion?: number, comment?: string): Promise<CommandResult> {
        this.#saving.set(true);

        try {
            const result = await firstValueFrom(
                this.#approvalApi.approvalControllerApproveRecord({
                    id,
                    approveRecordRequest: {
                        expectedVersion,
                        ...(comment ? { comment } : {})
                    }
                })
            );

            await this.#reloadDetailState(result.targetId);
            await this.#authStore.refreshTodos();

            return result;
        } finally {
            this.#saving.set(false);
        }
    }

    async rejectRecord(id: string, reason: string, expectedVersion?: number, comment?: string): Promise<CommandResult> {
        this.#saving.set(true);

        try {
            const result = await firstValueFrom(
                this.#approvalApi.approvalControllerRejectRecord({
                    id,
                    rejectApprovalRecordRequest: {
                        reason,
                        expectedVersion,
                        ...(comment ? { comment } : {})
                    }
                })
            );

            await this.#reloadDetailState(result.targetId);
            await this.#authStore.refreshTodos();

            return result;
        } finally {
            this.#saving.set(false);
        }
    }

    clearSelectedContract() {
        this.#selectedContract.set(null);
        this.#currentApproval.set(null);
    }

    async #reloadDetailState(id: string) {
        await Promise.all([this.loadContract(id), this.loadCurrentApproval(id)]);
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
