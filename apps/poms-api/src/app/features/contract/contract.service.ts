import { Injectable, NotFoundException } from '@nestjs/common';
import { Contract } from './contract.entity';
import { ContractRepository } from './contract.repository';

export interface FindContractsQuery {
    projectId?: string;
    status?: string;
    keyword?: string;
}

export interface CreateContractRecord {
    projectId: string;
    contractNo: string;
    status?: string;
    signedAmount: string;
    currencyCode?: string;
    currentSnapshotId?: string | null;
    signedAt?: Date | null;
    createdBy?: string | null;
    updatedBy?: string | null;
}

export interface UpdateContractBasicInfoRecord {
    signedAmount?: string;
    currencyCode?: string;
    currentSnapshotId?: string | null;
    signedAt?: Date | null;
    updatedBy?: string | null;
}

@Injectable()
export class ContractService {
    constructor(private readonly contractRepository: ContractRepository) {}

    async findMany(query: FindContractsQuery): Promise<Contract[]> {
        return this.contractRepository.findMany(query);
    }

    async findById(id: string): Promise<Contract | null> {
        return this.contractRepository.findById(id);
    }

    async findByNo(contractNo: string): Promise<Contract | null> {
        return this.contractRepository.findByNo(contractNo);
    }

    async createAndSave(input: CreateContractRecord): Promise<Contract> {
        const contract = this.contractRepository.create({
            projectId: input.projectId,
            contractNo: input.contractNo,
            status: input.status ?? 'draft',
            signedAmount: input.signedAmount,
            currencyCode: input.currencyCode ?? 'CNY',
            currentSnapshotId: input.currentSnapshotId ?? null,
            signedAt: input.signedAt ?? null,
            createdBy: input.createdBy ?? null,
            updatedBy: input.updatedBy ?? null
        });

        await this.contractRepository.save(contract);

        return contract;
    }

    async updateBasicInfo(id: string, input: UpdateContractBasicInfoRecord): Promise<Contract> {
        const contract = await this.contractRepository.findById(id);
        if (!contract) {
            throw new NotFoundException(`Contract ${id} not found`);
        }

        if (input.signedAmount !== undefined) {
            contract.signedAmount = input.signedAmount;
        }

        if (input.currencyCode !== undefined) {
            contract.currencyCode = input.currencyCode;
        }

        if (input.currentSnapshotId !== undefined) {
            contract.currentSnapshotId = input.currentSnapshotId;
        }

        if (input.signedAt !== undefined) {
            contract.signedAt = input.signedAt;
        }

        if (input.updatedBy !== undefined) {
            contract.updatedBy = input.updatedBy;
        }

        await this.contractRepository.save(contract);

        return contract;
    }
}
