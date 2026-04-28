import { Injectable, NotFoundException } from '@nestjs/common';
import type {
    AcceptanceRecordList,
    AcceptanceRecordResult,
    AcceptanceRecordSummary,
    AcceptanceRecordType,
    PermissionKey,
    ProjectArchiveRecordList,
    ProjectArchiveRecordSummary,
    ProjectBidCommercialMaterialItemView,
    ProjectBidCommercialProcessList,
    ProjectBidCommercialProcessSummary,
    ProjectBidCommercialTimelineItemView,
    ProjectBidCommercialWorkspaceView,
    ProjectCompletionRecordList,
    ProjectCompletionRecordResult,
    ProjectCompletionRecordSummary,
    ProjectDetailView,
    ProjectListQuery,
    ProjectListView,
    ProjectPricingMarginConditionItemView,
    ProjectPricingMarginReviewList,
    ProjectPricingMarginReviewSummary,
    ProjectPricingMarginWorkspaceView,
    ProjectTechnicalCostItemView,
    ProjectTechnicalCostPackageList,
    ProjectTechnicalCostPackageSummary,
    ProjectTechnicalCostWorkspaceView,
    ProjectTechnicalRiskItemView,
    ProjectTechnicalScopeItemView,
    ProjectTimelineView,
    ProjectWorkspaceGuidanceView,
    UserPayload
} from '@poms/shared-contracts';
import { ApprovalSummarySnapshotRepository } from '../approval-summary/approval-summary.repository';
import { SensitiveFieldProjectionService, type SensitiveFieldProjectionRequestContext } from '../../core/sensitive-field-projection/sensitive-field-projection.service';
import { Contract } from '../contract/contract.entity';
import { Lead } from '../lead/lead.entity';
import { AcceptanceRecord } from './acceptance-record.entity';
import { ProjectArchiveRecord } from './project-archive-record.entity';
import {
    ProjectBidCommercialMaterialItem,
    ProjectBidCommercialProcess,
    ProjectBidCommercialTimelineItem
} from './project-bid-commercial-process.entity';
import { ProjectCompletionRecord } from './project-completion-record.entity';
import {
    ProjectPricingMarginConditionItem,
    ProjectPricingMarginReview
} from './project-pricing-margin-review.entity';
import {
    ProjectTechnicalCostItem,
    ProjectTechnicalCostPackage,
    ProjectTechnicalRiskItem,
    ProjectTechnicalScopeItem
} from './project-technical-cost-package.entity';
import { Project } from './project.entity';
import { ProjectRepository } from './project.repository';

const PROJECT_DETAIL_SUMMARY_SCENARIO_KEY = 'project-detail';
const PROJECT_DETAIL_SUMMARY_PROJECTION_LEVEL = 'project-detail';
const PROJECT_DETAIL_TARGET_TYPE = 'Project';
const PROJECT_WORKSPACE_HANDOVER_PERMISSIONS: PermissionKey[] = ['project:read'];
const PROJECT_WORKSPACE_PRESIGNING_PERMISSIONS: PermissionKey[] = ['project:read'];
const PROJECT_WORKSPACE_FINANCE_PERMISSIONS: PermissionKey[] = ['project:read', 'contract:finance:manage'];
const PROJECT_WORKSPACE_PAYOUT_PERMISSIONS: PermissionKey[] = ['project:read', 'commission:payouts:manage'];
const PROJECT_WORKSPACE_COMMISSION_FREEZE_PERMISSIONS: PermissionKey[] = ['project:read', 'commission:assignments:manage'];
const PROJECT_WORKSPACE_COMMISSION_OPERATION_PERMISSIONS: PermissionKey[] = [
    'project:read',
    'commission:rule-versions:manage',
    'commission:calculations:manage',
    'commission:payouts:manage',
    'commission:adjustments:manage'
];
const PROJECT_WORKSPACE_FINANCE_STAGES = ['execution', 'acceptance', 'completed'];
const PROJECT_WORKSPACE_COMMISSION_STAGES = ['handover', 'execution', 'acceptance', 'completed'];
const PROJECT_WORKSPACE_SETTLEMENT_STAGES = ['acceptance', 'completed'];
const PROJECT_WORKSPACE_PRESIGNING_STAGES = ['assessment', 'scope-confirmation', 'commercial-closure', 'contracting'];
const PROJECT_ARCHIVE_RECORD_ACTIONS = {
    replace: 'replace-project-archive-record',
    void: 'void-project-archive-record'
} as const;

const ACCEPTANCE_RECORD_TYPE_LABELS: Record<AcceptanceRecordType, string> = {
    'stage-outcome': '阶段成果确认',
    'stage-acceptance': '阶段验收',
    'final-acceptance': '最终验收'
};

const ACCEPTANCE_RECORD_RESULT_LABELS: Record<AcceptanceRecordResult, string> = {
    accepted: '已通过',
    conditional: '有条件通过',
    rejected: '未通过'
};

const PROJECT_COMPLETION_RECORD_RESULT_LABELS: Record<ProjectCompletionRecordResult, string> = {
    completed: '项目已完成',
    'conditional-completed': '项目有条件完成'
};

const PROJECT_ARCHIVE_RESULT_LABEL_PREFIX = '项目归档';

type ProjectWorkspaceGuidanceText = Pick<ProjectWorkspaceGuidanceView, 'headline' | 'currentFocus' | 'currentGap' | 'nextStep'> & {
    ownerFallback: string;
};

const PROJECT_WORKSPACE_STAGE_LABELS: Record<string, string> = {
    assessment: '立项评估',
    'scope-confirmation': '范围确认',
    'commercial-closure': '商务收口',
    contracting: '签约中',
    handover: '项目移交',
    execution: '正式执行',
    acceptance: '验收确认',
    completed: '已完成',
    'closed-lost': '已丢单',
    'closed-terminated': '已终止'
};

const PROJECT_WORKSPACE_STATUS_LABELS: Record<string, string> = {
    active: '进行中',
    'pending-approval': '待审批',
    blocked: '阻塞中',
    'on-hold': '已挂起',
    completed: '已完成',
    closed: '已关闭'
};

const PROJECT_WORKSPACE_STAGE_GUIDANCE: Record<string, ProjectWorkspaceGuidanceText> = {
    assessment: {
        headline: '先判断这个项目是否值得继续推进',
        currentFocus: '完成立项评估与机会判断。',
        currentGap: '需要补齐客户背景、关键风险和是否继续投入的判断。',
        nextStep: '确认范围后进入范围确认。',
        ownerFallback: '销售负责人'
    },
    'scope-confirmation': {
        headline: '把范围、排除项和前期成本先说清楚',
        currentFocus: '收口技术边界、排除项和前期成本。',
        currentGap: '需要明确范围、风险和估算依据。',
        nextStep: '范围和风险清楚后进入商务收口。',
        ownerFallback: '技术支持 / 售前'
    },
    'commercial-closure': {
        headline: '把报价、投标和成交条件统一到一个口径',
        currentFocus: '统一报价、投标和成交条件判断。',
        currentGap: '需要完成报价、投标或商务条件收口。',
        nextStep: '满足签约前置条件后进入签约。',
        ownerFallback: '销售负责人 / 商务负责人'
    },
    contracting: {
        headline: '把合同登记、审核和生效做成正式依据',
        currentFocus: '完成合同登记、审核和生效。',
        currentGap: '需要形成正式合同和签约依据。',
        nextStep: '合同生效后进入项目移交。',
        ownerFallback: '商务行政 / 销售负责人'
    },
    handover: {
        headline: '把项目移交清楚，避免责任边界不明',
        currentFocus: '完成项目移交并明确责任边界。',
        currentGap: '需要完成移交确认、责任归口和下游冻结依据。',
        nextStep: '移交完成后进入正式执行。',
        ownerFallback: '销售 / 技术支持 / 项目负责人'
    },
    execution: {
        headline: '围绕经营、回款、成本和提成条件持续推进',
        currentFocus: '跟进经营总览、偏差风险和阶段解释。',
        currentGap: '若缺少经营快照、回款或成本事实，相关页面会提示待补条件。',
        nextStep: '优先查看经营总览、偏差风险和阶段解释。',
        ownerFallback: '项目负责人 / 财务'
    },
    acceptance: {
        headline: '核对验收事实与收尾条件',
        currentFocus: '核对验收事实、最终结算和质保金相关条件。',
        currentGap: '需要补齐验收、最终结算或质保金相关事实。',
        nextStep: '满足完成条件后进入项目完成。',
        ownerFallback: '项目负责人 / 财务'
    },
    completed: {
        headline: '项目主线已完成，重点看归档和结算',
        currentFocus: '查看最终结算、规则解释和归档结果。',
        currentGap: '如仍有质保金或结算事项，请进入提成相关页面处理。',
        nextStep: '按归档结果处理后续复核或质保金事项。',
        ownerFallback: '项目负责人 / 财务'
    },
    'closed-lost': {
        headline: '项目已丢单',
        currentFocus: '查看关闭原因和归档事实。',
        currentGap: '项目已关闭，不再推进后续阶段。',
        nextStep: '保留归档依据，必要时复盘客户和商务原因。',
        ownerFallback: '销售负责人'
    },
    'closed-terminated': {
        headline: '项目已终止',
        currentFocus: '查看终止原因和归档事实。',
        currentGap: '项目已关闭，不再推进后续阶段。',
        nextStep: '保留终止依据，必要时复盘合同和交付风险。',
        ownerFallback: '项目负责人'
    }
};

@Injectable()
export class ProjectQueryService {
    constructor(
        private readonly projectRepository: ProjectRepository,
        private readonly approvalSummarySnapshotRepository: ApprovalSummarySnapshotRepository,
        private readonly sensitiveFieldProjectionService: SensitiveFieldProjectionService
    ) {}

