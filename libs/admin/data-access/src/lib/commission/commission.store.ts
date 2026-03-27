import { computed, inject, Injectable, signal } from '@angular/core';
import type {
    CommandResult,
    CommissionAdjustmentSummary,
    CommissionCalculationSummary,
    CommissionPayoutSummary,
    ConfirmCommissionCalculationRequest,
    CreateCommissionAdjustmentRequest,
    CreateCommissionCalculationRequest,
    CreateCommissionPayoutRequest,
    ExecuteCommissionAdjustmentRequest,
    RecalculateCommissionRequest,
    RejectApprovalRecordRequest,
    RegisterCommissionPayoutRequest,
    SubmitCommissionAdjustmentApprovalRequest,
    SubmitCommissionPayoutApprovalRequest
} from '@poms/shared-api-client';
import { ApprovalApi, CommissionApi } from '@poms/shared-api-client';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '../auth/auth.store';

@Injectable()
export class CommissionStore {
    readonly #commissionApi = inject(CommissionApi);
    readonly #approvalApi = inject(ApprovalApi);
    readonly #authStore = inject(AuthStore);

    readonly #calculations = signal<CommissionCalculationSummary[]>([]);
    readonly #payouts = signal<CommissionPayoutSummary[]>([]);
    readonly #adjustments = signal<CommissionAdjustmentSummary[]>([]);
    readonly #loadingCalculations = signal(false);
    readonly #loadingPayouts = signal(false);
    readonly #loadingAdjustments = signal(false);
    readonly #saving = signal(false);

    readonly calculations = this.#calculations.asReadonly();
    readonly payouts = this.#payouts.asReadonly();
    readonly adjustments = this.#adjustments.asReadonly();
    readonly loadingCalculations = this.#loadingCalculations.asReadonly();
    readonly loadingPayouts = this.#loadingPayouts.asReadonly();
    readonly loadingAdjustments = this.#loadingAdjustments.asReadonly();
    readonly saving = this.#saving.asReadonly();

