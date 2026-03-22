import { EntityRepository, FilterQuery, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { Contract } from './contract.entity';

@Injectable()
export class ContractRepository {
    constructor(
        @InjectRepository(Contract)
        private readonly contractRepository: EntityRepository<Contract>
    ) {}

    async findMany(input: { projectId?: string; status?: string; keyword?: string }): Promise<Contract[]> {
        const where: FilterQuery<Contract> = {};

        if (input.projectId) {
            where.projectId = input.projectId;
        }

        if (input.status) {
            where.status = input.status;
        }

        if (input.keyword) {
            where.$or = [{ contractNo: { $ilike: `%${input.keyword}%` } }];
        }

        return this.contractRepository.find(where, {
            orderBy: { createdAt: QueryOrder.DESC }
        });
    }

    async findById(id: string): Promise<Contract | null> {
        return this.contractRepository.findOne({ id });
    }

    async findByNo(contractNo: string): Promise<Contract | null> {
        return this.contractRepository.findOne({ contractNo });
    }

    create(input: ConstructorParameters<typeof Contract>[0]): Contract {
        return this.contractRepository.create(input);
    }

    async save(contract: Contract): Promise<void> {
        await this.contractRepository.getEntityManager().persist(contract).flush();
    }
}