    async listProjects(query: ProjectListQuery): Promise<ProjectListView[]> {
        const projects = await this.projectRepository.findMany(query);
        const ownerUserIds = [...new Set(projects.map((project) => project.ownerUserId).filter((id): id is string => Boolean(id)))];
        const ownerOrgIds = [...new Set(projects.map((project) => project.ownerOrgId).filter((id): id is string => Boolean(id)))];
        const projectIds = projects.map((project) => project.id);

        const [users, orgUnits, latestSignedAtByProjectId] = await Promise.all([
            this.projectRepository.findPlatformUsersByIds(ownerUserIds),
            this.projectRepository.findOrgUnitsByIds(ownerOrgIds),
            this.projectRepository.findLatestSignedContractAtByProjectIds(projectIds)
        ]);

        const ownerNameByUserId = new Map(users.map((user) => [user.id, user.displayName] as const));
        const ownerOrgNameById = new Map(orgUnits.map((orgUnit) => [orgUnit.id, orgUnit.name] as const));

        return projects
            .map<ProjectListView>((project) => {
                const signedAt = latestSignedAtByProjectId.get(project.id) ?? null;
                const latestMilestoneAt = [project.closedAt, signedAt]
                    .filter((candidate): candidate is Date => candidate instanceof Date)
                    .sort((left, right) => right.getTime() - left.getTime())[0];

                return {
                    id: project.id,
                    projectNo: project.projectNo,
                    projectName: project.projectName,
                    customerName: project.customerName ?? null,
                    customerProjectNo: project.customerProjectNo ?? null,
                    currentStage: project.currentStage,
                    status: project.status,
                    ownerOrgName: project.ownerOrgId ? (ownerOrgNameById.get(project.ownerOrgId) ?? null) : null,
                    ownerName: project.ownerUserId ? (ownerNameByUserId.get(project.ownerUserId) ?? null) : null,
                    latestMilestoneAt: latestMilestoneAt?.toISOString() ?? null,
                    createdAt: project.createdAt.toISOString()
                };
            })
            .sort((left, right) => {
                if (left.latestMilestoneAt && right.latestMilestoneAt && left.latestMilestoneAt !== right.latestMilestoneAt) {
                    return right.latestMilestoneAt.localeCompare(left.latestMilestoneAt);
                }

                if (left.latestMilestoneAt && !right.latestMilestoneAt) {
                    return -1;
                }

                if (!left.latestMilestoneAt && right.latestMilestoneAt) {
                    return 1;
                }

                return right.createdAt.localeCompare(left.createdAt);
            });
    }

    async getProjectDetail(
        id: string,
        user: UserPayload,
        requestContext: SensitiveFieldProjectionRequestContext = { path: `project-detail:${id}` }
    ): Promise<ProjectDetailView> {
        const project = await this.projectRepository.findById(id);
        if (!project) {
            throw new NotFoundException(`Project ${id} not found`);
        }

        const [ownerUsers, ownerOrgUnits, contracts, approvalSummarySnapshot, currentBidCommercialProcess, sourceLeads] = await Promise.all([
            project.ownerUserId ? this.projectRepository.findPlatformUsersByIds([project.ownerUserId]) : Promise.resolve([]),
            project.ownerOrgId ? this.projectRepository.findOrgUnitsByIds([project.ownerOrgId]) : Promise.resolve([]),
            this.projectRepository.findContractsByProjectId(project.id),
            this.approvalSummarySnapshotRepository.findActiveByTarget(
                PROJECT_DETAIL_TARGET_TYPE,
                project.id,
                PROJECT_DETAIL_SUMMARY_SCENARIO_KEY,
                PROJECT_DETAIL_SUMMARY_PROJECTION_LEVEL
            ),
            this.projectRepository.findCurrentProjectBidCommercialProcessByProjectId(project.id),
            project.sourceLeadId ? this.projectRepository.findLeadsByIds([project.sourceLeadId]) : Promise.resolve([])
        ]);

        const ownerName = project.ownerUserId ? (ownerUsers[0]?.displayName ?? null) : null;
        const ownerOrgName = project.ownerOrgId ? (ownerOrgUnits[0]?.name ?? null) : null;
        const sourceLead = sourceLeads[0] ?? null;
        const currentContractSummary = await this.buildContractSummary(contracts, user, requestContext, project.id);
        const currentApprovalSummary: ProjectDetailView['currentApprovalSummary'] = approvalSummarySnapshot
            ? {
                  summarySnapshotId: approvalSummarySnapshot.id,
                  summaryPackageKey: approvalSummarySnapshot.summaryPackageKey,
                  projectionLevel: approvalSummarySnapshot.projectionLevel,
                  exportPolicy: approvalSummarySnapshot.exportPolicy,
                  generatedAt: approvalSummarySnapshot.generatedAt.toISOString()
              }
            : {
                  summarySnapshotId: null,
                  summaryPackageKey: null,
                  projectionLevel: null,
                  exportPolicy: null,
                  generatedAt: null
              };

        return {
            id: project.id,
            projectNo: project.projectNo,
            projectName: project.projectName,
            sourceLeadId: project.sourceLeadId ?? null,
            customerId: project.customerId ?? null,
            customerName: project.customerName ?? null,
            customerProjectNo: project.customerProjectNo ?? null,
            status: project.status,
            currentStage: project.currentStage,
            ownerOrgId: project.ownerOrgId ?? null,
            ownerUserId: project.ownerUserId ?? null,
            plannedSignAt: project.plannedSignAt?.toISOString() ?? null,
            closedAt: project.closedAt?.toISOString() ?? null,
            closedReason: project.closedReason ?? null,
            rowVersion: project.rowVersion,
            createdAt: project.createdAt.toISOString(),
            createdBy: project.createdBy ?? null,
            updatedAt: project.updatedAt.toISOString(),
            updatedBy: project.updatedBy ?? null,
            ownerName,
            ownerOrgName,
            sourceLeadSummary: this.buildSourceLeadSummary(sourceLead),
            stageSummary: this.buildStageSummary(project),
            currentBidSummary: this.buildBidSummary(currentBidCommercialProcess),
            currentContractSummary,
            currentApprovalSummary,
            currentConfirmationSummary: this.buildConfirmationSummary(),
            summarySnapshotId: approvalSummarySnapshot?.id ?? null,
            projectionLevel: approvalSummarySnapshot?.projectionLevel ?? null,
            exportPolicy: approvalSummarySnapshot?.exportPolicy ?? null,
            allowedActions: this.buildAllowedActions(project, user.permissions),
            generatedAt: new Date().toISOString()
        };
    }

    async getProjectWorkspaceGuidance(projectId: string, user: UserPayload): Promise<ProjectWorkspaceGuidanceView> {
        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new NotFoundException(`Project ${projectId} not found`);
        }

        const [ownerUsers, ownerOrgUnits, approvalSummarySnapshot] = await Promise.all([
            project.ownerUserId ? this.projectRepository.findPlatformUsersByIds([project.ownerUserId]) : Promise.resolve([]),
            project.ownerOrgId ? this.projectRepository.findOrgUnitsByIds([project.ownerOrgId]) : Promise.resolve([]),
            this.approvalSummarySnapshotRepository.findActiveByTarget(
                PROJECT_DETAIL_TARGET_TYPE,
                project.id,
                PROJECT_DETAIL_SUMMARY_SCENARIO_KEY,
                PROJECT_DETAIL_SUMMARY_PROJECTION_LEVEL
            )
        ]);
        const ownerName = project.ownerUserId ? (ownerUsers[0]?.displayName ?? null) : null;
        const ownerOrgName = project.ownerOrgId ? (ownerOrgUnits[0]?.name ?? null) : null;
        const blockingReasons = this.buildWorkspaceBlockingReasons(project);
        const guidance = this.buildWorkspaceGuidanceText(project, blockingReasons);
        const allowedActions = this.buildAllowedActions(project, user.permissions);

