import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import type {
    BusinessAccountingFeedbackView,
    CommissionFinalSettlementView,
    CommissionRuleExplanationView,
    ProjectBusinessOutcomeOverviewView,
    ProjectUnifiedAccountingView,
    ProjectVarianceRiskExplanationView
} from '@poms/shared-api-client';
import { CommissionApi, ProjectCostApi } from '@poms/shared-api-client';
import { firstValueFrom } from 'rxjs';

type WorkspaceErrorKind =
    | 'operating'
    | 'variance'
    | 'commission-gate'
    | 'final-settlement'
    | 'rule-explanation';

@Injectable()
export class ProjectWorkspaceStore {
    readonly #projectCostApi = inject(ProjectCostApi);
    readonly #commissionApi = inject(CommissionApi);

    readonly #businessOutcomeOverview = signal<ProjectBusinessOutcomeOverviewView | null>(null);
    readonly #unifiedAccounting = signal<ProjectUnifiedAccountingView | null>(null);
    readonly #varianceRiskExplanation = signal<ProjectVarianceRiskExplanationView | null>(null);
    readonly #commissionGateOverview = signal<BusinessAccountingFeedbackView | null>(null);
    readonly #commissionFinalSettlement = signal<CommissionFinalSettlementView | null>(null);
    readonly #commissionRuleExplanation = signal<CommissionRuleExplanationView | null>(null);

    readonly #loadingOperatingOverview = signal(false);
    readonly #loadingVarianceRisk = signal(false);
    readonly #loadingCommissionGate = signal(false);
    readonly #loadingCommissionFinalSettlement = signal(false);
    readonly #loadingCommissionRuleExplanation = signal(false);

    readonly #operatingOverviewError = signal<string | null>(null);
    readonly #varianceRiskError = signal<string | null>(null);
    readonly #commissionGateError = signal<string | null>(null);
    readonly #commissionFinalSettlementError = signal<string | null>(null);
    readonly #commissionRuleExplanationError = signal<string | null>(null);

    readonly businessOutcomeOverview = this.#businessOutcomeOverview.asReadonly();
    readonly unifiedAccounting = this.#unifiedAccounting.asReadonly();
    readonly varianceRiskExplanation = this.#varianceRiskExplanation.asReadonly();
    readonly commissionGateOverview = this.#commissionGateOverview.asReadonly();
    readonly commissionFinalSettlement = this.#commissionFinalSettlement.asReadonly();
    readonly commissionRuleExplanation = this.#commissionRuleExplanation.asReadonly();

    readonly loadingOperatingOverview = this.#loadingOperatingOverview.asReadonly();
    readonly loadingVarianceRisk = this.#loadingVarianceRisk.asReadonly();
    readonly loadingCommissionGate = this.#loadingCommissionGate.asReadonly();
    readonly loadingCommissionFinalSettlement = this.#loadingCommissionFinalSettlement.asReadonly();
    readonly loadingCommissionRuleExplanation = this.#loadingCommissionRuleExplanation.asReadonly();

    readonly operatingOverviewError = this.#operatingOverviewError.asReadonly();
    readonly varianceRiskError = this.#varianceRiskError.asReadonly();
    readonly commissionGateError = this.#commissionGateError.asReadonly();
    readonly commissionFinalSettlementError = this.#commissionFinalSettlementError.asReadonly();
    readonly commissionRuleExplanationError = this.#commissionRuleExplanationError.asReadonly();

