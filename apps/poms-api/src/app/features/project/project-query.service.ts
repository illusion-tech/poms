import { Injectable, NotFoundException } from '@nestjs/common';
import type { PermissionKey, ProjectDetailView, ProjectListQuery, ProjectListView, UserPayload } from '@poms/shared-contracts';
import { ApprovalSummarySnapshotRepository } from '../approval-summary/approval-summary.repository';
import { Contract } from '../contract/contract.entity';
import { Project } from './project.entity';
import { ProjectRepository } from './project.repository';

const PROJECT_DETAIL_SUMMARY_SCENARIO_KEY = 'project-detail';
const PROJECT_DETAIL_SUMMARY_PROJECTION_LEVEL = 'project-detail';
const PROJECT_DETAIL_TARGET_TYPE = 'Project';

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
}