        return {
            projectId: project.id,
            currentStage: project.currentStage,
            status: project.status,
            currentStageLabel: this.getStageLabel(project.currentStage),
            statusLabel: this.getStatusLabel(project.status),
            headline: guidance.headline,
            currentFocus: guidance.currentFocus,
            currentGap: guidance.currentGap,
            nextStep: guidance.nextStep,
            ownerLabel: this.buildOwnerLabel(ownerName, ownerOrgName, guidance.ownerFallback),
            blockingReasons,
            basisSummary: {
                summarySnapshotId: approvalSummarySnapshot?.id ?? null,
                projectionLevel: approvalSummarySnapshot?.projectionLevel ?? null,
                exportPolicy: approvalSummarySnapshot?.exportPolicy ?? null,
                generatedAt: approvalSummarySnapshot?.generatedAt.toISOString() ?? null
            },
            recommendedEntries: this.buildWorkspaceEntries(project, user.permissions, allowedActions),
            generatedAt: new Date().toISOString()
        };
    }

    async listAcceptanceRecords(projectId: string): Promise<AcceptanceRecordList> {
        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new NotFoundException(`Project ${projectId} not found`);
        }

        const records = await this.projectRepository.findAcceptanceRecordsByProjectId(project.id);
        return records.map((record) => this.mapAcceptanceRecord(record));
    }

    async listProjectCompletionRecords(projectId: string): Promise<ProjectCompletionRecordList> {
        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new NotFoundException(`Project ${projectId} not found`);
        }

        const records = await this.projectRepository.findProjectCompletionRecordsByProjectId(project.id);
        const completedByIds = [...new Set(records.map((record) => record.completedBy).filter((id): id is string => Boolean(id)))];
        const users = await this.projectRepository.findPlatformUsersByIds(completedByIds);
        const userNameById = new Map(users.map((user) => [user.id, user.displayName] as const));
        return records.map((record) => this.mapProjectCompletionRecord(record, userNameById));
    }

    async listProjectArchiveRecords(projectId: string, user: UserPayload): Promise<ProjectArchiveRecordList> {
        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new NotFoundException(`Project ${projectId} not found`);
        }

        const records = await this.projectRepository.findProjectArchiveRecordsByProjectId(project.id);
        const archivedByIds = [
            ...new Set(records.flatMap((record) => [record.archivedBy, record.voidedBy]).filter((id): id is string => Boolean(id)))
        ];
        const users = await this.projectRepository.findPlatformUsersByIds(archivedByIds);
        const userNameById = new Map(users.map((user) => [user.id, user.displayName] as const));
        return records.map((record) => this.mapProjectArchiveRecord(record, userNameById, project, user.permissions));
    }

    async listProjectBidCommercialProcesses(projectId: string): Promise<ProjectBidCommercialProcessList> {
        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new NotFoundException(`Project ${projectId} not found`);
        }

        const processes = await this.projectRepository.findProjectBidCommercialProcessesByProjectId(project.id);
        return processes.map((item) => this.mapProjectBidCommercialProcess(item));
    }

    async getProjectBidCommercialWorkspace(projectId: string, user: UserPayload): Promise<ProjectBidCommercialWorkspaceView> {
        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new NotFoundException(`Project ${projectId} not found`);
        }

        const [ownerUsers, ownerOrgUnits, currentProcess] = await Promise.all([
            project.ownerUserId ? this.projectRepository.findPlatformUsersByIds([project.ownerUserId]) : Promise.resolve([]),
            project.ownerOrgId ? this.projectRepository.findOrgUnitsByIds([project.ownerOrgId]) : Promise.resolve([]),
            this.projectRepository.findCurrentProjectBidCommercialProcessByProjectId(project.id)
        ]);
        const ownerName = project.ownerUserId ? (ownerUsers[0]?.displayName ?? null) : null;
        const ownerOrgName = project.ownerOrgId ? (ownerOrgUnits[0]?.name ?? null) : null;
        const allowedActions = this.buildBidCommercialAllowedActions(project, user.permissions);

        if (!currentProcess) {
            return {
                projectId: project.id,
                currentStage: project.currentStage,
                status: project.status,
                currentProcess: null,
                materialItems: [],
                timelineItems: [],
                blockingReasons: ['尚未形成招投标 / 商务竞标过程记录。'],
                nextStep: '明确是否需要投标、邀标、比选、商务竞标或直接商务报价路径。',
                ownerLabel: this.buildOwnerLabel(ownerName, ownerOrgName, '销售 / 商务'),
                allowedActions,
                generatedAt: new Date().toISOString()
            };
        }

        const [materialItems, timelineItems] = await Promise.all([
            this.projectRepository.findProjectBidCommercialMaterialItemsByProcessIds([currentProcess.id]),
            this.projectRepository.findProjectBidCommercialTimelineItemsByProcessIds([currentProcess.id])
        ]);

        return {
            projectId: project.id,
            currentStage: project.currentStage,
            status: project.status,
            currentProcess: this.mapProjectBidCommercialProcess(currentProcess),
            materialItems: materialItems.map((item) => this.mapProjectBidCommercialMaterialItem(item)),
            timelineItems: timelineItems.map((item) => this.mapProjectBidCommercialTimelineItem(item)),
            blockingReasons: this.buildBidCommercialBlockingReasons(currentProcess, materialItems),
            nextStep: this.buildBidCommercialNextStep(currentProcess, materialItems),
            ownerLabel: this.buildOwnerLabel(ownerName, ownerOrgName, currentProcess.ownerRole ?? '销售 / 商务'),
            allowedActions,
            generatedAt: new Date().toISOString()
        };
    }

    async listProjectPricingMarginReviews(projectId: string): Promise<ProjectPricingMarginReviewList> {
        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new NotFoundException(`Project ${projectId} not found`);
        }

        const reviews = await this.projectRepository.findProjectPricingMarginReviewsByProjectId(project.id);
        return reviews.map((item) => this.mapProjectPricingMarginReview(item));
    }

    async getProjectPricingMarginWorkspace(projectId: string, user: UserPayload): Promise<ProjectPricingMarginWorkspaceView> {
        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new NotFoundException(`Project ${projectId} not found`);
        }

        const [ownerUsers, ownerOrgUnits, currentReview, currentTechnicalCostPackage, currentBidCommercialProcess] = await Promise.all([
            project.ownerUserId ? this.projectRepository.findPlatformUsersByIds([project.ownerUserId]) : Promise.resolve([]),
            project.ownerOrgId ? this.projectRepository.findOrgUnitsByIds([project.ownerOrgId]) : Promise.resolve([]),
            this.projectRepository.findCurrentProjectPricingMarginReviewByProjectId(project.id),
            this.projectRepository.findCurrentProjectTechnicalCostPackageByProjectId(project.id),
            this.projectRepository.findCurrentProjectBidCommercialProcessByProjectId(project.id)
        ]);
        const ownerName = project.ownerUserId ? (ownerUsers[0]?.displayName ?? null) : null;
        const ownerOrgName = project.ownerOrgId ? (ownerOrgUnits[0]?.name ?? null) : null;
        const allowedActions = this.buildPricingMarginAllowedActions(project, user.permissions);

        if (!currentReview) {
            const blockingReasons = this.buildPricingMarginPrerequisiteBlockingReasons(currentTechnicalCostPackage, currentBidCommercialProcess);
            return {
                projectId: project.id,
                currentStage: project.currentStage,
                status: project.status,
                currentReview: null,
                technicalCostPackage: currentTechnicalCostPackage
                    ? this.mapProjectTechnicalCostPackage(currentTechnicalCostPackage)
                    : null,
                bidCommercialProcess: currentBidCommercialProcess
                    ? this.mapProjectBidCommercialProcess(currentBidCommercialProcess)
                    : null,
                conditionItems: [],
                blockingReasons: blockingReasons.length > 0 ? blockingReasons : ['尚未形成报价与毛利评审记录。'],
                nextStep: this.buildPricingMarginEmptyNextStep(currentTechnicalCostPackage, currentBidCommercialProcess),
                readyForContracting: false,
                ownerLabel: this.buildOwnerLabel(ownerName, ownerOrgName, '销售 / 财务'),
                allowedActions,
                generatedAt: new Date().toISOString()
            };
        }

        const [conditionItems, technicalCostPackage, bidCommercialProcess] = await Promise.all([
            this.projectRepository.findProjectPricingMarginConditionItemsByReviewIds([currentReview.id]),
            this.projectRepository.findProjectTechnicalCostPackageById(currentReview.technicalCostPackageId),
            currentReview.bidCommercialProcessId
                ? this.projectRepository.findProjectBidCommercialProcessById(currentReview.bidCommercialProcessId)
                : Promise.resolve(null)
        ]);

        return {
            projectId: project.id,
            currentStage: project.currentStage,
            status: project.status,
            currentReview: this.mapProjectPricingMarginReview(currentReview),
            technicalCostPackage: technicalCostPackage ? this.mapProjectTechnicalCostPackage(technicalCostPackage) : null,
            bidCommercialProcess: bidCommercialProcess ? this.mapProjectBidCommercialProcess(bidCommercialProcess) : null,
            conditionItems: conditionItems.map((item) => this.mapProjectPricingMarginConditionItem(item)),
            blockingReasons: this.buildPricingMarginBlockingReasons(currentReview, conditionItems, technicalCostPackage),
            nextStep: this.buildPricingMarginNextStep(currentReview, conditionItems, technicalCostPackage),
            readyForContracting: currentReview.readyForContracting,
            ownerLabel: this.buildOwnerLabel(ownerName, ownerOrgName, currentReview.ownerRole ?? '销售 / 财务'),
            allowedActions,
            generatedAt: new Date().toISOString()
        };
    }

    async listProjectTechnicalCostPackages(projectId: string): Promise<ProjectTechnicalCostPackageList> {
        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new NotFoundException(`Project ${projectId} not found`);
        }

        const packages = await this.projectRepository.findProjectTechnicalCostPackagesByProjectId(project.id);
        return packages.map((item) => this.mapProjectTechnicalCostPackage(item));
    }

    async getProjectTechnicalCostWorkspace(projectId: string, user: UserPayload): Promise<ProjectTechnicalCostWorkspaceView> {
        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new NotFoundException(`Project ${projectId} not found`);
        }

        const [ownerUsers, ownerOrgUnits, currentPackage] = await Promise.all([
            project.ownerUserId ? this.projectRepository.findPlatformUsersByIds([project.ownerUserId]) : Promise.resolve([]),
            project.ownerOrgId ? this.projectRepository.findOrgUnitsByIds([project.ownerOrgId]) : Promise.resolve([]),
            this.projectRepository.findCurrentProjectTechnicalCostPackageByProjectId(project.id)
        ]);
        const ownerName = project.ownerUserId ? (ownerUsers[0]?.displayName ?? null) : null;
        const ownerOrgName = project.ownerOrgId ? (ownerOrgUnits[0]?.name ?? null) : null;
        const allowedActions = this.buildTechnicalCostAllowedActions(project, user.permissions);

        if (!currentPackage) {
            return {
                projectId: project.id,
                currentStage: project.currentStage,
                status: project.status,
                currentPackage: null,
                scopeItems: [],
                riskItems: [],
                costItems: [],
                blockingReasons: ['尚未形成技术与成本测算版本包。'],
                nextStep: '补齐技术可行性、范围边界、风险项和成本税务估算。',
                ownerLabel: this.buildOwnerLabel(ownerName, ownerOrgName, '技术支持 / 售前'),
                allowedActions,
                generatedAt: new Date().toISOString()
            };
        }

        const [scopeItems, riskItems, costItems] = await Promise.all([
            this.projectRepository.findProjectTechnicalScopeItemsByPackageIds([currentPackage.id]),
            this.projectRepository.findProjectTechnicalRiskItemsByPackageIds([currentPackage.id]),
            this.projectRepository.findProjectTechnicalCostItemsByPackageIds([currentPackage.id])
        ]);

        return {
            projectId: project.id,
            currentStage: project.currentStage,
            status: project.status,
            currentPackage: this.mapProjectTechnicalCostPackage(currentPackage),
            scopeItems: scopeItems.map((item) => this.mapProjectTechnicalScopeItem(item)),
            riskItems: riskItems.map((item) => this.mapProjectTechnicalRiskItem(item)),
            costItems: costItems.map((item) => this.mapProjectTechnicalCostItem(item)),
            blockingReasons: this.buildTechnicalCostBlockingReasons(currentPackage, riskItems),
            nextStep: this.buildTechnicalCostNextStep(currentPackage, riskItems),
            ownerLabel: this.buildOwnerLabel(ownerName, ownerOrgName, '技术支持 / 售前'),
            allowedActions,
            generatedAt: new Date().toISOString()
        };
    }

    async getProjectTimeline(projectId: string): Promise<ProjectTimelineView> {
        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new NotFoundException(`Project ${projectId} not found`);
        }

        const [contracts, latestConfirmedHandover, latestAcceptedAcceptanceRecord, latestProjectCompletionRecord, latestArchiveRecord] = await Promise.all([
            this.projectRepository.findContractsByProjectId(project.id),
            this.projectRepository.findLatestConfirmedHandoverByProjectId(project.id),
            this.projectRepository.findLatestAcceptedAcceptanceRecordByProjectId(project.id),
            this.projectRepository.findLatestConfirmedProjectCompletionRecordByProjectId(project.id),
            this.projectRepository.findLatestRecordedProjectArchiveRecordByProjectId(project.id)
        ]);
        const firstSignedContract =
            contracts
                .filter((contract): contract is Contract & { signedAt: Date } => contract.signedAt instanceof Date)
                .sort((left, right) => left.signedAt.getTime() - right.signedAt.getTime())[0] ?? null;
        const actorUserIds = [
            project.createdBy,
            firstSignedContract?.updatedBy ?? firstSignedContract?.createdBy ?? null,
            latestConfirmedHandover?.confirmedBy ?? null,
            latestAcceptedAcceptanceRecord?.confirmedBy ?? null,
            latestProjectCompletionRecord?.completedBy ?? null,
            latestArchiveRecord?.archivedBy ?? null,
            project.closedAt ? project.updatedBy : null
        ].filter((id): id is string => Boolean(id));
        const users = await this.projectRepository.findPlatformUsersByIds([...new Set(actorUserIds)]);
        const actorNameByUserId = new Map(users.map((user) => [user.id, user.displayName] as const));
        const events: ProjectTimelineView['events'] = [
            {
                eventKey: 'project-created',
                stage: 'assessment',
                stageLabel: this.getStageLabel('assessment'),
                eventType: 'stage-entered',
                occurredAt: project.createdAt.toISOString(),
                actorUserId: project.createdBy ?? null,
                actorName: this.resolveActorName(project.createdBy, actorNameByUserId),
                resultLabel: '项目创建',
                sourceType: 'project',
                sourceId: project.id,
                evidenceLabel: project.projectNo,
                isAuthoritative: true
            }
        ];

        if (firstSignedContract?.signedAt) {
            const actorUserId = firstSignedContract.updatedBy ?? firstSignedContract.createdBy ?? null;
            events.push({
                eventKey: `contract-signed:${firstSignedContract.id}`,
                stage: 'contracting',
                stageLabel: this.getStageLabel('contracting'),
                eventType: 'stage-completed',
                occurredAt: firstSignedContract.signedAt.toISOString(),
                actorUserId,
                actorName: this.resolveActorName(actorUserId, actorNameByUserId),
                resultLabel: '合同签约完成',
                sourceType: 'contract',
                sourceId: firstSignedContract.id,
                evidenceLabel: firstSignedContract.contractNo,
                isAuthoritative: true
            });
        }

        if (latestConfirmedHandover?.confirmedAt) {
            events.push({
                eventKey: `project-handover-confirmed:${latestConfirmedHandover.id}`,
                stage: 'handover',
                stageLabel: this.getStageLabel('handover'),
                eventType: 'stage-completed',
                occurredAt: latestConfirmedHandover.confirmedAt.toISOString(),
                actorUserId: latestConfirmedHandover.confirmedBy ?? null,
                actorName: this.resolveActorName(latestConfirmedHandover.confirmedBy, actorNameByUserId),
                resultLabel: '项目移交完成',
                sourceType: 'project-handover',
                sourceId: latestConfirmedHandover.id,
                evidenceLabel: '移交确认',
                isAuthoritative: true
            });
        }

        if (latestAcceptedAcceptanceRecord?.confirmedAt) {
            const acceptanceTypeLabel = ACCEPTANCE_RECORD_TYPE_LABELS[latestAcceptedAcceptanceRecord.acceptanceType];
            const acceptanceResultLabel = ACCEPTANCE_RECORD_RESULT_LABELS[latestAcceptedAcceptanceRecord.acceptanceResult];
            events.push({
                eventKey: `acceptance-confirmed:${latestAcceptedAcceptanceRecord.id}`,
                stage: 'acceptance',
                stageLabel: this.getStageLabel('acceptance'),
                eventType: 'stage-completed',
                occurredAt: latestAcceptedAcceptanceRecord.confirmedAt.toISOString(),
                actorUserId: latestAcceptedAcceptanceRecord.confirmedBy ?? null,
                actorName: this.resolveActorName(latestAcceptedAcceptanceRecord.confirmedBy, actorNameByUserId),
                resultLabel: `${acceptanceTypeLabel}${acceptanceResultLabel}`,
                sourceType: 'acceptance-record',
                sourceId: latestAcceptedAcceptanceRecord.id,
                evidenceLabel: latestAcceptedAcceptanceRecord.evidenceSummary,
                isAuthoritative: true
            });
        }

        if (latestProjectCompletionRecord?.completedAt) {
            events.push({
                eventKey: `project-completed:${latestProjectCompletionRecord.id}`,
                stage: 'completed',
                stageLabel: this.getStageLabel('completed'),
                eventType: 'stage-completed',
                occurredAt: latestProjectCompletionRecord.completedAt.toISOString(),
                actorUserId: latestProjectCompletionRecord.completedBy ?? null,
                actorName: this.resolveActorName(latestProjectCompletionRecord.completedBy, actorNameByUserId),
                resultLabel: PROJECT_COMPLETION_RECORD_RESULT_LABELS[latestProjectCompletionRecord.completionResult],
                sourceType: 'project-completion-record',
                sourceId: latestProjectCompletionRecord.id,
                evidenceLabel: latestProjectCompletionRecord.evidenceSummary,
                isAuthoritative: true
            });
        }

        if (latestArchiveRecord?.archivedAt) {
            events.push({
                eventKey: `project-archived:${latestArchiveRecord.id}`,
                stage: latestArchiveRecord.archiveAnchorStage,
                stageLabel: this.getStageLabel(latestArchiveRecord.archiveAnchorStage),
                eventType: 'milestone',
                occurredAt: latestArchiveRecord.archivedAt.toISOString(),
                actorUserId: latestArchiveRecord.archivedBy ?? null,
                actorName: this.resolveActorName(latestArchiveRecord.archivedBy, actorNameByUserId),
                resultLabel: `${PROJECT_ARCHIVE_RESULT_LABEL_PREFIX}：${latestArchiveRecord.archiveSummary}`,
                sourceType: 'project-archive-record',
                sourceId: latestArchiveRecord.id,
                evidenceLabel: latestArchiveRecord.evidenceSummary,
                isAuthoritative: true
            });
        }

        if (project.closedAt) {
            events.push({
                eventKey: 'project-closed',
                stage: project.currentStage,
                stageLabel: this.getStageLabel(project.currentStage),
                eventType: 'stage-completed',
                occurredAt: project.closedAt.toISOString(),
                actorUserId: project.updatedBy ?? null,
                actorName: this.resolveActorName(project.updatedBy, actorNameByUserId),
                resultLabel: project.closedReason ? `项目关闭：${project.closedReason}` : '项目关闭',
                sourceType: 'project',
                sourceId: project.id,
                evidenceLabel: project.closedReason ?? '项目关闭',
                isAuthoritative: true
            });
        }

        return {
            projectId: project.id,
            events: events.sort((left, right) => {
                const byOccurredAt = left.occurredAt.localeCompare(right.occurredAt);
                if (byOccurredAt !== 0) {
                    return byOccurredAt;
                }

                return left.eventKey.localeCompare(right.eventKey);
            }),
            generatedAt: new Date().toISOString()
        };
    }

    private mapProjectArchiveRecord(
        record: ProjectArchiveRecord,
        userNameById: Map<string, string> = new Map(),
        project?: Project,
        permissions: PermissionKey[] = []
    ): ProjectArchiveRecordSummary {
        return {
            id: record.id,
            projectId: record.projectId,
            archiveAnchorStage: record.archiveAnchorStage,
            archiveAnchorSourceType: record.archiveAnchorSourceType,
            archiveAnchorSourceId: record.archiveAnchorSourceId,
            status: record.status,
            archivedAt: record.archivedAt.toISOString(),
            archivedBy: record.archivedBy ?? null,
            archivedByName: record.archivedBy ? (userNameById.get(record.archivedBy) ?? null) : null,
            archiveSummary: record.archiveSummary,
            evidenceSummary: record.evidenceSummary,
            supersedesArchiveRecordId: record.supersedesArchiveRecordId ?? null,
            replacementReason: record.replacementReason ?? null,
            voidedAt: record.voidedAt?.toISOString() ?? null,
            voidedBy: record.voidedBy ?? null,
            voidedByName: record.voidedBy ? (userNameById.get(record.voidedBy) ?? null) : null,
            voidReason: record.voidReason ?? null,
            createdAt: record.createdAt.toISOString(),
            createdBy: record.createdBy ?? null,
            updatedAt: record.updatedAt.toISOString(),
            updatedBy: record.updatedBy ?? null,
            rowVersion: record.rowVersion,
            allowedActions: project ? this.buildProjectArchiveRecordAllowedActions(record, project, permissions) : []
        };
    }

    private mapProjectCompletionRecord(record: ProjectCompletionRecord, userNameById: Map<string, string> = new Map()): ProjectCompletionRecordSummary {
        return {
            id: record.id,
            projectId: record.projectId,
            acceptanceRecordId: record.acceptanceRecordId,
            completionResult: record.completionResult,
            status: record.status,
            completedAt: record.completedAt.toISOString(),
            completedBy: record.completedBy ?? null,
            completedByName: record.completedBy ? (userNameById.get(record.completedBy) ?? null) : null,
            completionSummary: record.completionSummary,
            evidenceSummary: record.evidenceSummary,
            createdAt: record.createdAt.toISOString(),
            createdBy: record.createdBy ?? null,
            updatedAt: record.updatedAt.toISOString(),
            updatedBy: record.updatedBy ?? null,
            rowVersion: record.rowVersion
        };
    }

    private mapAcceptanceRecord(record: AcceptanceRecord): AcceptanceRecordSummary {
        return {
            id: record.id,
            projectId: record.projectId,
            acceptanceType: record.acceptanceType,
            acceptanceResult: record.acceptanceResult,
            status: record.status,
            scopeSummary: record.scopeSummary,
            evidenceSummary: record.evidenceSummary,
            comment: record.comment ?? null,
            confirmationRecordId: record.confirmationRecordId ?? null,
            confirmedAt: record.confirmedAt.toISOString(),
            confirmedBy: record.confirmedBy ?? null,
            createdAt: record.createdAt.toISOString(),
            createdBy: record.createdBy ?? null,
            updatedAt: record.updatedAt.toISOString(),
            updatedBy: record.updatedBy ?? null,
            rowVersion: record.rowVersion
        };
    }

    private mapProjectBidCommercialProcess(record: ProjectBidCommercialProcess): ProjectBidCommercialProcessSummary {
        return {
            id: record.id,
            projectId: record.projectId,
            version: record.version,
            isCurrent: record.isCurrent,
            supersedesId: record.supersedesId ?? null,
            status: record.status,
            bidMode: record.bidMode,
            currentStage: record.currentStage,
            decision: record.decision,
            resultStatus: record.resultStatus,
            processSummary: record.processSummary,
            decisionSummary: record.decisionSummary ?? null,
            resultSummary: record.resultSummary ?? null,
            tenderNo: record.tenderNo ?? null,
            bidPackageNo: record.bidPackageNo ?? null,
            ownerRole: record.ownerRole ?? null,
            blockerCount: record.blockerCount,
            effectiveAt: record.effectiveAt.toISOString(),
            createdAt: record.createdAt.toISOString(),
            createdBy: record.createdBy ?? null,
            updatedAt: record.updatedAt.toISOString(),
            updatedBy: record.updatedBy ?? null,
            rowVersion: record.rowVersion
        };
    }

    private mapProjectBidCommercialMaterialItem(record: ProjectBidCommercialMaterialItem): ProjectBidCommercialMaterialItemView {
        return {
            id: record.id,
            processId: record.processId,
            materialKey: record.materialKey,
            label: record.label,
            materialStatus: record.materialStatus,
            responsibleRole: record.responsibleRole ?? null,
            dueAt: record.dueAt?.toISOString() ?? null,
            blocksNextStep: record.blocksNextStep,
            navigationHint: record.navigationHint ?? null,
            sortOrder: record.sortOrder
        };
    }

    private mapProjectBidCommercialTimelineItem(record: ProjectBidCommercialTimelineItem): ProjectBidCommercialTimelineItemView {
        return {
            id: record.id,
            processId: record.processId,
            eventKey: record.eventKey,
            label: record.label,
            summary: record.summary ?? null,
            timelineStatus: record.timelineStatus,
            occurredAt: record.occurredAt?.toISOString() ?? null,
            dueAt: record.dueAt?.toISOString() ?? null,
            responsibleRole: record.responsibleRole ?? null,
            sortOrder: record.sortOrder
        };
    }

    private mapProjectPricingMarginReview(record: ProjectPricingMarginReview): ProjectPricingMarginReviewSummary {
        return {
            id: record.id,
            projectId: record.projectId,
            version: record.version,
            isCurrent: record.isCurrent,
            supersedesId: record.supersedesId ?? null,
            status: record.status,
            technicalCostPackageId: record.technicalCostPackageId,
            bidCommercialProcessId: record.bidCommercialProcessId ?? null,
            commercialReleaseBaselineId: record.commercialReleaseBaselineId ?? null,
            pricingPath: record.pricingPath,
            quoteVersion: record.quoteVersion,
            currencyCode: record.currencyCode,
            quoteAmountTaxInclusive: this.toDecimalString(record.quoteAmountTaxInclusive),
            quoteAmountTaxExclusive: this.toDecimalString(record.quoteAmountTaxExclusive),
            taxRate: this.toDecimalString(record.taxRate),
            taxConditionSummary: record.taxConditionSummary,
            paymentTermsSummary: record.paymentTermsSummary,
            grossMarginRate: this.toNullableDecimalString(record.grossMarginRate),
            grossMarginBand: record.grossMarginBand,
            grossMarginSummary: record.grossMarginSummary,
            decision: record.decision,
            decisionSummary: record.decisionSummary,
            approvalScenarioKey: record.approvalScenarioKey ?? null,
            summaryPackageKey: record.summaryPackageKey ?? null,
            summarySnapshotId: record.summarySnapshotId ?? null,
            projectionLevel: record.projectionLevel ?? null,
            exportPolicy: record.exportPolicy ?? null,
            readyForContracting: record.readyForContracting,
            ownerRole: record.ownerRole ?? null,
            blockerCount: record.blockerCount,
            effectiveAt: record.effectiveAt.toISOString(),
            createdAt: record.createdAt.toISOString(),
            createdBy: record.createdBy ?? null,
            updatedAt: record.updatedAt.toISOString(),
            updatedBy: record.updatedBy ?? null,
            rowVersion: record.rowVersion
        };
    }

    private mapProjectPricingMarginConditionItem(record: ProjectPricingMarginConditionItem): ProjectPricingMarginConditionItemView {
        return {
            id: record.id,
            reviewId: record.reviewId,
            conditionKey: record.conditionKey,
            conditionType: record.conditionType,
            label: record.label,
            conditionSummary: record.conditionSummary,
            conditionStatus: record.conditionStatus,
            requiredForContracting: record.requiredForContracting,
            responsibleRole: record.responsibleRole ?? null,
            dueAt: record.dueAt?.toISOString() ?? null,
            resolutionSummary: record.resolutionSummary ?? null,
            sortOrder: record.sortOrder
        };
    }

    private mapProjectTechnicalCostPackage(record: ProjectTechnicalCostPackage): ProjectTechnicalCostPackageSummary {
        return {
            id: record.id,
            projectId: record.projectId,
            version: record.version,
            isCurrent: record.isCurrent,
            supersedesId: record.supersedesId ?? null,
            status: record.status,
            technicalFeasibilityDecision: record.technicalFeasibilityDecision,
            technicalConclusionSummary: record.technicalConclusionSummary,
            allowNextStage: record.allowNextStage,
            currencyCode: record.currencyCode,
            totalEstimatedAmountExcludingTax: this.toDecimalString(record.totalEstimatedAmountExcludingTax),
            totalTaxCostAmount: this.toDecimalString(record.totalTaxCostAmount),
            totalEstimatedAmountIncludingTax: this.toDecimalString(record.totalEstimatedAmountIncludingTax),
            taxAssumptionSummary: record.taxAssumptionSummary,
            taxReviewStatus: record.taxReviewStatus,
            highestRiskLevel: record.highestRiskLevel ?? null,
            blockerCount: record.blockerCount,
            effectiveAt: record.effectiveAt.toISOString(),
            createdAt: record.createdAt.toISOString(),
            createdBy: record.createdBy ?? null,
            updatedAt: record.updatedAt.toISOString(),
            updatedBy: record.updatedBy ?? null,
            rowVersion: record.rowVersion
        };
    }

    private mapProjectTechnicalScopeItem(record: ProjectTechnicalScopeItem): ProjectTechnicalScopeItemView {
        return {
            id: record.id,
            packageId: record.packageId,
            scopeType: record.scopeType,
            label: record.label,
            description: record.description,
            sortOrder: record.sortOrder
        };
    }

    private mapProjectTechnicalRiskItem(record: ProjectTechnicalRiskItem): ProjectTechnicalRiskItemView {
        return {
            id: record.id,
            packageId: record.packageId,
            riskCategory: record.riskCategory,
            riskLevel: record.riskLevel,
            riskDescription: record.riskDescription,
            impactScope: record.impactScope,
            mitigationPlan: record.mitigationPlan,
            ownerRole: record.ownerRole,
            riskStatus: record.riskStatus,
            blocksNextStage: record.blocksNextStage,
            sortOrder: record.sortOrder
        };
    }

    private mapProjectTechnicalCostItem(record: ProjectTechnicalCostItem): ProjectTechnicalCostItemView {
        return {
            id: record.id,
            packageId: record.packageId,
            costCategory: record.costCategory,
            costSubcategory: record.costSubcategory ?? null,
            costDescription: record.costDescription,
            estimationBasis: record.estimationBasis,
            quantity: this.toNullableDecimalString(record.quantity),
            unit: record.unit ?? null,
            unitPrice: this.toNullableDecimalString(record.unitPrice),
            amountExcludingTax: this.toDecimalString(record.amountExcludingTax),
            taxCostAmount: this.toDecimalString(record.taxCostAmount),
            amountIncludingTax: this.toDecimalString(record.amountIncludingTax),
            currencyCode: record.currencyCode,
            confidenceLevel: record.confidenceLevel,
            highUncertainty: record.highUncertainty,
            responsibleRole: record.responsibleRole ?? null,
            sortOrder: record.sortOrder
        };
    }

    private buildBidCommercialAllowedActions(project: Project, permissions: PermissionKey[]): string[] {
        const permissionSet = new Set<PermissionKey>(permissions);
        const actions = ['view-bid-commercial-workspace'];

        if (
            !this.isClosedProject(project) &&
            PROJECT_WORKSPACE_PRESIGNING_STAGES.includes(project.currentStage) &&
            permissionSet.has('project:write')
        ) {
            actions.push('create-bid-commercial-process');
        }

        return actions;
    }

    private buildBidCommercialBlockingReasons(
        currentProcess: ProjectBidCommercialProcess,
        materialItems: ProjectBidCommercialMaterialItem[]
    ): string[] {
        const reasons: string[] = [];

        if (currentProcess.decision === 'pending') {
            reasons.push('尚未完成是否参与竞标 / 商务竞标的决策。');
        }

        if (currentProcess.decision === 'no-bid') {
            reasons.push('当前已决策不参与本次竞标，需要明确是否转入直接商务路径或关闭推进。');
        }

        if (['lost', 'cancelled'].includes(currentProcess.resultStatus)) {
            reasons.push('当前竞标结果不能直接进入报价与签约承接。');
        }

        for (const item of materialItems) {
            if (item.blocksNextStep && !['ready', 'not-required'].includes(item.materialStatus)) {
                reasons.push(`${item.label}：${item.materialStatus === 'missing' ? '材料缺失' : '材料仍在处理中'}`);
            }
        }

        return reasons;
    }

    private buildBidCommercialNextStep(
        currentProcess: ProjectBidCommercialProcess,
        materialItems: ProjectBidCommercialMaterialItem[]
    ): string {
        const blockingReasons = this.buildBidCommercialBlockingReasons(currentProcess, materialItems);
        if (blockingReasons.length > 0) {
            return '先处理竞标决策、结果或材料阻断，再进入报价与毛利评审。';
        }

        if (currentProcess.bidMode === 'not-required') {
            return '投标路径不适用，可以直接进入报价与毛利评审。';
        }

        if (currentProcess.bidMode === 'direct-commercial') {
            return '沿直接商务路径进入报价与毛利评审，并保留本过程作为商务依据。';
        }

        if (currentProcess.resultStatus === 'won') {
            return '将中标 / 竞标结果带入报价与毛利评审或签约就绪判断。';
        }

        return '补齐竞标过程依据，准备进入报价与毛利评审。';
    }

    private buildPricingMarginAllowedActions(project: Project, permissions: PermissionKey[]): string[] {
        const permissionSet = new Set<PermissionKey>(permissions);
        const actions = ['view-pricing-margin-workspace'];

        if (
            !this.isClosedProject(project) &&
            PROJECT_WORKSPACE_PRESIGNING_STAGES.includes(project.currentStage) &&
            permissionSet.has('project:write')
        ) {
            actions.push('create-pricing-margin-review');
        }

        return actions;
    }

    private buildPricingMarginPrerequisiteBlockingReasons(
        technicalCostPackage: ProjectTechnicalCostPackage | null,
        bidCommercialProcess: ProjectBidCommercialProcess | null
    ): string[] {
        const reasons: string[] = [];

        if (!technicalCostPackage) {
            reasons.push('尚未形成可引用的技术与成本版本包。');
        } else {
            if (!technicalCostPackage.allowNextStage) {
                reasons.push('当前技术与成本版本包尚未允许进入报价评审。');
            }

            if (technicalCostPackage.taxReviewStatus === 'pending') {
                reasons.push('当前技术与成本版本包的税务成本仍待复核。');
            }
        }

        if (bidCommercialProcess && ['lost', 'cancelled'].includes(bidCommercialProcess.resultStatus)) {
            reasons.push('当前竞标 / 商务过程结果不能直接支撑报价评审。');
        }

        return reasons;
    }

    private buildPricingMarginBlockingReasons(
        currentReview: ProjectPricingMarginReview,
        conditionItems: ProjectPricingMarginConditionItem[],
        technicalCostPackage: ProjectTechnicalCostPackage | null
    ): string[] {
        const reasons: string[] = [];

        if (!technicalCostPackage) {
            reasons.push('报价评审引用的技术与成本版本包已不可用。');
        }

        if (currentReview.decision === 'pending') {
            reasons.push('报价与毛利评审尚未形成放行结论。');
        }

        if (currentReview.decision === 'rejected') {
            reasons.push('报价与毛利评审已被否决，需要回到技术、成本或商务条件重新收口。');
        }

        if (currentReview.decision === 'escalation-required') {
            reasons.push('当前报价与毛利评审需要升级审批，暂不能进入签约就绪。');
        }

        for (const item of conditionItems) {
            if (item.requiredForContracting && item.conditionStatus === 'open') {
                reasons.push(`${item.label}：${item.conditionSummary}`);
            }
        }

        return reasons;
    }

    private buildPricingMarginEmptyNextStep(
        technicalCostPackage: ProjectTechnicalCostPackage | null,
        bidCommercialProcess: ProjectBidCommercialProcess | null
    ): string {
        const blockingReasons = this.buildPricingMarginPrerequisiteBlockingReasons(technicalCostPackage, bidCommercialProcess);
        if (blockingReasons.length > 0) {
            return '先补齐技术成本、税务复核或商务路径依据，再发起报价与毛利评审。';
        }

        return '基于当前技术成本和商务路径，形成报价、税务条件、回款条件与毛利评审结论。';
    }

    private buildPricingMarginNextStep(
        currentReview: ProjectPricingMarginReview,
        conditionItems: ProjectPricingMarginConditionItem[],
        technicalCostPackage: ProjectTechnicalCostPackage | null
    ): string {
        const blockingReasons = this.buildPricingMarginBlockingReasons(currentReview, conditionItems, technicalCostPackage);
        if (blockingReasons.length > 0) {
            return '先处理报价结论、升级审批或条件放行阻断，再进入签约就绪。';
        }

        if (currentReview.readyForContracting) {
            return '可以将当前商业放行基线和摘要快照带入签约就绪。';
        }

        return '确认商业放行基线、审批摘要和签约承接关系后再进入签约就绪。';
    }

    private buildTechnicalCostAllowedActions(project: Project, permissions: PermissionKey[]): string[] {
        const permissionSet = new Set<PermissionKey>(permissions);
        const actions = ['view-technical-cost-workspace'];

        if (
            !this.isClosedProject(project) &&
            PROJECT_WORKSPACE_PRESIGNING_STAGES.includes(project.currentStage) &&
            permissionSet.has('project:write')
        ) {
            actions.push('create-technical-cost-package');
        }

        return actions;
    }

    private buildTechnicalCostBlockingReasons(
        currentPackage: ProjectTechnicalCostPackage,
        riskItems: ProjectTechnicalRiskItem[]
    ): string[] {
        const reasons: string[] = [];

        if (!currentPackage.allowNextStage) {
            reasons.push('技术与成本版本包尚未允许进入下一阶段。');
        }

        for (const item of riskItems) {
            if (item.blocksNextStage && item.riskStatus !== 'closed') {
                reasons.push(`${item.riskCategory}：${item.riskDescription}`);
            }
        }

        if (currentPackage.taxReviewStatus === 'pending') {
            reasons.push('税务成本假设仍待复核。');
        }

        return reasons;
    }

    private buildTechnicalCostNextStep(
        currentPackage: ProjectTechnicalCostPackage,
        riskItems: ProjectTechnicalRiskItem[]
    ): string {
        if (currentPackage.allowNextStage && riskItems.every((item) => !item.blocksNextStage || item.riskStatus === 'closed')) {
            return '进入商务收口前，保持当前版本包作为报价和签约前判断依据。';
        }

        if (currentPackage.taxReviewStatus === 'pending') {
            return '先完成税务成本复核，再判断是否进入商务收口。';
        }

        return '先关闭阻塞风险或更新版本包，再进入商务收口。';
    }

    private toDecimalString(value: string | number): string {
        return typeof value === 'string' ? value : String(value);
    }

    private toNullableDecimalString(value: string | number | null | undefined): string | null {
        if (value == null) {
            return null;
        }

        return this.toDecimalString(value);
    }

    private buildStageSummary(project: Project): ProjectDetailView['stageSummary'] {
        return {
            currentStage: project.currentStage,
            status: project.status,
            plannedSignAt: project.plannedSignAt?.toISOString() ?? null,
            closedAt: project.closedAt?.toISOString() ?? null,
            closedReason: project.closedReason ?? null,
            blockingReasons: this.buildStageBlockingReasons(project)
        };
    }

    private buildStageBlockingReasons(project: Project): string[] {
        const reasons: string[] = [];

        if (project.status === 'blocked') {
            reasons.push('project-status-blocked');
        }

        if (project.status === 'closed' || project.currentStage === 'closed-lost' || project.currentStage === 'closed-terminated') {
            reasons.push('project-closed');
        }

        return reasons;
    }

    private async buildContractSummary(
        contracts: Contract[],
        user: UserPayload,
        requestContext: SensitiveFieldProjectionRequestContext,
        projectId: string
    ): Promise<ProjectDetailView['currentContractSummary']> {
        const activeContracts = contracts.filter((contract) => contract.status === 'active');
        const latestContract = contracts[0] ?? null;
        const signedAmountProjection = await this.sensitiveFieldProjectionService.projectStringField({
            fieldPackageKey: 'contract-finance',
            rawValue: latestContract?.signedAmount ?? null,
            displayTextWhenFull: latestContract ? `${latestContract.signedAmount} ${latestContract.currencyCode}` : null,
            user,
            targetType: 'Project',
            targetId: projectId,
            requestContext
        });

        return {
            activeContractCount: activeContracts.length,
            latestContractId: latestContract?.id ?? null,
            latestContractNo: latestContract?.contractNo ?? null,
            latestContractStatus: latestContract?.status ?? null,
            signedAmountProjection,
            currencyCode: latestContract?.currencyCode ?? null,
            signedAt: latestContract?.signedAt?.toISOString() ?? null,
            currentSnapshotId: latestContract?.currentSnapshotId ?? null
        };
    }

    private buildBidSummary(currentProcess: ProjectBidCommercialProcess | null): ProjectDetailView['currentBidSummary'] {
        if (!currentProcess) {
            return {
                bidProcessId: null,
                bidStatus: 'not_configured',
                resultStatus: null,
                tenderNo: null,
                bidPackageNo: null,
                summary: null
            };
        }

        return {
            bidProcessId: currentProcess.id,
            bidStatus: currentProcess.currentStage,
            resultStatus: currentProcess.resultStatus,
            tenderNo: currentProcess.tenderNo ?? null,
            bidPackageNo: currentProcess.bidPackageNo ?? null,
            summary: currentProcess.processSummary
        };
    }

    private buildConfirmationSummary(): ProjectDetailView['currentConfirmationSummary'] {
        return {
            confirmationRecordId: null,
            status: 'not_configured',
            requiredCount: 0,
            confirmedCount: 0,
            pendingCount: 0,
            confirmedAt: null
        };
    }

    private buildSourceLeadSummary(lead: Lead | null): ProjectDetailView['sourceLeadSummary'] {
        if (!lead) {
            return null;
        }

        return {
            id: lead.id,
            leadNo: lead.leadNo,
            leadName: lead.leadName,
            customerName: lead.customerName,
            status: lead.status
        };
    }

    private buildAllowedActions(project: Project, permissions: PermissionKey[]): string[] {
        const permissionSet = new Set<PermissionKey>(permissions);
        const actions = ['view-project-workspace'];
        const isClosed = project.status === 'closed' || project.currentStage === 'closed-lost' || project.currentStage === 'closed-terminated';

        if (!isClosed && permissionSet.has('project:write')) {
            actions.push('edit-project-basic-info');
        }

        const commissionStageReady = ['handover', 'execution', 'acceptance', 'completed'].includes(project.currentStage);
        const commissionPermissions: PermissionKey[] = [
            'commission:assignments:manage',
            'commission:calculations:manage',
            'commission:payouts:manage',
            'commission:adjustments:manage',
            'commission:rule-versions:manage'
        ];
        const canManageCommission = commissionPermissions.some((permission) => permissionSet.has(permission));

        if (!isClosed && commissionStageReady && canManageCommission) {
            actions.push('manage-project-commission');
        }

        return actions;
    }

    private buildProjectArchiveRecordAllowedActions(record: ProjectArchiveRecord, project: Project, permissions: PermissionKey[]): string[] {
        if (record.status !== 'recorded' || !this.isTerminalProjectStage(project) || !permissions.includes('project:write')) {
            return [];
        }

        return [PROJECT_ARCHIVE_RECORD_ACTIONS.replace, PROJECT_ARCHIVE_RECORD_ACTIONS.void];
    }

    private isTerminalProjectStage(project: Project): boolean {
        return project.currentStage === 'completed' || project.currentStage === 'closed-lost' || project.currentStage === 'closed-terminated';
    }

    private buildWorkspaceBlockingReasons(project: Project): string[] {
        return this.buildStageBlockingReasons(project).map((reason) => {
            switch (reason) {
                case 'project-status-blocked':
                    return '项目已标记为阻塞，需要先明确阻断原因和解除责任。';
                case 'project-closed':
                    return project.closedReason ? `项目已关闭：${project.closedReason}` : '项目已关闭，不再推进后续阶段。';
                default:
                    return reason;
            }
        });
    }

    private buildWorkspaceGuidanceText(project: Project, blockingReasons: string[]): ProjectWorkspaceGuidanceText {
        const stageLabel = this.getStageLabel(project.currentStage);

        if (project.status === 'blocked') {
            return {
                headline: `${stageLabel}存在阻断，先处理卡点。`,
                currentFocus: '先把阻断原因、责任人和解除条件说清楚。',
                currentGap: blockingReasons.length > 0 ? blockingReasons.join('；') : '当前项目被标记为阻塞，需要补充阻断说明。',
                nextStep: '阻断解除后再回到项目主线继续推进。',
                ownerFallback: '项目负责人'
            };
        }

        if (project.status === 'pending-approval') {
            return {
                headline: `${stageLabel}正在等待审批。`,
                currentFocus: '跟进审批结论和必要补充材料。',
                currentGap: '需要审批通过后再推进下一步。',
                nextStep: '审批通过后回到当前阶段主线继续处理。',
                ownerFallback: '流程负责人'
            };
        }

        if (project.status === 'on-hold') {
            return {
                headline: `${stageLabel}已挂起。`,
                currentFocus: '确认挂起原因、恢复条件和下一次检查时间。',
                currentGap: '项目恢复前不应继续推进后续动作。',
                nextStep: '恢复条件满足后再回到当前阶段主线。',
                ownerFallback: '项目负责人'
            };
        }

        if (this.isClosedProject(project)) {
            return {
                headline: PROJECT_WORKSPACE_STAGE_GUIDANCE[project.currentStage]?.headline ?? '项目已关闭。',
                currentFocus: PROJECT_WORKSPACE_STAGE_GUIDANCE[project.currentStage]?.currentFocus ?? '查看关闭原因和归档事实。',
                currentGap: project.closedReason ? `项目已关闭：${project.closedReason}` : '项目已关闭，不再推进后续阶段。',
                nextStep: PROJECT_WORKSPACE_STAGE_GUIDANCE[project.currentStage]?.nextStep ?? '查看归档事实和结算结果。',
                ownerFallback: PROJECT_WORKSPACE_STAGE_GUIDANCE[project.currentStage]?.ownerFallback ?? '项目负责人'
            };
        }

        return PROJECT_WORKSPACE_STAGE_GUIDANCE[project.currentStage] ?? {
            headline: `${stageLabel}正在推进。`,
            currentFocus: '确认当前阶段事实和下一步责任。',
            currentGap: '需要补齐当前阶段的业务依据。',
            nextStep: '依据当前阶段结果推进到下一步。',
            ownerFallback: '项目负责人'
        };
    }

    private buildWorkspaceEntries(
        project: Project,
        permissions: PermissionKey[],
        allowedActions: string[]
    ): ProjectWorkspaceGuidanceView['recommendedEntries'] {
        const permissionSet = new Set<PermissionKey>(permissions);
        const hasAllPermissions = (requiredPermissions: PermissionKey[]) => requiredPermissions.every((permission) => permissionSet.has(permission));
        const isClosed = this.isClosedProject(project);
        const financeStageReady = PROJECT_WORKSPACE_FINANCE_STAGES.includes(project.currentStage);
        const commissionStageReady = PROJECT_WORKSPACE_COMMISSION_STAGES.includes(project.currentStage);
        const settlementStageReady = PROJECT_WORKSPACE_SETTLEMENT_STAGES.includes(project.currentStage);
        const canUsePreSigningWorkspace = hasAllPermissions(PROJECT_WORKSPACE_PRESIGNING_PERMISSIONS) && allowedActions.includes('view-project-workspace');
        const canUseHandoverWorkspace = hasAllPermissions(PROJECT_WORKSPACE_HANDOVER_PERMISSIONS) && allowedActions.includes('view-project-workspace');
        const canUseFinanceWorkspace = hasAllPermissions(PROJECT_WORKSPACE_FINANCE_PERMISSIONS);
        const canUsePayoutWorkspace = hasAllPermissions(PROJECT_WORKSPACE_PAYOUT_PERMISSIONS);
        const canUseCommissionFreezeBinding = hasAllPermissions(PROJECT_WORKSPACE_COMMISSION_FREEZE_PERMISSIONS);
        const canUseCommissionOperations = hasAllPermissions(PROJECT_WORKSPACE_COMMISSION_OPERATION_PERMISSIONS) && allowedActions.includes('manage-project-commission');
        const projectRoutePrefix = `/projects/${project.id}`;

        const entries: ProjectWorkspaceGuidanceView['recommendedEntries'] = [
            {
                key: 'project-detail',
                label: '项目详情',
                description: '查看项目主体、负责人、合同、审批和确认情况。',
                route: projectRoutePrefix,
                enabled: true,
                disabledReason: null,
                actionKey: 'project:read'
            },
            {
                key: 'workspace-home',
                label: '工作区总览',
                description: '查看当前阶段、缺口、下一步和推荐入口。',
                route: `${projectRoutePrefix}/workspace`,
                enabled: allowedActions.includes('view-project-workspace'),
                disabledReason: allowedActions.includes('view-project-workspace') ? null : '当前账号不能查看项目工作区。',
                actionKey: 'view-project-workspace'
            }
        ];

        if (PROJECT_WORKSPACE_PRESIGNING_STAGES.includes(project.currentStage)) {
            entries.push({
                key: 'pre-signing-workspace',
                label: '签约前主线',
                description: '查看签约前当前阶段、阻断原因、下一步和责任归口。',
                route: `${projectRoutePrefix}/workspace/pre-signing`,
                enabled: !isClosed && canUsePreSigningWorkspace,
                disabledReason: this.buildWorkspaceEntryDisabledReason({
                    isClosed,
                    stageReady: true,
                    permissionReady: canUsePreSigningWorkspace,
                    stageReason: '项目进入签约前阶段后再查看签约前主线。',
                    permissionReason: '需要项目查看权限。'
                }),
                actionKey: 'view-project-workspace'
            });
            entries.push({
                key: 'technical-cost-workspace',
                label: '技术与成本',
                description: '查看技术可行性、范围边界、风险保留和前期成本估算。',
                route: `${projectRoutePrefix}/workspace/technical-cost`,
                enabled: !isClosed && canUsePreSigningWorkspace,
                disabledReason: this.buildWorkspaceEntryDisabledReason({
                    isClosed,
                    stageReady: true,
                    permissionReady: canUsePreSigningWorkspace,
                    stageReason: '项目进入签约前阶段后再查看技术与成本。',
                    permissionReason: '需要项目查看权限。'
                }),
                actionKey: 'view-project-workspace'
            });
            entries.push({
                key: 'bid-commercial-workspace',
                label: '招投标 / 商务竞标',
                description: '查看竞标形态、阶段、决策、材料齐备度、结果和下一步。',
                route: `${projectRoutePrefix}/workspace/bid-commercial`,
                enabled: !isClosed && canUsePreSigningWorkspace,
                disabledReason: this.buildWorkspaceEntryDisabledReason({
                    isClosed,
                    stageReady: true,
                    permissionReady: canUsePreSigningWorkspace,
                    stageReason: '项目进入签约前阶段后再查看招投标 / 商务竞标。',
                    permissionReason: '需要项目查看权限。'
                }),
                actionKey: 'view-project-workspace'
            });
            entries.push({
                key: 'pricing-margin-workspace',
                label: '报价与毛利评审',
                description: '查看报价、成本引用、税务回款条件、毛利判断、放行结论和签约承接。',
                route: `${projectRoutePrefix}/workspace/pricing-margin`,
                enabled: !isClosed && canUsePreSigningWorkspace,
                disabledReason: this.buildWorkspaceEntryDisabledReason({
                    isClosed,
                    stageReady: true,
                    permissionReady: canUsePreSigningWorkspace,
                    stageReason: '项目进入签约前阶段后再查看报价与毛利评审。',
                    permissionReason: '需要项目查看权限。'
                }),
                actionKey: 'view-project-workspace'
            });
        }

        if (project.currentStage === 'handover') {
            entries.push({
                key: 'handover-workspace',
                label: '合同承接',
                description: '查看合同生效后到正式移交前的承接状态、基线和阻断事项。',
                route: `${projectRoutePrefix}/workspace/contract-handover`,
                enabled: !isClosed && canUseHandoverWorkspace,
                disabledReason: this.buildWorkspaceEntryDisabledReason({
                    isClosed,
                    stageReady: true,
                    permissionReady: canUseHandoverWorkspace,
                    stageReason: '项目进入移交阶段后再查看合同承接。',
                    permissionReason: '需要项目查看权限。'
                }),
                actionKey: 'view-project-workspace'
            });
        }

        entries.push(
            {
                key: 'operating-overview',
                label: '经营总览',
                description: '查看收入、成本、回款和经营口径。',
                route: `${projectRoutePrefix}/workspace/operating-overview`,
                enabled: !isClosed && financeStageReady && canUseFinanceWorkspace,
                disabledReason: this.buildWorkspaceEntryDisabledReason({
                    isClosed,
                    stageReady: financeStageReady,
                    permissionReady: canUseFinanceWorkspace,
                    stageReason: '项目进入正式执行后再查看经营总览。',
                    permissionReason: '需要项目查看和合同资金权限。'
                }),
                actionKey: 'contract:finance:manage'
            },
            {
                key: 'variance-risk',
                label: '偏差与风险',
                description: '查看经营偏差、风险等级和建议动作。',
                route: `${projectRoutePrefix}/workspace/variance-risk`,
                enabled: !isClosed && financeStageReady && canUseFinanceWorkspace,
                disabledReason: this.buildWorkspaceEntryDisabledReason({
                    isClosed,
                    stageReady: financeStageReady,
                    permissionReady: canUseFinanceWorkspace,
                    stageReason: '项目进入正式执行后再查看偏差与风险。',
                    permissionReason: '需要项目查看和合同资金权限。'
                }),
                actionKey: 'contract:finance:manage'
            },
            {
                key: 'commission-freeze-binding',
                label: '冻结与责任边界',
                description: '查看提成冻结版本、责任边界、参与人权重和移交收口关系。',
                route: `${projectRoutePrefix}/commission/freeze-binding`,
                enabled: !isClosed && commissionStageReady && canUseCommissionFreezeBinding,
                disabledReason: this.buildWorkspaceEntryDisabledReason({
                    isClosed,
                    stageReady: commissionStageReady,
                    permissionReady: canUseCommissionFreezeBinding,
                    stageReason: '项目进入移交或执行阶段后再查看冻结与责任边界。',
                    permissionReason: '需要项目查看和提成角色冻结权限。'
                }),
                actionKey: 'commission:assignments:manage'
            },
            {
                key: 'commission-gate-overview',
                label: '提成阶段解释',
                description: '查看当前阶段是否满足提成闸口条件。',
                route: `${projectRoutePrefix}/commission/gate-overview`,
                enabled: !isClosed && commissionStageReady && canUseFinanceWorkspace,
                disabledReason: this.buildWorkspaceEntryDisabledReason({
                    isClosed,
                    stageReady: commissionStageReady,
                    permissionReady: canUseFinanceWorkspace,
                    stageReason: '项目进入移交或执行阶段后再查看提成阶段解释。',
                    permissionReason: '需要项目查看和合同资金权限。'
                }),
                actionKey: 'contract:finance:manage'
            },
            {
                key: 'commission-final-settlement',
                label: '最终结算',
                description: '查看最终结算、质保金和发放条件。',
                route: `${projectRoutePrefix}/commission/final-settlement`,
                enabled: !isClosed && settlementStageReady && canUsePayoutWorkspace,
                disabledReason: this.buildWorkspaceEntryDisabledReason({
                    isClosed,
                    stageReady: settlementStageReady,
                    permissionReady: canUsePayoutWorkspace,
                    stageReason: '项目进入验收或完成阶段后再查看最终结算。',
                    permissionReason: '需要项目查看和提成发放权限。'
                }),
                actionKey: 'commission:payouts:manage'
            },
            {
                key: 'commission-rule-explanation',
                label: '规则解释',
                description: '查看当前项目适用的提成规则和解释口径。',
                route: `${projectRoutePrefix}/commission/rule-explanation`,
                enabled: !isClosed && commissionStageReady && canUsePayoutWorkspace,
                disabledReason: this.buildWorkspaceEntryDisabledReason({
                    isClosed,
                    stageReady: commissionStageReady,
                    permissionReady: canUsePayoutWorkspace,
                    stageReason: '项目进入移交或执行阶段后再查看规则解释。',
                    permissionReason: '需要项目查看和提成发放权限。'
                }),
                actionKey: 'commission:payouts:manage'
            },
            {
                key: 'commission-operations',
                label: '提成操作',
                description: '处理提成规则、计算、发放和调整。',
                route: `${projectRoutePrefix}/commission/operations`,
                enabled: !isClosed && commissionStageReady && canUseCommissionOperations,
                disabledReason: this.buildWorkspaceEntryDisabledReason({
                    isClosed,
                    stageReady: commissionStageReady,
                    permissionReady: canUseCommissionOperations,
                    stageReason: '项目进入移交或执行阶段后再处理提成操作。',
                    permissionReason: '需要完整的提成治理操作权限。'
                }),
                actionKey: 'manage-project-commission'
            }
        );

        return entries;
    }

    private buildWorkspaceEntryDisabledReason(input: {
        isClosed: boolean;
        stageReady: boolean;
        permissionReady: boolean;
        stageReason: string;
        permissionReason: string;
    }): string | null {
        if (input.isClosed) {
            return '项目已关闭，只能查看归档信息。';
        }

        if (!input.stageReady) {
            return input.stageReason;
        }

        if (!input.permissionReady) {
            return input.permissionReason;
        }

        return null;
    }

    private buildOwnerLabel(ownerName: string | null, ownerOrgName: string | null, fallback: string): string {
        if (ownerName && ownerOrgName) {
            return `${ownerName} / ${ownerOrgName}`;
        }

        return ownerName ?? ownerOrgName ?? fallback;
    }

    private getStageLabel(stage: string): string {
        return PROJECT_WORKSPACE_STAGE_LABELS[stage] ?? stage;
    }

    private getStatusLabel(status: string): string {
        return PROJECT_WORKSPACE_STATUS_LABELS[status] ?? status;
    }

    private resolveActorName(actorUserId: string | null | undefined, actorNameByUserId: Map<string, string>): string | null {
        return actorUserId ? (actorNameByUserId.get(actorUserId) ?? null) : null;
    }

    private isClosedProject(project: Project): boolean {
        return project.status === 'closed' || project.currentStage === 'closed-lost' || project.currentStage === 'closed-terminated';
    }
}