    readonly hasOperatingOverview = computed(() => this.#businessOutcomeOverview() !== null && this.#unifiedAccounting() !== null);
    readonly hasVarianceRisk = computed(() => this.#varianceRiskExplanation() !== null);
    readonly hasCommissionGateOverview = computed(() => this.#commissionGateOverview() !== null);
    readonly hasCommissionFinalSettlement = computed(() => this.#commissionFinalSettlement() !== null);
    readonly hasCommissionRuleExplanation = computed(() => this.#commissionRuleExplanation() !== null);

    async loadOperatingOverview(projectId: string) {
        this.#loadingOperatingOverview.set(true);
        this.#operatingOverviewError.set(null);

        try {
            const [overview, accounting] = await Promise.all([
                firstValueFrom(
                    this.#projectCostApi.projectCostControllerGetProjectBusinessOutcomeOverview({
                        projectId
                    })
                ),
                firstValueFrom(
                    this.#projectCostApi.projectCostControllerGetProjectUnifiedAccounting({
                        projectId
                    })
                )
            ]);

            this.#businessOutcomeOverview.set(overview);
            this.#unifiedAccounting.set(accounting);
            return { overview, accounting };
        } catch (error) {
            this.#businessOutcomeOverview.set(null);
            this.#unifiedAccounting.set(null);
            this.#operatingOverviewError.set(this.#readWorkspaceError(error, 'operating'));
            throw error;
        } finally {
            this.#loadingOperatingOverview.set(false);
        }
    }

    async loadVarianceRisk(projectId: string) {
        this.#loadingVarianceRisk.set(true);
        this.#varianceRiskError.set(null);

        try {
            const varianceRisk = await firstValueFrom(
                this.#projectCostApi.projectCostControllerGetProjectVarianceRiskExplanation({
                    projectId
                })
            );
            this.#varianceRiskExplanation.set(varianceRisk);
            return varianceRisk;
        } catch (error) {
            this.#varianceRiskExplanation.set(null);
            this.#varianceRiskError.set(this.#readWorkspaceError(error, 'variance'));
            throw error;
        } finally {
            this.#loadingVarianceRisk.set(false);
        }
    }

    async loadCommissionGateOverview(projectId: string) {
        this.#loadingCommissionGate.set(true);
        this.#commissionGateError.set(null);

        try {
            const gateOverview = await firstValueFrom(
                this.#projectCostApi.projectCostControllerGetBusinessAccountingFeedback({
                    projectId
                })
            );
            this.#commissionGateOverview.set(gateOverview);
            return gateOverview;
        } catch (error) {
            this.#commissionGateOverview.set(null);
            this.#commissionGateError.set(this.#readWorkspaceError(error, 'commission-gate'));
            throw error;
        } finally {
            this.#loadingCommissionGate.set(false);
        }
    }

    async loadCommissionFinalSettlement(projectId: string) {
        this.#loadingCommissionFinalSettlement.set(true);
        this.#commissionFinalSettlementError.set(null);

        try {
            const finalSettlement = await firstValueFrom(
                this.#commissionApi.commissionControllerGetCommissionFinalSettlement({
                    projectId
                })
            );
            this.#commissionFinalSettlement.set(finalSettlement);
            return finalSettlement;
        } catch (error) {
            this.#commissionFinalSettlement.set(null);
            this.#commissionFinalSettlementError.set(this.#readWorkspaceError(error, 'final-settlement'));
            throw error;
        } finally {
            this.#loadingCommissionFinalSettlement.set(false);
        }
    }

    async loadCommissionRuleExplanation(projectId: string) {
        this.#loadingCommissionRuleExplanation.set(true);
        this.#commissionRuleExplanationError.set(null);

        try {
            const ruleExplanation = await firstValueFrom(
                this.#commissionApi.commissionControllerGetCommissionRuleExplanation({
                    projectId
                })
            );
            this.#commissionRuleExplanation.set(ruleExplanation);
            return ruleExplanation;
        } catch (error) {
            this.#commissionRuleExplanation.set(null);
            this.#commissionRuleExplanationError.set(this.#readWorkspaceError(error, 'rule-explanation'));
            throw error;
        } finally {
            this.#loadingCommissionRuleExplanation.set(false);
        }
    }

    clear() {
        this.#businessOutcomeOverview.set(null);
        this.#unifiedAccounting.set(null);
        this.#varianceRiskExplanation.set(null);
        this.#commissionGateOverview.set(null);
        this.#commissionFinalSettlement.set(null);
        this.#commissionRuleExplanation.set(null);
        this.#loadingOperatingOverview.set(false);
        this.#loadingVarianceRisk.set(false);
        this.#loadingCommissionGate.set(false);
        this.#loadingCommissionFinalSettlement.set(false);
        this.#loadingCommissionRuleExplanation.set(false);
        this.#operatingOverviewError.set(null);
        this.#varianceRiskError.set(null);
        this.#commissionGateError.set(null);
        this.#commissionFinalSettlementError.set(null);
        this.#commissionRuleExplanationError.set(null);
    }

    #readWorkspaceError(error: unknown, kind: WorkspaceErrorKind): string {
        if (error instanceof HttpErrorResponse) {
            if (error.status === 404) {
                switch (kind) {
                    case 'operating':
                        return '当前项目还没有形成有效经营快照，先完成经营基线、经营快照和经营信号评价。';
                    case 'variance':
                        return '当前项目还没有形成可解释的偏差与风险结果，先完成经营信号评价闭环。';
                    case 'commission-gate':
                        return '当前项目还没有形成有效经营反馈 gate，先完成经营信号评价和 gate 绑定闭环。';
                    case 'final-settlement':
                        return '当前项目还没有形成有效最终结算快照，先完成最终发放登记或对应收口链冻结。';
                    case 'rule-explanation':
                        return '当前项目还没有形成可读取的规则解释快照，先完成最终结算收口链和规则解释快照生成。';
                }
            }

            if (error.status === 403) {
                return '你没有权限查看当前工作区。';
            }

            if (typeof error.error?.message === 'string' && error.error.message.trim().length > 0) {
                return error.error.message;
            }
        }

        if (error instanceof Error && error.message.trim().length > 0) {
            return error.message;
        }

        return '读取当前工作区失败，请稍后重试。';
    }
}
