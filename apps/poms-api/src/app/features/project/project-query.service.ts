import { Injectable, NotFoundException } from '@nestjs/common';
import type {
    AcceptanceRecordList,
    AcceptanceRecordResult,
    AcceptanceRecordSummary,
    AcceptanceRecordType,
    PermissionKey,
    ProjectCompletionRecordList,
    ProjectCompletionRecordResult,
    ProjectCompletionRecordSummary,
    ProjectDetailView,
    ProjectListQuery,
    ProjectListView,
    ProjectTimelineView,
    ProjectWorkspaceGuidanceView,
    UserPayload
} from '@poms/shared-contracts';
import { ApprovalSummarySnapshotRepository } from '../approval-summary/approval-summary.repository';
import { Contract } from '../contract/contract.entity';
import { AcceptanceRecord } from './acceptance-record.entity';
import { ProjectCompletionRecord } from './project-completion-record.entity';
import { Project } from './project.entity';
import { ProjectRepository } from './project.repository';

const PROJECT_DETAIL_SUMMARY_SCENARIO_KEY = 'project-detail';
const PROJECT_DETAIL_SUMMARY_PROJECTION_LEVEL = 'project-detail';
const PROJECT_DETAIL_TARGET_TYPE = 'Project';
const PROJECT_WORKSPACE_HANDOVER_PERMISSIONS: PermissionKey[] = ['project:read'];
const PROJECT_WORKSPACE_FINANCE_PERMISSIONS: PermissionKey[] = ['project:read', 'contract:finance:manage'];
const PROJECT_WORKSPACE_PAYOUT_PERMISSIONS: PermissionKey[] = ['project:read', 'commission:payouts:manage'];
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
        private readonly approvalSummarySnapshotRepository: ApprovalSummarySnapshotRepository
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
                    projectCode: project.projectCode,
                    projectName: project.projectName,
                    customerName: project.customerName ?? null,
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

    async getProjectDetail(id: string, user: UserPayload): Promise<ProjectDetailView> {
        const project = await this.projectRepository.findById(id);
        if (!project) {
            throw new NotFoundException(`Project ${id} not found`);
        }

        const [ownerUsers, ownerOrgUnits, contracts, approvalSummarySnapshot] = await Promise.all([
            project.ownerUserId ? this.projectRepository.findPlatformUsersByIds([project.ownerUserId]) : Promise.resolve([]),
            project.ownerOrgId ? this.projectRepository.findOrgUnitsByIds([project.ownerOrgId]) : Promise.resolve([]),
            this.projectRepository.findContractsByProjectId(project.id),
            this.approvalSummarySnapshotRepository.findActiveByTarget(
                PROJECT_DETAIL_TARGET_TYPE,
                project.id,
                PROJECT_DETAIL_SUMMARY_SCENARIO_KEY,
                PROJECT_DETAIL_SUMMARY_PROJECTION_LEVEL
            )
        ]);

        const ownerName = project.ownerUserId ? (ownerUsers[0]?.displayName ?? null) : null;
        const ownerOrgName = project.ownerOrgId ? (ownerOrgUnits[0]?.name ?? null) : null;
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
            projectCode: project.projectCode,
            projectName: project.projectName,
            customerId: project.customerId ?? null,
            customerName: project.customerName ?? null,
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
            stageSummary: this.buildStageSummary(project),
            currentBidSummary: {
                bidProcessId: null,
                bidStatus: 'not_configured',
                resultStatus: null,
                summary: null
            },
            currentContractSummary: this.buildContractSummary(contracts),
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

    async getProjectTimeline(projectId: string): Promise<ProjectTimelineView> {
        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new NotFoundException(`Project ${projectId} not found`);
        }

        const [contracts, latestConfirmedHandover, latestAcceptedAcceptanceRecord, latestProjectCompletionRecord] = await Promise.all([
            this.projectRepository.findContractsByProjectId(project.id),
            this.projectRepository.findLatestConfirmedHandoverByProjectId(project.id),
            this.projectRepository.findLatestAcceptedAcceptanceRecordByProjectId(project.id),
            this.projectRepository.findLatestConfirmedProjectCompletionRecordByProjectId(project.id)
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
                evidenceLabel: project.projectCode,
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

    private buildContractSummary(contracts: Contract[]): ProjectDetailView['currentContractSummary'] {
        const activeContracts = contracts.filter((contract) => contract.status === 'active');
        const latestContract = contracts[0] ?? null;

        return {
            activeContractCount: activeContracts.length,
            latestContractId: latestContract?.id ?? null,
            latestContractNo: latestContract?.contractNo ?? null,
            latestContractStatus: latestContract?.status ?? null,
            signedAmount: latestContract?.signedAmount ?? null,
            currencyCode: latestContract?.currencyCode ?? null,
            signedAt: latestContract?.signedAt?.toISOString() ?? null,
            currentSnapshotId: latestContract?.currentSnapshotId ?? null
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
        const canUseHandoverWorkspace = hasAllPermissions(PROJECT_WORKSPACE_HANDOVER_PERMISSIONS) && allowedActions.includes('view-project-workspace');
        const canUseFinanceWorkspace = hasAllPermissions(PROJECT_WORKSPACE_FINANCE_PERMISSIONS);
        const canUsePayoutWorkspace = hasAllPermissions(PROJECT_WORKSPACE_PAYOUT_PERMISSIONS);
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
                description: '签约前评估、范围、报价和合同前置事实后续会进入独立工作区。',
                route: null,
                enabled: false,
                disabledReason: '签约前工作区尚未接入正式事实源，先在项目详情中确认当前阶段和缺口。',
                actionKey: null
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
