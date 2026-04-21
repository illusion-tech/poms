import { Injectable } from '@nestjs/common';
import type { ProjectListQuery, ProjectListView } from '@poms/shared-contracts';
import { ProjectRepository } from './project.repository';

@Injectable()
export class ProjectQueryService {
    constructor(private readonly projectRepository: ProjectRepository) {}

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
}
