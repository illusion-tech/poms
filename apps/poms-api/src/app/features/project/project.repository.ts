import { EntityRepository, QueryOrder } from '@mikro-orm/core';
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

    async findById(id: string): Promise<Project | null> {
        return this.projectRepository.findOne({ id });
    }

    create(input: ConstructorParameters<typeof Project>[0]): Project {
        return this.projectRepository.create(input);
    }

    async save(project: Project): Promise<void> {
        await this.projectRepository.getEntityManager().persist(project).flush();
    }
}
