import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import type {
    BusinessAccountingFeedbackView,
    CommissionRoleAssignmentDetailView,
    CommissionRoleAssignmentSummary,
    CommissionFinalSettlementView,
    CommissionRuleExplanationView,
    ContractHandoverSummaryView,
    ContractReadinessDetail,
    CreateProjectBidCommercialProcessRequest,
    CreateProjectPricingMarginReviewRequest,
    ProjectBidCommercialProcessSummary,
    ProjectHandoverDetailView,
    ProjectBidCommercialWorkspaceView,
    ProjectBusinessOutcomeOverviewView,
    ProjectPricingMarginReviewSummary,
    ProjectPricingMarginWorkspaceView,
    ProjectTechnicalCostWorkspaceView,
    ProjectUnifiedAccountingView,
    ProjectVarianceRiskExplanationView,
    ProjectWorkspaceGuidanceView
} from '@poms/shared-api-client';
import { CommissionApi, CommissionRoleAssignmentsApi, ContractReadinessApi, ProjectApi, ProjectCostApi, ProjectHandoverApi } from '@poms/shared-api-client';
import { firstValueFrom, type Observable } from 'rxjs';

type WorkspaceErrorKind =
    | 'guidance'
    | 'operating'
    | 'variance'
    | 'contract-handover'
    | 'pre-signing'
    | 'technical-cost'
    | 'bid-commercial'
    | 'pricing-margin'
    | 'commission-gate'
    | 'commission-freeze-binding'
    | 'final-settlement'
    | 'rule-explanation';

@Injectable()
export class ProjectWorkspaceStore {
    readonly #projectApi = inject(ProjectApi);
    readonly #projectCostApi = inject(ProjectCostApi);
    readonly #projectHandoverApi = inject(ProjectHandoverApi);
    readonly #contractReadinessApi = inject(ContractReadinessApi);
    readonly #commissionApi = inject(CommissionApi);
    readonly #commissionRoleAssignmentsApi = inject(CommissionRoleAssignmentsApi);

    readonly #guidance = signal<ProjectWorkspaceGuidanceView | null>(null);
    readonly #contractHandoverSummary = signal<ContractHandoverSummaryView | null>(null);
    readonly #projectHandoverDetail = signal<ProjectHandoverDetailView | null>(null);
    readonly #contractReadiness = signal<ContractReadinessDetail | null>(null);
    readonly #technicalCostWorkspace = signal<ProjectTechnicalCostWorkspaceView | null>(null);
    readonly #bidCommercialWorkspace = signal<ProjectBidCommercialWorkspaceView | null>(null);
    readonly #pricingMarginWorkspace = signal<ProjectPricingMarginWorkspaceView | null>(null);
    readonly #businessOutcomeOverview = signal<ProjectBusinessOutcomeOverviewView | null>(null);
    readonly #unifiedAccounting = signal<ProjectUnifiedAccountingView | null>(null);
    readonly #varianceRiskExplanation = signal<ProjectVarianceRiskExplanationView | null>(null);
    readonly #commissionGateOverview = signal<BusinessAccountingFeedbackView | null>(null);
    readonly #commissionFreezeBindingSummary = signal<CommissionRoleAssignmentSummary | null>(null);
    readonly #commissionFreezeBindingDetail = signal<CommissionRoleAssignmentDetailView | null>(null);
    readonly #commissionFinalSettlement = signal<CommissionFinalSettlementView | null>(null);
    readonly #commissionRuleExplanation = signal<CommissionRuleExplanationView | null>(null);

    readonly #loadingGuidance = signal(false);
    readonly #loadingContractHandover = signal(false);
    readonly #loadingPreSigning = signal(false);
    readonly #loadingTechnicalCost = signal(false);
    readonly #loadingBidCommercial = signal(false);
    readonly #loadingPricingMargin = signal(false);
    readonly #savingBidCommercial = signal(false);
    readonly #savingPricingMargin = signal(false);
    readonly #loadingOperatingOverview = signal(false);
    readonly #loadingVarianceRisk = signal(false);
    readonly #loadingCommissionGate = signal(false);
    readonly #loadingCommissionFreezeBinding = signal(false);
    readonly #loadingCommissionFinalSettlement = signal(false);
    readonly #loadingCommissionRuleExplanation = signal(false);

