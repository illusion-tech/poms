import { EntityRepository, FilterQuery, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { Project } from './project.entity';

@Injectable()
export class ProjectRepository {
    constructor(
        @InjectRepository(Project)
        private readonly projectRepository: EntityRepository<Project>
    ) {}

    async findAll(): Promise<Project[]> {
        return this.projectRepository.findAll({
            orderBy: { createdAt: QueryOrder.DESC }
        });
    }

    async findMany(input: {
        status?: string;
        currentStage?: string;
        ownerOrgId?: string;
        keyword?: string;
    }): Promise<Project[]> {
        const where: FilterQuery<Project> = {};

        if (input.status) {
            where.status = input.status;
        }

        if (input.currentStage) {
            where.currentStage = input.currentStage;
        }

        if (input.ownerOrgId) {
            where.ownerOrgId = input.ownerOrgId;
        }

        if (input.keyword) {
            (where as FilterQuery<Project> & { $or?: FilterQuery<Project>[] }).$or = [
                { projectCode: { $ilike: `%${input.keyword}%` } },
                { projectName: { $ilike: `%${input.keyword}%` } }
            ];
        }

        return this.projectRepository.find(where, {
            orderBy: { createdAt: QueryOrder.DESC }
        });
    }

    async findById(id: string): Promise<Project | null> {
        return this.projectRepository.findOne({ id });
    }

    async findByCode(projectCode: string): Promise<Project | null> {
        return this.projectRepository.findOne({ projectCode });
    }

    create(input: ConstructorParameters<typeof Project>[0]): Project {
        return this.projectRepository.create(input);
    }

    async save(project: Project): Promise<void> {
        await this.projectRepository.getEntityManager().persist(project).flush();
    }
}
