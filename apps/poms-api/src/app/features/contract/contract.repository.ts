import { EntityManager, EntityRepository, FilterQuery, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { ConflictException, Injectable } from '@nestjs/common';
import type { ContractStatus } from '@poms/shared-contracts';
import { Contract, ContractAmendment, ContractTermSnapshot } from './contract.entity';

@Injectable()
export class ContractRepository {
    constructor(
        @InjectRepository(Contract)
        private readonly contractRepository: EntityRepository<Contract>
    ) {}

    async findMany(input: { projectId?: string; status?: ContractStatus; keyword?: string }): Promise<Contract[]> {
        const where: FilterQuery<Contract> = {};

        if (input.projectId) {
            where.projectId = input.projectId;
        }

        if (input.status) {
            where.status = input.status;
        }

        if (input.keyword) {
            where.$or = [
                { contractNo: { $ilike: `%${input.keyword}%` } },
                { customerContractNo: { $ilike: `%${input.keyword}%` } }
            ];
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

    getEntityManager(): EntityManager {
        return this.contractRepository.getEntityManager();
    }
}

@Injectable()
export class ContractTermSnapshotRepository {
    constructor(
        @InjectRepository(ContractTermSnapshot)
        private readonly contractTermSnapshotRepository: EntityRepository<ContractTermSnapshot>
    ) {}

    async findById(id: string): Promise<ContractTermSnapshot | null> {
        return this.contractTermSnapshotRepository.findOne({ id });
    }

    async findActiveByContractId(contractId: string): Promise<ContractTermSnapshot | null> {
        return this.contractTermSnapshotRepository.findOne(
            { contractId, snapshotStatus: 'active' },
            { orderBy: { effectiveAt: QueryOrder.DESC, createdAt: QueryOrder.DESC } }
        );
    }

    create(input: ConstructorParameters<typeof ContractTermSnapshot>[0]): ContractTermSnapshot {
        return this.contractTermSnapshotRepository.create(input);
    }

    async createActiveSnapshotIfAbsent(input: {
        id: string;
        contractId: string;
        effectiveBy?: string | null;
        createdBy?: string | null;
        retentionDueDate?: string | null;
        amountTaxInclusive?: string | null;
        amountTaxExclusive?: string | null;
        taxRate?: string | null;
        downPaymentRate?: string | null;
        retentionRate?: string | null;
        paymentTerms?: string | null;
        sourceReadinessId?: string | null;
        sourceBaselineId?: string | null;
    }): Promise<ContractTermSnapshot> {
        const existing = await this.findById(input.id);
        if (existing) {
            if (existing.contractId !== input.contractId) {
                throw new ConflictException(
                    `ContractTermSnapshot ${input.id} belongs to contract ${existing.contractId}, expected ${input.contractId}`
                );
            }

            const normalizedRetentionDueDate = input.retentionDueDate ?? null;
            const sameFrozenPayload =
                (existing.retentionDueDate ?? null) === normalizedRetentionDueDate &&
                (existing.amountTaxInclusive ?? null) === (input.amountTaxInclusive ?? null) &&
                (existing.amountTaxExclusive ?? null) === (input.amountTaxExclusive ?? null) &&
                (existing.taxRate ?? null) === (input.taxRate ?? null) &&
                (existing.downPaymentRate ?? null) === (input.downPaymentRate ?? null) &&
                (existing.retentionRate ?? null) === (input.retentionRate ?? null) &&
                (existing.paymentTerms ?? null) === (input.paymentTerms ?? null) &&
                (existing.sourceReadinessId ?? null) === (input.sourceReadinessId ?? null) &&
                (existing.sourceBaselineId ?? null) === (input.sourceBaselineId ?? null);

            if (!sameFrozenPayload) {
                throw new ConflictException(
                    `ContractTermSnapshot ${input.id} already exists with different frozen terms. Use amendment flow to create a new snapshot.`
                );
            }

            return existing;
        }

        const snapshot = this.create({
            id: input.id,
            contractId: input.contractId,
            snapshotStatus: 'active',
            effectiveAt: new Date(),
            effectiveBy: input.effectiveBy ?? null,
            retentionDueDate: input.retentionDueDate ?? null,
            amountTaxInclusive: input.amountTaxInclusive ?? null,
            amountTaxExclusive: input.amountTaxExclusive ?? null,
            taxRate: input.taxRate ?? null,
            downPaymentRate: input.downPaymentRate ?? null,
            retentionRate: input.retentionRate ?? null,
            paymentTerms: input.paymentTerms ?? null,
            sourceReadinessId: input.sourceReadinessId ?? null,
            sourceBaselineId: input.sourceBaselineId ?? null,
            createdBy: input.createdBy ?? null
        });
        await this.save(snapshot);

        return snapshot;
    }

    async save(contractTermSnapshot: ContractTermSnapshot): Promise<void> {
        await this.contractTermSnapshotRepository.getEntityManager().persist(contractTermSnapshot).flush();
    }
}

@Injectable()
export class ContractAmendmentRepository {
    constructor(
        @InjectRepository(ContractAmendment)
        private readonly contractAmendmentRepository: EntityRepository<ContractAmendment>
    ) {}

    async findById(id: string): Promise<ContractAmendment | null> {
        return this.contractAmendmentRepository.findOne({ id });
    }

    async findEffectiveById(id: string): Promise<ContractAmendment | null> {
        return this.contractAmendmentRepository.findOne({
            id,
            status: 'effective',
            isCurrent: true
        });
    }

    async findCurrentByContractId(contractId: string): Promise<ContractAmendment | null> {
        return this.contractAmendmentRepository.findOne({
            contractId,
            status: 'effective',
            isCurrent: true
        });
    }

    create(input: ConstructorParameters<typeof ContractAmendment>[0]): ContractAmendment {
        return this.contractAmendmentRepository.create(input);
    }

    async save(contractAmendment: ContractAmendment): Promise<void> {
        await this.contractAmendmentRepository.getEntityManager().persist(contractAmendment).flush();
    }
}
