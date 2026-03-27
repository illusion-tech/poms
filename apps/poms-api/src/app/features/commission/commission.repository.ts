import { EntityManager, EntityRepository, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { Project } from '../project/project.entity';
import { CommissionAdjustment } from './commission-adjustment.entity';
import { CommissionCalculation } from './commission-calculation.entity';
import { CommissionPayout, type CommissionPayoutStage } from './commission-payout.entity';
import { CommissionRoleAssignment } from './commission-role-assignment.entity';
import { CommissionRuleVersion } from './commission-rule-version.entity';

@Injectable()
export class CommissionRepository {
    constructor(
        @InjectRepository(Project)
        private readonly projectRepository: EntityRepository<Project>,
        @InjectRepository(CommissionRuleVersion)
        private readonly ruleVersionRepository: EntityRepository<CommissionRuleVersion>,
        @InjectRepository(CommissionRoleAssignment)
        private readonly roleAssignmentRepository: EntityRepository<CommissionRoleAssignment>,
        @InjectRepository(CommissionCalculation)
        private readonly calculationRepository: EntityRepository<CommissionCalculation>,
        @InjectRepository(CommissionPayout)
        private readonly payoutRepository: EntityRepository<CommissionPayout>,
        @InjectRepository(CommissionAdjustment)
        private readonly adjustmentRepository: EntityRepository<CommissionAdjustment>
    ) {}

    async transactional<T>(work: (em: EntityManager) => Promise<T>): Promise<T> {
        return this.projectRepository.getEntityManager().transactional(work);
    }

    async findProjectById(id: string): Promise<Project | null> {
        return this.projectRepository.findOne({ id });
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
        return this.payoutRepository.findOne({ projectId, calculationId, stageType });
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
}
