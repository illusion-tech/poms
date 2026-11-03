import { EntityRepository, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { ContractReadinessPackage, ContractReadinessPackageItem } from './contract-readiness-package.entity';

@Injectable()
export class ContractReadinessPackageRepository {
    constructor(
        @InjectRepository(ContractReadinessPackage)
        private readonly readinessPackageRepository: EntityRepository<ContractReadinessPackage>,
        @InjectRepository(ContractReadinessPackageItem)
        private readonly readinessItemRepository: EntityRepository<ContractReadinessPackageItem>
    ) {}

    async findById(id: string): Promise<ContractReadinessPackage | null> {
        return this.readinessPackageRepository.findOne({ id });
    }

    async findCurrentByProjectId(projectId: string): Promise<ContractReadinessPackage | null> {
        return this.readinessPackageRepository.findOne(
            { projectId, isCurrent: true },
            {
                orderBy: { updatedAt: QueryOrder.DESC, createdAt: QueryOrder.DESC }
            }
        );
    }

    create(input: ConstructorParameters<typeof ContractReadinessPackage>[0]): ContractReadinessPackage {
        return this.readinessPackageRepository.create(input);
    }

    async findItems(packageId: string): Promise<ContractReadinessPackageItem[]> {
        return this.readinessItemRepository.find(
            { packageId },
            {
                orderBy: { sortOrder: QueryOrder.ASC }
            }
        );
    }

    getEntityManager() {
        return this.readinessPackageRepository.getEntityManager();
    }
}
