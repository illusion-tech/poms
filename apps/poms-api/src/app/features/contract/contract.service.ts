import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { ApprovalStatusValue, ApprovalTypeValue, ContractStatusValue, TargetObjectTypeValue, type CommandResult, type ContractStatus } from '@poms/shared-contracts';

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalRecord } from '../approval/approval-record.entity';
import { BusinessNumberService } from '../business-number/business-number.service';
import { ContractReadinessService } from '../contract-readiness/contract-readiness.service';
import { ProjectService } from '../project/project.service';
import { Contract } from './contract.entity';
import { CommercialReleaseBaseline } from '../contract-readiness/commercial-release-baseline.entity';
import { ContractRepository, ContractTermSnapshotRepository } from './contract.repository';
import { CommercialReleaseBaselineRepository } from '../contract-readiness/commercial-release-baseline.repository';

export interface FindContractsQuery {
    projectId?: string;
    status?: ContractStatus;
    keyword?: string;
}

export interface CreateContractRecord {
    projectId: string;
    customerContractNo?: string | null;
    status?: ContractStatus;
    signedAmount: string;
    currencyCode?: string;
    signedAt?: Date | null;
    retentionDueDate?: string | null;
    createdBy?: string | null;
    updatedBy?: string | null;
}

export interface UpdateContractBasicInfoRecord {
    customerContractNo?: string | null;
    signedAmount?: string;
    currencyCode?: string;
    signedAt?: Date | null;
    retentionDueDate?: string | null;
    updatedBy?: string | null;
}

export interface ActivateContractRecord {
    comment?: string;
    expectedVersion?: number;
}

const CONTRACT_REVIEW_APPROVAL_TYPE = ApprovalTypeValue.ContractReview;
const CONTRACT_TARGET_TYPE = TargetObjectTypeValue.Contract;

@Injectable()
export class ContractService {
    constructor(
        private readonly contractRepository: ContractRepository,
        private readonly businessNumberService: BusinessNumberService,
        private readonly projectService: ProjectService,
        private readonly contractReadinessService: ContractReadinessService,
        private readonly contractTermSnapshotRepository: ContractTermSnapshotRepository,
        private readonly commercialReleaseBaselineRepository: CommercialReleaseBaselineRepository,
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

        return this.contractRepository.getEntityManager().transactional(async (em) => {
            const contractNo = await this.businessNumberService.next('contract', new Date(), em);
            const contract = em.create(Contract, {
                projectId: input.projectId,
                contractNo,
                customerContractNo: input.customerContractNo?.trim() || null,
                status: input.status ?? ContractStatusValue.Draft,
                signedAmount: input.signedAmount,
                currencyCode: input.currencyCode ?? 'CNY',
                signedAt: input.signedAt ?? null,
                retentionDueDate: this.normalizeDateOnly(input.retentionDueDate) ?? null,
                createdBy: input.createdBy ?? null,
                updatedBy: input.updatedBy ?? null
            });

            em.persist(contract);
            await em.flush();
            return contract;
        });
    }