    readonly #guidanceError = signal<string | null>(null);
    readonly #contractHandoverError = signal<string | null>(null);
    readonly #preSigningError = signal<string | null>(null);
    readonly #technicalCostError = signal<string | null>(null);
    readonly #bidCommercialError = signal<string | null>(null);
    readonly #pricingMarginError = signal<string | null>(null);
    readonly #operatingOverviewError = signal<string | null>(null);
    readonly #varianceRiskError = signal<string | null>(null);
    readonly #commissionGateError = signal<string | null>(null);
    readonly #commissionFreezeBindingError = signal<string | null>(null);
    readonly #commissionFinalSettlementError = signal<string | null>(null);
    readonly #commissionRuleExplanationError = signal<string | null>(null);

    readonly guidance = this.#guidance.asReadonly();
    readonly contractHandoverSummary = this.#contractHandoverSummary.asReadonly();
    readonly projectHandoverDetail = this.#projectHandoverDetail.asReadonly();
    readonly contractReadiness = this.#contractReadiness.asReadonly();
    readonly technicalCostWorkspace = this.#technicalCostWorkspace.asReadonly();
    readonly bidCommercialWorkspace = this.#bidCommercialWorkspace.asReadonly();
    readonly pricingMarginWorkspace = this.#pricingMarginWorkspace.asReadonly();
    readonly businessOutcomeOverview = this.#businessOutcomeOverview.asReadonly();
    readonly unifiedAccounting = this.#unifiedAccounting.asReadonly();
    readonly varianceRiskExplanation = this.#varianceRiskExplanation.asReadonly();
    readonly commissionGateOverview = this.#commissionGateOverview.asReadonly();
    readonly commissionFreezeBindingSummary = this.#commissionFreezeBindingSummary.asReadonly();
    readonly commissionFreezeBindingDetail = this.#commissionFreezeBindingDetail.asReadonly();
    readonly commissionFinalSettlement = this.#commissionFinalSettlement.asReadonly();
    readonly commissionRuleExplanation = this.#commissionRuleExplanation.asReadonly();

    readonly loadingGuidance = this.#loadingGuidance.asReadonly();
    readonly loadingContractHandover = this.#loadingContractHandover.asReadonly();
    readonly loadingPreSigning = this.#loadingPreSigning.asReadonly();
    readonly loadingTechnicalCost = this.#loadingTechnicalCost.asReadonly();
    readonly loadingBidCommercial = this.#loadingBidCommercial.asReadonly();
    readonly loadingPricingMargin = this.#loadingPricingMargin.asReadonly();
    readonly savingBidCommercial = this.#savingBidCommercial.asReadonly();
    readonly savingPricingMargin = this.#savingPricingMargin.asReadonly();
    readonly loadingOperatingOverview = this.#loadingOperatingOverview.asReadonly();
    readonly loadingVarianceRisk = this.#loadingVarianceRisk.asReadonly();
    readonly loadingCommissionGate = this.#loadingCommissionGate.asReadonly();
    readonly loadingCommissionFreezeBinding = this.#loadingCommissionFreezeBinding.asReadonly();
    readonly loadingCommissionFinalSettlement = this.#loadingCommissionFinalSettlement.asReadonly();
    readonly loadingCommissionRuleExplanation = this.#loadingCommissionRuleExplanation.asReadonly();

    readonly guidanceError = this.#guidanceError.asReadonly();
    readonly contractHandoverError = this.#contractHandoverError.asReadonly();
    readonly preSigningError = this.#preSigningError.asReadonly();
    readonly technicalCostError = this.#technicalCostError.asReadonly();
    readonly bidCommercialError = this.#bidCommercialError.asReadonly();
    readonly pricingMarginError = this.#pricingMarginError.asReadonly();
    readonly operatingOverviewError = this.#operatingOverviewError.asReadonly();
    readonly varianceRiskError = this.#varianceRiskError.asReadonly();
    readonly commissionGateError = this.#commissionGateError.asReadonly();
    readonly commissionFreezeBindingError = this.#commissionFreezeBindingError.asReadonly();
    readonly commissionFinalSettlementError = this.#commissionFinalSettlementError.asReadonly();
    readonly commissionRuleExplanationError = this.#commissionRuleExplanationError.asReadonly();

