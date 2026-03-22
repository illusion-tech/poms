import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import type { CommandResult } from '@poms/shared-contracts';
import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalRecord } from '../approval/approval-record.entity';
import { ProjectService } from '../project/project.service';
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

export interface ActivateContractRecord {
    comment?: string;
    expectedVersion?: number;
}

const CONTRACT_REVIEW_APPROVAL_TYPE = 'contract-review';
const CONTRACT_TARGET_TYPE = 'Contract';

@Injectable()
export class ContractService {
    constructor(
        private readonly contractRepository: ContractRepository,
        private readonly projectService: ProjectService,
        @InjectRepository(ApprovalRecord)
        private readonly approvalRecordRepository: EntityRepository<ApprovalRecord>
    ) {}

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
        const project = await this.projectService.findById(input.projectId);
        if (!project) {
            throw new NotFoundException(`Project ${input.projectId} not found`);
        }

        const existingContract = await this.contractRepository.findByNo(input.contractNo);
        if (existingContract) {
            throw new ConflictException(`Contract no ${input.contractNo} already exists`);
        }

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

        if (contract.status !== 'draft') {
            throw new BadRequestException(`Contract ${id} cannot be edited in status ${contract.status}`);
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

    async activate(id: string, actorUserId: string, input: ActivateContractRecord): Promise<CommandResult> {
        const contract = await this.contractRepository.findById(id);
        if (!contract) {
            throw new NotFoundException(`Contract ${id} not found`);
        }

        if (contract.status !== 'pending-review') {
            throw new BadRequestException(`Contract ${id} cannot be activated in status ${contract.status}`);
        }

        this.assertExpectedVersion(contract.rowVersion, input.expectedVersion, 'Contract');

        const pendingApproval = await this.approvalRecordRepository.findOne({
            approvalType: CONTRACT_REVIEW_APPROVAL_TYPE,
            targetObjectType: CONTRACT_TARGET_TYPE,
            targetObjectId: contract.id,
            currentStatus: 'pending'
        });
        if (pendingApproval) {
            throw new BadRequestException(`Contract ${id} still has a pending review approval`);
        }

        const approvedApproval = await this.approvalRecordRepository.findOne({
            approvalType: CONTRACT_REVIEW_APPROVAL_TYPE,
            targetObjectType: CONTRACT_TARGET_TYPE,
            targetObjectId: contract.id,
            currentStatus: 'approved'
        });
        if (!approvedApproval) {
            throw new BadRequestException(`Contract ${id} cannot be activated without an approved review record`);
        }

        const snapshotId = contract.currentSnapshotId ?? randomUUID();
        contract.status = 'active';
        contract.currentSnapshotId = snapshotId;
        contract.updatedBy = actorUserId;

        await this.contractRepository.save(contract);

        return {
            targetId: contract.id,
            targetType: CONTRACT_TARGET_TYPE,
            resultStatus: 'activated',
            businessStatusAfter: contract.status,
            approvalRecordId: approvedApproval.id,
            confirmationRecordId: null,
            todoItemIds: [],
            snapshotId
        };
    }

    private assertExpectedVersion(actualVersion: number, expectedVersion: number | undefined, resourceType: string): void {
        if (expectedVersion !== undefined && actualVersion !== expectedVersion) {
            throw new ConflictException(`${resourceType} version ${expectedVersion} does not match current version ${actualVersion}`);
        }
    }
}