    async updateBasicInfo(id: string, input: UpdateContractBasicInfoRecord): Promise<Contract> {
        const contract = await this.contractRepository.findById(id);
        if (!contract) {
            throw new NotFoundException(`Contract ${id} not found`);
        }

        if (contract.status !== ContractStatusValue.Draft) {
            throw new BadRequestException(`Contract ${id} cannot be edited in status ${contract.status}`);
        }

        if (input.signedAmount !== undefined) {
            contract.signedAmount = input.signedAmount;
        }

        if (input.customerContractNo !== undefined) {
            contract.customerContractNo = input.customerContractNo?.trim() || null;
        }

        if (input.currencyCode !== undefined) {
            contract.currencyCode = input.currencyCode;
        }

        if (input.signedAt !== undefined) {
            contract.signedAt = input.signedAt;
        }

        if (input.retentionDueDate !== undefined) {
            contract.retentionDueDate = this.normalizeDateOnly(input.retentionDueDate) ?? null;
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

        if (contract.status !== ContractStatusValue.PendingReview) {
            throw new BadRequestException(`Contract ${id} cannot be activated in status ${contract.status}`);
        }

        this.assertExpectedVersion(contract.rowVersion, input.expectedVersion, 'Contract');

        const pendingApproval = await this.approvalRecordRepository.findOne({
            approvalType: CONTRACT_REVIEW_APPROVAL_TYPE,
            targetObjectType: CONTRACT_TARGET_TYPE,
            targetObjectId: contract.id,
            currentStatus: ApprovalStatusValue.Pending
        });
        if (pendingApproval) {
            throw new BadRequestException(`Contract ${id} still has a pending review approval`);
        }

        const approvedApproval = await this.approvalRecordRepository.findOne({
            approvalType: CONTRACT_REVIEW_APPROVAL_TYPE,
            targetObjectType: CONTRACT_TARGET_TYPE,
            targetObjectId: contract.id,
            currentStatus: ApprovalStatusValue.Approved
        });
        if (!approvedApproval) {
            throw new BadRequestException(`Contract ${id} cannot be activated without an approved review record`);
        }

        const activationReadiness = await this.contractReadinessService.resolveActivationReadiness(contract.projectId);
        if (!activationReadiness.allowed) {
            throw new BadRequestException(activationReadiness.reason ?? `Contract ${id} cannot be activated before contract readiness is completed`);
        }

        const snapshotId = activationReadiness.snapshotId;
        if (!snapshotId) {
            throw new BadRequestException(`Contract ${id} cannot be activated without an initialized contract snapshot. Run readiness initialization first.`);
        }

        if (!activationReadiness.sourceReadinessId) {
            throw new BadRequestException(`Contract ${id} cannot be activated without a contract readiness package`);
        }

        const readinessPackage = await this.contractReadinessService.findContractReadinessById(activationReadiness.sourceReadinessId);
        if (!readinessPackage) {
            throw new BadRequestException(`Contract readiness package ${activationReadiness.sourceReadinessId} not found`);
        }

        const baseline = await this.commercialReleaseBaselineRepository.findById(readinessPackage.sourceBaselineId);
        this.assertBaselineHasCoreTerms(baseline);

        await this.contractTermSnapshotRepository.createActiveSnapshotIfAbsent({
            id: snapshotId,
            contractId: contract.id,
            effectiveBy: actorUserId,
            createdBy: actorUserId,
            retentionDueDate: this.normalizeDateOnly(contract.retentionDueDate ?? null) ?? null,
            amountTaxInclusive: baseline?.amountTaxInclusive ?? null,
            amountTaxExclusive: baseline?.amountTaxExclusive ?? null,
            taxRate: baseline?.taxRate ?? null,
            downPaymentRate: baseline?.downPaymentRate ?? null,
            retentionRate: baseline?.retentionRate ?? null,
            paymentTerms: baseline?.paymentTerms ?? null,
            sourceReadinessId: activationReadiness.sourceReadinessId ?? null,
            sourceBaselineId: baseline?.id ?? null
        });
        contract.status = ContractStatusValue.Active;
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

    private assertBaselineHasCoreTerms(baseline: CommercialReleaseBaseline | null): asserts baseline is CommercialReleaseBaseline {
        if (!baseline) {
            throw new BadRequestException('Missing commercial release baseline for contract term snapshot');
        }

        const missing: string[] = [];
        if (baseline.amountTaxInclusive == null || baseline.amountTaxInclusive === '') missing.push('amountTaxInclusive');
        if (baseline.amountTaxExclusive == null || baseline.amountTaxExclusive === '') missing.push('amountTaxExclusive');
        if (baseline.taxRate == null || baseline.taxRate === '') missing.push('taxRate');
        if (baseline.downPaymentRate == null || baseline.downPaymentRate === '') missing.push('downPaymentRate');
        if (baseline.retentionRate == null || baseline.retentionRate === '') missing.push('retentionRate');
        if (baseline.paymentTerms == null || baseline.paymentTerms === '') missing.push('paymentTerms');

        if (missing.length) {
            throw new BadRequestException(`Commercial release baseline missing core contract terms: ${missing.join(', ')}`);
        }
    }

    private normalizeDateOnly(value: string | null | undefined): string | null | undefined {
        if (value === undefined) {
            return undefined;
        }
        return value === null ? null : value.slice(0, 10);
    }
}
