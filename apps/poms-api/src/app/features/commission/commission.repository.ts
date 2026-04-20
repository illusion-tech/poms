import { EntityManager, EntityRepository, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { ApprovalSummarySnapshot } from '../approval-summary/approval-summary.entity';
import { Contract, ContractTermSnapshot } from '../contract/contract.entity';
import { PaymentRecord } from '../contract-finance/payment-record.entity';
import { ReceiptRecord } from '../contract-finance/receipt-record.entity';
import { ProjectHandover, ProjectReceiptJudgmentFreeze } from '../project-handover/project-handover.entity';
import { CommissionGateReviewRecord } from '../project-cost/commission-gate-review-record.entity';
import { OperatingSignalToCommissionGateBinding } from '../project-cost/operating-signal-gate-binding.entity';
import { Project } from '../project/project.entity';
import { CommissionAdjustment } from './commission-adjustment.entity';
import { CommissionCalculation } from './commission-calculation.entity';
import { CommissionDepartureExceptionDecision } from './commission-departure-exception-decision.entity';
import { CommissionFinalSettlementSnapshot } from './commission-final-settlement-snapshot.entity';
import { CommissionFreezeChangeRequest } from './commission-freeze-change-request.entity';
import { CommissionFreezeDisputeRecord } from './commission-freeze-dispute-record.entity';
import { CommissionPayout, type CommissionPayoutStage } from './commission-payout.entity';
import { CommissionRoleAssignment } from './commission-role-assignment.entity';
import { CommissionRuleExplanationSnapshot } from './commission-rule-explanation-snapshot.entity';
import { CommissionRuleVersion } from './commission-rule-version.entity';

@Injectable()
export class CommissionRepository {
    constructor(
        @InjectRepository(Project)
        private readonly projectRepository: EntityRepository<Project>,
        @InjectRepository(Contract)
        private readonly contractRepository: EntityRepository<Contract>,
        @InjectRepository(ContractTermSnapshot)
        private readonly contractTermSnapshotRepository: EntityRepository<ContractTermSnapshot>,
        @InjectRepository(ReceiptRecord)
        private readonly receiptRepository: EntityRepository<ReceiptRecord>,
        @InjectRepository(PaymentRecord)
        private readonly paymentRepository: EntityRepository<PaymentRecord>,
        @InjectRepository(ProjectHandover)
        private readonly projectHandoverRepository: EntityRepository<ProjectHandover>,
        @InjectRepository(ProjectReceiptJudgmentFreeze)
        private readonly receiptJudgmentFreezeRepository: EntityRepository<ProjectReceiptJudgmentFreeze>,
        @InjectRepository(ApprovalSummarySnapshot)
        private readonly approvalSummarySnapshotRepository: EntityRepository<ApprovalSummarySnapshot>,
        @InjectRepository(CommissionGateReviewRecord)
        private readonly gateReviewRecordRepository: EntityRepository<CommissionGateReviewRecord>,
        @InjectRepository(OperatingSignalToCommissionGateBinding)
        private readonly gateBindingRepository: EntityRepository<OperatingSignalToCommissionGateBinding>,
        @InjectRepository(CommissionRuleVersion)
        private readonly ruleVersionRepository: EntityRepository<CommissionRuleVersion>,
        @InjectRepository(CommissionRoleAssignment)
        private readonly roleAssignmentRepository: EntityRepository<CommissionRoleAssignment>,
        @InjectRepository(CommissionFreezeDisputeRecord)
        private readonly freezeDisputeRepository: EntityRepository<CommissionFreezeDisputeRecord>,
        @InjectRepository(CommissionFreezeChangeRequest)
        private readonly freezeChangeRequestRepository: EntityRepository<CommissionFreezeChangeRequest>,
        @InjectRepository(CommissionCalculation)
        private readonly calculationRepository: EntityRepository<CommissionCalculation>,
        @InjectRepository(CommissionPayout)
        private readonly payoutRepository: EntityRepository<CommissionPayout>,
        @InjectRepository(CommissionAdjustment)
        private readonly adjustmentRepository: EntityRepository<CommissionAdjustment>,
        @InjectRepository(CommissionDepartureExceptionDecision)
        private readonly departureExceptionDecisionRepository: EntityRepository<CommissionDepartureExceptionDecision>,
        @InjectRepository(CommissionFinalSettlementSnapshot)
        private readonly finalSettlementSnapshotRepository: EntityRepository<CommissionFinalSettlementSnapshot>,
        @InjectRepository(CommissionRuleExplanationSnapshot)
        private readonly ruleExplanationSnapshotRepository: EntityRepository<CommissionRuleExplanationSnapshot>
    ) {}

    async transactional<T>(work: (em: EntityManager) => Promise<T>): Promise<T> {
        return this.projectRepository.getEntityManager().transactional(work);
    }

    async findProjectById(id: string): Promise<Project | null> {
        return this.projectRepository.findOne({ id });
    }

    async findActiveContractsForProject(projectId: string): Promise<Contract[]> {
        return this.contractRepository.find({ projectId, status: 'active' });
    }

    async findContractTermSnapshotById(id: string): Promise<ContractTermSnapshot | null> {
        return this.contractTermSnapshotRepository.findOne({ id });
    }

    async findConfirmedReceiptsForProject(projectId: string): Promise<ReceiptRecord[]> {
        return this.receiptRepository.find({ projectId, status: 'confirmed' });
    }

    async findReceiptById(id: string): Promise<ReceiptRecord | null> {
        return this.receiptRepository.findOne({ id });
    }

    async findConfirmedPaymentsForProject(projectId: string): Promise<PaymentRecord[]> {
        return this.paymentRepository.find({ projectId, status: 'confirmed' });
    }

    async findProjectHandoverById(id: string): Promise<ProjectHandover | null> {
        return this.projectHandoverRepository.findOne({ id });
    }

    async findCurrentReceiptJudgmentFreeze(projectId: string): Promise<ProjectReceiptJudgmentFreeze | null> {
        return this.receiptJudgmentFreezeRepository.findOne(
            { projectId, isCurrent: true },
            { orderBy: { frozenAt: QueryOrder.DESC, createdAt: QueryOrder.DESC } }
        );
    }

    async findApprovalSummarySnapshotById(id: string): Promise<ApprovalSummarySnapshot | null> {
        return this.approvalSummarySnapshotRepository.findOne({ id });
    }

    async findGateReviewRecordById(id: string): Promise<CommissionGateReviewRecord | null> {
        return this.gateReviewRecordRepository.findOne({ id });
    }

    async findGateBindingById(id: string): Promise<OperatingSignalToCommissionGateBinding | null> {
        return this.gateBindingRepository.findOne({ id });
    }

    // ── Rule Versions ────────────────────────────────────────────────────────

    async findAllRuleVersions(): Promise<CommissionRuleVersion[]> {
        return this.ruleVersionRepository.findAll({
            orderBy: { ruleCode: QueryOrder.ASC, version: QueryOrder.DESC }
        });
    }

    async findRuleVersionById(id: string): Promise<CommissionRuleVersion | null> {
        return this.ruleVersionRepository.findOne({ id });
    }

    async findRuleVersionByCodeAndVersion(ruleCode: string, version: number): Promise<CommissionRuleVersion | null> {
        return this.ruleVersionRepository.findOne({ ruleCode, version });
    }

    async findActiveRuleVersion(ruleCode: string): Promise<CommissionRuleVersion | null> {
        return this.ruleVersionRepository.findOne({ ruleCode, status: 'active' });
    }

    createRuleVersion(input: ConstructorParameters<typeof CommissionRuleVersion>[0]): CommissionRuleVersion {
        return this.ruleVersionRepository.create(input);
    }

    async persistAndFlushRuleVersion(entity: CommissionRuleVersion): Promise<void> {
        const em = this.ruleVersionRepository.getEntityManager();
        em.persist(entity);
        await em.flush();
    }

    async flushRuleVersion(): Promise<void> {
        await this.ruleVersionRepository.getEntityManager().flush();
    }

    // ── Role Assignments ─────────────────────────────────────────────────────

    async findCurrentRoleAssignment(projectId: string): Promise<CommissionRoleAssignment | null> {
        return this.roleAssignmentRepository.findOne({ projectId, isCurrent: true });
    }

    async findRoleAssignmentById(id: string): Promise<CommissionRoleAssignment | null> {
        return this.roleAssignmentRepository.findOne({ id });
    }

    async findAllRoleAssignmentsForProject(projectId: string): Promise<CommissionRoleAssignment[]> {
        return this.roleAssignmentRepository.find(
            { projectId },
            { orderBy: { version: QueryOrder.DESC } }
        );
    }

    createRoleAssignment(input: ConstructorParameters<typeof CommissionRoleAssignment>[0]): CommissionRoleAssignment {
        return this.roleAssignmentRepository.create(input);
    }

    async persistAndFlushRoleAssignment(entity: CommissionRoleAssignment): Promise<void> {
        const em = this.roleAssignmentRepository.getEntityManager();
        em.persist(entity);
        await em.flush();
    }

    async flushRoleAssignment(): Promise<void> {
        await this.roleAssignmentRepository.getEntityManager().flush();
    }

    // ── Freeze Disputes / Change Requests ───────────────────────────────────

    async findOpenFreezeDisputeByFreezeVersionId(freezeVersionId: string): Promise<CommissionFreezeDisputeRecord | null> {
        return this.freezeDisputeRepository.findOne({ freezeVersionId, status: 'submitted' });
    }

    async findFreezeDisputeById(id: string): Promise<CommissionFreezeDisputeRecord | null> {
        return this.freezeDisputeRepository.findOne({ id });
    }

    createFreezeDisputeRecord(
        input: ConstructorParameters<typeof CommissionFreezeDisputeRecord>[0]
    ): CommissionFreezeDisputeRecord {
        return this.freezeDisputeRepository.create(input);
    }

    async persistAndFlushFreezeDisputeRecord(entity: CommissionFreezeDisputeRecord): Promise<void> {
        const em = this.freezeDisputeRepository.getEntityManager();
        em.persist(entity);
        await em.flush();
    }

    async flushFreezeDisputeRecord(): Promise<void> {
        await this.freezeDisputeRepository.getEntityManager().flush();
    }

    async findFreezeChangeRequestById(id: string): Promise<CommissionFreezeChangeRequest | null> {
        return this.freezeChangeRequestRepository.findOne({ id });
    }

    createFreezeChangeRequest(
        input: ConstructorParameters<typeof CommissionFreezeChangeRequest>[0]
    ): CommissionFreezeChangeRequest {
        return this.freezeChangeRequestRepository.create(input);
    }

    async persistAndFlushFreezeChangeRequest(entity: CommissionFreezeChangeRequest): Promise<void> {
        const em = this.freezeChangeRequestRepository.getEntityManager();
        em.persist(entity);
        await em.flush();
    }

    async flushFreezeChangeRequest(): Promise<void> {
        await this.freezeChangeRequestRepository.getEntityManager().flush();
    }

    // ── Calculations ─────────────────────────────────────────────────────────

    async findCurrentCalculation(projectId: string): Promise<CommissionCalculation | null> {
        return this.calculationRepository.findOne({ projectId, isCurrent: true });
    }

    async findCalculationById(id: string): Promise<CommissionCalculation | null> {
        return this.calculationRepository.findOne({ id });
    }

    async findCalculationsForProject(projectId: string): Promise<CommissionCalculation[]> {
        return this.calculationRepository.find({ projectId }, { orderBy: { version: QueryOrder.DESC } });
    }

    createCalculation(input: ConstructorParameters<typeof CommissionCalculation>[0]): CommissionCalculation {
        return this.calculationRepository.create(input);
    }

    async persistAndFlushCalculation(entity: CommissionCalculation): Promise<void> {
        const em = this.calculationRepository.getEntityManager();
        em.persist(entity);
        await em.flush();
    }

    async flushCalculation(): Promise<void> {
        await this.calculationRepository.getEntityManager().flush();
    }

    // ── Payouts ──────────────────────────────────────────────────────────────

    async findPayoutById(id: string): Promise<CommissionPayout | null> {
        return this.payoutRepository.findOne({ id });
    }

    async findPayoutsForProject(projectId: string): Promise<CommissionPayout[]> {
        return this.payoutRepository.find(
            { projectId },
            { orderBy: { createdAt: QueryOrder.DESC, updatedAt: QueryOrder.DESC } }
        );
    }

    async findPayoutByProjectCalculationStage(projectId: string, calculationId: string, stageType: CommissionPayoutStage): Promise<CommissionPayout | null> {
        return this.payoutRepository.findOne({ projectId, calculationId, stageType, payoutKind: 'primary' });
    }

    createPayout(input: ConstructorParameters<typeof CommissionPayout>[0]): CommissionPayout {
        return this.payoutRepository.create(input);
    }

    async persistAndFlushPayout(entity: CommissionPayout): Promise<void> {
        const em = this.payoutRepository.getEntityManager();
        em.persist(entity);
        await em.flush();
    }

    async flushPayout(): Promise<void> {
        await this.payoutRepository.getEntityManager().flush();
    }

    // ── Adjustments ──────────────────────────────────────────────────────────

    async findAdjustmentById(id: string): Promise<CommissionAdjustment | null> {
        return this.adjustmentRepository.findOne({ id });
    }

    async findAdjustmentsForProject(projectId: string): Promise<CommissionAdjustment[]> {
        return this.adjustmentRepository.find(
            { projectId },
            { orderBy: { createdAt: QueryOrder.DESC, updatedAt: QueryOrder.DESC } }
        );
    }

    createAdjustment(input: ConstructorParameters<typeof CommissionAdjustment>[0]): CommissionAdjustment {
        return this.adjustmentRepository.create(input);
    }

    async persistAndFlushAdjustment(entity: CommissionAdjustment): Promise<void> {
        const em = this.adjustmentRepository.getEntityManager();
        em.persist(entity);
        await em.flush();
    }

    async flushAdjustment(): Promise<void> {
        await this.adjustmentRepository.getEntityManager().flush();
    }

    // ── Departure Exception Decisions ───────────────────────────────────────

    async findCurrentDepartureExceptionDecision(projectId: string): Promise<CommissionDepartureExceptionDecision | null> {
        return this.departureExceptionDecisionRepository.findOne({ projectId, isCurrent: true });
    }

    async findDepartureExceptionDecisionById(id: string): Promise<CommissionDepartureExceptionDecision | null> {
        return this.departureExceptionDecisionRepository.findOne({ id });
    }

    async findDepartureExceptionDecisionsForProject(projectId: string): Promise<CommissionDepartureExceptionDecision[]> {
        return this.departureExceptionDecisionRepository.find(
            { projectId },
            { orderBy: { version: QueryOrder.DESC } }
        );
    }

    createDepartureExceptionDecision(
        input: ConstructorParameters<typeof CommissionDepartureExceptionDecision>[0]
    ): CommissionDepartureExceptionDecision {
        return this.departureExceptionDecisionRepository.create(input);
    }

    async persistAndFlushDepartureExceptionDecision(entity: CommissionDepartureExceptionDecision): Promise<void> {
        const em = this.departureExceptionDecisionRepository.getEntityManager();
        em.persist(entity);
        await em.flush();
    }

    async flushDepartureExceptionDecision(): Promise<void> {
        await this.departureExceptionDecisionRepository.getEntityManager().flush();
    }

    // ── Final Settlement Snapshots ──────────────────────────────────────────

    async findCurrentFinalSettlementSnapshot(projectId: string): Promise<CommissionFinalSettlementSnapshot | null> {
        return this.finalSettlementSnapshotRepository.findOne({ projectId, isCurrent: true });
    }

    async findFinalSettlementSnapshotById(id: string): Promise<CommissionFinalSettlementSnapshot | null> {
        return this.finalSettlementSnapshotRepository.findOne({ id });
    }

    async findFinalSettlementSnapshotsForProject(projectId: string): Promise<CommissionFinalSettlementSnapshot[]> {
        return this.finalSettlementSnapshotRepository.find(
            { projectId },
            { orderBy: { version: QueryOrder.DESC } }
        );
    }

    createFinalSettlementSnapshot(
        input: ConstructorParameters<typeof CommissionFinalSettlementSnapshot>[0]
    ): CommissionFinalSettlementSnapshot {
        return this.finalSettlementSnapshotRepository.create(input);
    }

    async persistAndFlushFinalSettlementSnapshot(entity: CommissionFinalSettlementSnapshot): Promise<void> {
        const em = this.finalSettlementSnapshotRepository.getEntityManager();
        em.persist(entity);
        await em.flush();
    }

    async flushFinalSettlementSnapshot(): Promise<void> {
        await this.finalSettlementSnapshotRepository.getEntityManager().flush();
    }

    // ── Rule Explanation Snapshots ──────────────────────────────────────────

    async findCurrentRuleExplanationSnapshot(projectId: string): Promise<CommissionRuleExplanationSnapshot | null> {
        return this.ruleExplanationSnapshotRepository.findOne({ projectId, isCurrent: true });
    }

    async findRuleExplanationSnapshotById(id: string): Promise<CommissionRuleExplanationSnapshot | null> {
        return this.ruleExplanationSnapshotRepository.findOne({ id });
    }

    async findRuleExplanationSnapshotsForProject(projectId: string): Promise<CommissionRuleExplanationSnapshot[]> {
        return this.ruleExplanationSnapshotRepository.find(
            { projectId },
            { orderBy: { version: QueryOrder.DESC } }
        );
    }

    createRuleExplanationSnapshot(
        input: ConstructorParameters<typeof CommissionRuleExplanationSnapshot>[0]
    ): CommissionRuleExplanationSnapshot {
        return this.ruleExplanationSnapshotRepository.create(input);
    }

    async persistAndFlushRuleExplanationSnapshot(entity: CommissionRuleExplanationSnapshot): Promise<void> {
        const em = this.ruleExplanationSnapshotRepository.getEntityManager();
        em.persist(entity);
        await em.flush();
    }

    async flushRuleExplanationSnapshot(): Promise<void> {
        await this.ruleExplanationSnapshotRepository.getEntityManager().flush();
    }
}