    readonly currentEffectiveCalculation = computed(
        () => this.#calculations().find((item) => item.isCurrent && item.status === 'effective') ?? null
    );
    readonly pendingApprovalCount = computed(() => this.#payouts().filter((item) => item.status === 'pending-approval').length);
    readonly paidPayoutCount = computed(() => this.#payouts().filter((item) => item.status === 'paid').length);
    readonly pendingAdjustmentCount = computed(() => this.#adjustments().filter((item) => item.status === 'pending-approval').length);

    async loadCalculations(projectId: string) {
        this.#loadingCalculations.set(true);

        try {
            const calculations = await firstValueFrom(this.#commissionApi.commissionControllerListCalculations({ projectId }));
            this.#calculations.set(calculations ?? []);
            return calculations;
        } finally {
            this.#loadingCalculations.set(false);
        }
    }

    async loadPayouts(projectId: string) {
        this.#loadingPayouts.set(true);

        try {
            const payouts = await firstValueFrom(this.#commissionApi.commissionControllerListPayouts({ projectId }));
            this.#payouts.set(payouts ?? []);
            return payouts;
        } finally {
            this.#loadingPayouts.set(false);
        }
    }

    async reload(projectId: string) {
        await Promise.all([this.loadCalculations(projectId), this.loadPayouts(projectId), this.loadAdjustments(projectId)]);
    }

    async triggerCalculation(projectId: string, request: CreateCommissionCalculationRequest) {
        this.#saving.set(true);

        try {
            const calculation = await firstValueFrom(
                this.#commissionApi.commissionControllerTriggerCalculation({
                    projectId,
                    createCommissionCalculationRequest: request
                })
            );
            this.#upsertCalculation(calculation);
            return calculation;
        } finally {
            this.#saving.set(false);
        }
    }

    async confirmCalculation(projectId: string, id: string, request: ConfirmCommissionCalculationRequest = {}) {
        this.#saving.set(true);

        try {
            const calculation = await firstValueFrom(
                this.#commissionApi.commissionControllerConfirmCalculation({
                    projectId,
                    id,
                    confirmCommissionCalculationRequest: request
                })
            );
            this.#upsertCalculation(calculation);
            return calculation;
        } finally {
            this.#saving.set(false);
        }
    }

    async createPayout(projectId: string, request: CreateCommissionPayoutRequest) {
        this.#saving.set(true);

        try {
            const payout = await firstValueFrom(
                this.#commissionApi.commissionControllerCreatePayout({
                    projectId,
                    createCommissionPayoutRequest: request
                })
            );
            this.#upsertPayout(payout);
            return payout;
        } finally {
            this.#saving.set(false);
        }
    }

    async recalculateCalculation(projectId: string, id: string, request: RecalculateCommissionRequest) {
        this.#saving.set(true);

        try {
            const calculation = await firstValueFrom(
                this.#commissionApi.commissionControllerRecalculateCalculation({
                    projectId,
                    id,
                    recalculateCommissionRequest: request
                })
            );
            await Promise.all([this.loadCalculations(projectId), this.loadAdjustments(projectId)]);
            return calculation;
        } finally {
            this.#saving.set(false);
        }
    }

    async submitPayoutApproval(projectId: string, id: string, request: SubmitCommissionPayoutApprovalRequest = {}) {
        this.#saving.set(true);

        try {
            const payout = await firstValueFrom(
                this.#commissionApi.commissionControllerSubmitPayoutApproval({
                    projectId,
                    id,
                    submitCommissionPayoutApprovalRequest: request
                })
            );
            this.#upsertPayout(payout);
            await this.#authStore.refreshTodos();
            return payout;
        } finally {
            this.#saving.set(false);
        }
    }

    async approvePayoutApproval(projectId: string, approvalRecordId: string, expectedVersion?: number, comment?: string): Promise<CommandResult> {
        this.#saving.set(true);

        try {
            const result = await firstValueFrom(
                this.#approvalApi.approvalControllerApproveRecord({
                    id: approvalRecordId,
                    approveRecordRequest: {
                        expectedVersion,
                        ...(comment ? { comment } : {})
                    }
                })
            );
            await Promise.all([this.loadPayouts(projectId), this.#authStore.refreshTodos()]);
            return result;
        } finally {
            this.#saving.set(false);
        }
    }

    async rejectPayoutApproval(projectId: string, approvalRecordId: string, request: RejectApprovalRecordRequest): Promise<CommandResult> {
        this.#saving.set(true);

        try {
            const result = await firstValueFrom(
                this.#approvalApi.approvalControllerRejectRecord({
                    id: approvalRecordId,
                    rejectApprovalRecordRequest: request
                })
            );
            await Promise.all([this.loadPayouts(projectId), this.#authStore.refreshTodos()]);
            return result;
        } finally {
            this.#saving.set(false);
        }
    }

    async registerPayout(projectId: string, id: string, request: RegisterCommissionPayoutRequest) {
        this.#saving.set(true);

        try {
            const payout = await firstValueFrom(
                this.#commissionApi.commissionControllerRegisterPayout({
                    projectId,
                    id,
                    registerCommissionPayoutRequest: request
                })
            );
            this.#upsertPayout(payout);
            return payout;
        } finally {
            this.#saving.set(false);
        }
    }

    async loadAdjustments(projectId: string) {
        this.#loadingAdjustments.set(true);

        try {
            const adjustments = await firstValueFrom(this.#commissionApi.commissionControllerListAdjustments({ projectId }));
            this.#adjustments.set(adjustments ?? []);
            return adjustments;
        } finally {
            this.#loadingAdjustments.set(false);
        }
    }

    async createAdjustment(projectId: string, request: CreateCommissionAdjustmentRequest) {
        this.#saving.set(true);

        try {
            const adjustment = await firstValueFrom(
                this.#commissionApi.commissionControllerCreateAdjustment({
                    projectId,
                    createCommissionAdjustmentRequest: request
                })
            );
            this.#upsertAdjustment(adjustment);
            return adjustment;
        } finally {
            this.#saving.set(false);
        }
    }

    async submitAdjustmentApproval(projectId: string, id: string, request: SubmitCommissionAdjustmentApprovalRequest = {}) {
        this.#saving.set(true);

        try {
            const adjustment = await firstValueFrom(
                this.#commissionApi.commissionControllerSubmitAdjustmentApproval({
                    projectId,
                    id,
                    submitCommissionAdjustmentApprovalRequest: request
                })
            );
            this.#upsertAdjustment(adjustment);
            await this.#authStore.refreshTodos();
            return adjustment;
        } finally {
            this.#saving.set(false);
        }
    }

    async approveAdjustmentApproval(projectId: string, approvalRecordId: string, expectedVersion?: number, comment?: string): Promise<CommandResult> {
        this.#saving.set(true);

        try {
            const result = await firstValueFrom(
                this.#approvalApi.approvalControllerApproveRecord({
                    id: approvalRecordId,
                    approveRecordRequest: {
                        expectedVersion,
                        ...(comment ? { comment } : {})
                    }
                })
            );
            await Promise.all([this.loadAdjustments(projectId), this.#authStore.refreshTodos()]);
            return result;
        } finally {
            this.#saving.set(false);
        }
    }

    async rejectAdjustmentApproval(projectId: string, approvalRecordId: string, request: RejectApprovalRecordRequest): Promise<CommandResult> {
        this.#saving.set(true);

        try {
            const result = await firstValueFrom(
                this.#approvalApi.approvalControllerRejectRecord({
                    id: approvalRecordId,
                    rejectApprovalRecordRequest: request
                })
            );
            await Promise.all([this.loadAdjustments(projectId), this.#authStore.refreshTodos()]);
            return result;
        } finally {
            this.#saving.set(false);
        }
    }

    async executeAdjustment(projectId: string, id: string, request: ExecuteCommissionAdjustmentRequest = {}) {
        this.#saving.set(true);

        try {
            const adjustment = await firstValueFrom(
                this.#commissionApi.commissionControllerExecuteAdjustment({
                    projectId,
                    id,
                    executeCommissionAdjustmentRequest: request
                })
            );
            await Promise.all([this.loadAdjustments(projectId), this.loadPayouts(projectId), this.#authStore.refreshTodos()]);
            this.#upsertAdjustment(adjustment);
            return adjustment;
        } finally {
            this.#saving.set(false);
        }
    }

    clear() {
        this.#calculations.set([]);
        this.#payouts.set([]);
        this.#adjustments.set([]);
    }

    #upsertCalculation(calculation: CommissionCalculationSummary) {
        const calculations = this.#calculations();
        const existingIndex = calculations.findIndex((item) => item.id === calculation.id);
        const nextCalculations = [...calculations];

        if (existingIndex === -1) {
            nextCalculations.unshift(calculation);
        } else {
            nextCalculations[existingIndex] = calculation;
        }

        for (let index = 0; index < nextCalculations.length; index += 1) {
            const item = nextCalculations[index];
            if (item.id !== calculation.id && item.projectId === calculation.projectId && item.isCurrent && calculation.isCurrent) {
                nextCalculations[index] = { ...item, isCurrent: false };
            }
        }

        this.#calculations.set(nextCalculations);
    }

    #upsertPayout(payout: CommissionPayoutSummary) {
        const payouts = this.#payouts();
        const existingIndex = payouts.findIndex((item) => item.id === payout.id);

        if (existingIndex === -1) {
            this.#payouts.set([payout, ...payouts]);
            return;
        }

        const nextPayouts = [...payouts];
        nextPayouts[existingIndex] = payout;
        this.#payouts.set(nextPayouts);
    }

    #upsertAdjustment(adjustment: CommissionAdjustmentSummary) {
        const adjustments = this.#adjustments();
        const existingIndex = adjustments.findIndex((item) => item.id === adjustment.id);

        if (existingIndex === -1) {
            this.#adjustments.set([adjustment, ...adjustments]);
            return;
        }

        const nextAdjustments = [...adjustments];
        nextAdjustments[existingIndex] = adjustment;
        this.#adjustments.set(nextAdjustments);
    }
}