    readonly hasGuidance = computed(() => this.#guidance() !== null);
    readonly hasContractHandover = computed(() => this.#contractHandoverSummary() !== null && this.#projectHandoverDetail() !== null);
    readonly hasContractReadiness = computed(() => this.#contractReadiness() !== null);
    readonly hasTechnicalCostWorkspace = computed(() => this.#technicalCostWorkspace() !== null);
    readonly hasBidCommercialWorkspace = computed(() => this.#bidCommercialWorkspace() !== null);
    readonly hasPricingMarginWorkspace = computed(() => this.#pricingMarginWorkspace() !== null);
    readonly hasOperatingOverview = computed(() => this.#businessOutcomeOverview() !== null && this.#unifiedAccounting() !== null);
    readonly hasVarianceRisk = computed(() => this.#varianceRiskExplanation() !== null);
    readonly hasCommissionGateOverview = computed(() => this.#commissionGateOverview() !== null);
    readonly hasCommissionFreezeBinding = computed(
        () => this.#commissionFreezeBindingSummary() !== null || this.#commissionFreezeBindingDetail() !== null || this.#projectHandoverDetail() !== null
    );
    readonly hasCommissionFinalSettlement = computed(() => this.#commissionFinalSettlement() !== null);
    readonly hasCommissionRuleExplanation = computed(() => this.#commissionRuleExplanation() !== null);

    async loadGuidance(projectId: string) {
        this.#loadingGuidance.set(true);
        this.#guidanceError.set(null);

        try {
            const guidance = await firstValueFrom(
                this.#projectApi.projectControllerGetWorkspaceGuidance({
                    projectId
                })
            );
            this.#guidance.set(guidance);
            return guidance;
        } catch (error) {
            this.#guidance.set(null);
            this.#guidanceError.set(this.#readWorkspaceError(error, 'guidance'));
            throw error;
        } finally {
            this.#loadingGuidance.set(false);
        }
    }

    async loadContractHandover(projectId: string) {
        this.#loadingContractHandover.set(true);
        this.#contractHandoverError.set(null);

        try {
            const [contractHandoverSummary, projectHandoverDetail] = await Promise.all([
                firstValueFrom(
                    this.#projectHandoverApi.projectHandoverControllerGetContractHandoverSummary({
                        projectId
                    })
                ),
                firstValueFrom(
                    this.#projectHandoverApi.projectHandoverControllerGetProjectHandoverDetailByProject({
                        projectId
                    })
                )
            ]);

            this.#contractHandoverSummary.set(contractHandoverSummary);
            this.#projectHandoverDetail.set(projectHandoverDetail);
            return { contractHandoverSummary, projectHandoverDetail };
        } catch (error) {
            this.#contractHandoverSummary.set(null);
            this.#projectHandoverDetail.set(null);
            this.#contractHandoverError.set(this.#readWorkspaceError(error, 'contract-handover'));
            throw error;
        } finally {
            this.#loadingContractHandover.set(false);
        }
    }

    async loadPreSigningOverview(projectId: string): Promise<ContractReadinessDetail | null> {
        this.#loadingPreSigning.set(true);
        this.#preSigningError.set(null);

        try {
            const readiness = await firstValueFrom(
                this.#contractReadinessApi.contractReadinessControllerGetCurrentContractReadiness({
                    projectId
                })
            );
            this.#contractReadiness.set(readiness);
            return readiness;
        } catch (error) {
            if (this.#isMissingWorkspaceView(error)) {
                this.#contractReadiness.set(null);
                this.#preSigningError.set(null);
                return null;
            }

            this.#contractReadiness.set(null);
            this.#preSigningError.set(this.#readWorkspaceError(error, 'pre-signing'));
            throw error;
        } finally {
            this.#loadingPreSigning.set(false);
        }
    }

    async loadTechnicalCostWorkspace(projectId: string): Promise<ProjectTechnicalCostWorkspaceView> {
        this.#loadingTechnicalCost.set(true);
        this.#technicalCostError.set(null);

        try {
            const workspace = await firstValueFrom(
                this.#projectApi.projectControllerGetProjectTechnicalCostWorkspace({
                    projectId
                })
            );
            this.#technicalCostWorkspace.set(workspace);
            return workspace;
        } catch (error) {
            this.#technicalCostWorkspace.set(null);
            this.#technicalCostError.set(this.#readWorkspaceError(error, 'technical-cost'));
            throw error;
        } finally {
            this.#loadingTechnicalCost.set(false);
        }
    }

    async loadBidCommercialWorkspace(projectId: string): Promise<ProjectBidCommercialWorkspaceView> {
        this.#loadingBidCommercial.set(true);
        this.#bidCommercialError.set(null);

        try {
            const workspace = await firstValueFrom(
                this.#projectApi.projectControllerGetProjectBidCommercialWorkspace({
                    projectId
                })
            );
            this.#bidCommercialWorkspace.set(workspace);
            return workspace;
        } catch (error) {
            this.#bidCommercialWorkspace.set(null);
            this.#bidCommercialError.set(this.#readWorkspaceError(error, 'bid-commercial'));
            throw error;
        } finally {
            this.#loadingBidCommercial.set(false);
        }
    }

    async createBidCommercialProcess(projectId: string, request: CreateProjectBidCommercialProcessRequest): Promise<ProjectBidCommercialProcessSummary> {
        this.#savingBidCommercial.set(true);
        this.#bidCommercialError.set(null);

        try {
            const result = await firstValueFrom(
                this.#projectApi.projectControllerCreateProjectBidCommercialProcess({
                    projectId,
                    createProjectBidCommercialProcessRequest: request
                })
            );
            await this.loadBidCommercialWorkspace(projectId);
            return result;
        } catch (error) {
            this.#bidCommercialError.set(this.#readWorkspaceError(error, 'bid-commercial'));
            throw error;
        } finally {
            this.#savingBidCommercial.set(false);
        }
    }

    async loadPricingMarginWorkspace(projectId: string): Promise<ProjectPricingMarginWorkspaceView> {
        this.#loadingPricingMargin.set(true);
        this.#pricingMarginError.set(null);

        try {
            const workspace = await firstValueFrom(
                this.#projectApi.projectControllerGetProjectPricingMarginWorkspace({
                    projectId
                })
            );
            this.#pricingMarginWorkspace.set(workspace);
            return workspace;
        } catch (error) {
            this.#pricingMarginWorkspace.set(null);
            this.#pricingMarginError.set(this.#readWorkspaceError(error, 'pricing-margin'));
            throw error;
        } finally {
            this.#loadingPricingMargin.set(false);
        }
    }

    async createPricingMarginReview(projectId: string, request: CreateProjectPricingMarginReviewRequest): Promise<ProjectPricingMarginReviewSummary> {
        this.#savingPricingMargin.set(true);
        this.#pricingMarginError.set(null);

        try {
            const result = await firstValueFrom(
                this.#projectApi.projectControllerCreateProjectPricingMarginReview({
                    projectId,
                    createProjectPricingMarginReviewRequest: request
                })
            );
            await this.loadPricingMarginWorkspace(projectId);
            return result;
        } catch (error) {
            this.#pricingMarginError.set(this.#readWorkspaceError(error, 'pricing-margin'));
            throw error;
        } finally {
            this.#savingPricingMargin.set(false);
        }
    }

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

    async loadCommissionFreezeBinding(projectId: string) {
        this.#loadingCommissionFreezeBinding.set(true);
        this.#commissionFreezeBindingError.set(null);

        try {
            const [currentRoleAssignmentResult, projectHandoverResult] = await Promise.allSettled([
                firstValueFrom(
                    this.#commissionApi.commissionControllerGetCurrentRoleAssignment({
                        projectId
                    }) as unknown as Observable<CommissionRoleAssignmentSummary | null>
                ),
                firstValueFrom(
                    this.#projectHandoverApi.projectHandoverControllerGetProjectHandoverDetailByProject({
                        projectId
                    })
                )
            ]);

            const currentRoleAssignment =
                currentRoleAssignmentResult.status === 'fulfilled'
                    ? currentRoleAssignmentResult.value
                    : this.#throwUnlessMissing(currentRoleAssignmentResult.reason);
            const projectHandoverDetail =
                projectHandoverResult.status === 'fulfilled'
                    ? projectHandoverResult.value
                    : this.#throwUnlessMissing(projectHandoverResult.reason);

            let roleAssignmentDetail: CommissionRoleAssignmentDetailView | null = null;
            if (currentRoleAssignment?.id) {
                roleAssignmentDetail = await firstValueFrom(
                    this.#commissionRoleAssignmentsApi.commissionRoleAssignmentControllerGetRoleAssignmentDetail({
                        id: currentRoleAssignment.id
                    })
                );
            }

            this.#commissionFreezeBindingSummary.set(currentRoleAssignment);
            this.#commissionFreezeBindingDetail.set(roleAssignmentDetail);
            this.#projectHandoverDetail.set(projectHandoverDetail);

            return {
                currentRoleAssignment,
                roleAssignmentDetail,
                projectHandoverDetail
            };
        } catch (error) {
            this.#commissionFreezeBindingSummary.set(null);
            this.#commissionFreezeBindingDetail.set(null);
            this.#projectHandoverDetail.set(null);
            this.#commissionFreezeBindingError.set(this.#readWorkspaceError(error, 'commission-freeze-binding'));
            throw error;
        } finally {
            this.#loadingCommissionFreezeBinding.set(false);
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
        this.#guidance.set(null);
        this.#contractHandoverSummary.set(null);
        this.#projectHandoverDetail.set(null);
        this.#contractReadiness.set(null);
        this.#technicalCostWorkspace.set(null);
        this.#bidCommercialWorkspace.set(null);
        this.#pricingMarginWorkspace.set(null);
        this.#businessOutcomeOverview.set(null);
        this.#unifiedAccounting.set(null);
        this.#varianceRiskExplanation.set(null);
        this.#commissionGateOverview.set(null);
        this.#commissionFreezeBindingSummary.set(null);
        this.#commissionFreezeBindingDetail.set(null);
        this.#commissionFinalSettlement.set(null);
        this.#commissionRuleExplanation.set(null);
        this.#loadingGuidance.set(false);
        this.#loadingContractHandover.set(false);
        this.#loadingPreSigning.set(false);
        this.#loadingTechnicalCost.set(false);
        this.#loadingBidCommercial.set(false);
        this.#loadingPricingMargin.set(false);
        this.#savingBidCommercial.set(false);
        this.#savingPricingMargin.set(false);
        this.#loadingOperatingOverview.set(false);
        this.#loadingVarianceRisk.set(false);
        this.#loadingCommissionGate.set(false);
        this.#loadingCommissionFreezeBinding.set(false);
        this.#loadingCommissionFinalSettlement.set(false);
        this.#loadingCommissionRuleExplanation.set(false);
        this.#guidanceError.set(null);
        this.#contractHandoverError.set(null);
        this.#preSigningError.set(null);
        this.#technicalCostError.set(null);
        this.#bidCommercialError.set(null);
        this.#pricingMarginError.set(null);
        this.#operatingOverviewError.set(null);
        this.#varianceRiskError.set(null);
        this.#commissionGateError.set(null);
        this.#commissionFreezeBindingError.set(null);
        this.#commissionFinalSettlementError.set(null);
        this.#commissionRuleExplanationError.set(null);
    }

    #readWorkspaceError(error: unknown, kind: WorkspaceErrorKind): string {
        if (error instanceof HttpErrorResponse) {
            if (error.status === 404) {
                switch (kind) {
                    case 'guidance':
                        return '当前项目还没有形成工作区引导，请先确认项目是否存在并具备查看权限。';
                    case 'contract-handover':
                        return '当前项目还没有形成合同承接视图，请先完成合同生效和移交前置事实。';
                    case 'pre-signing':
                        return '当前项目还没有形成签约就绪承接包，请先补齐签约前事实。';
                    case 'technical-cost':
                        return '当前项目还没有形成技术与成本工作区，请先补齐签约前技术与成本版本包。';
                    case 'bid-commercial':
                        return '当前项目还没有形成招投标 / 商务竞标工作区，请先补齐竞标形态、材料和结果事实。';
                    case 'pricing-margin':
                        return '当前项目还没有形成报价与毛利评审工作区，请先补齐报价、成本版本、税务和回款条件。';
                    case 'operating':
                        return '当前项目还没有形成有效经营快照，先完成经营基线、经营快照和经营信号评价。';
                    case 'variance':
                        return '当前项目还没有形成可解释的偏差与风险结果，先完成经营信号评价闭环。';
                    case 'commission-gate':
                        return '当前项目还没有形成有效经营反馈 gate，先完成经营信号评价和 gate 绑定闭环。';
                    case 'commission-freeze-binding':
                        return '当前项目还没有形成可读取的冻结绑定视图，先完成移交确认并形成当前冻结版本。';
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

    #throwUnlessMissing(error: unknown): null {
        if (this.#isMissingWorkspaceView(error)) {
            return null;
        }

        throw error;
    }

    #isMissingWorkspaceView(error: unknown): boolean {
        return error instanceof HttpErrorResponse && error.status === 404;
    }
}
