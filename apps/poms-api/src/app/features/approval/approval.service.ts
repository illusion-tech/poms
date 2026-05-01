import { EntityManager, EntityRepository, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type {
    ApprovalRecordSummary,
    ApproveRecordRequest,
    CommandResult,
    RejectApprovalRecordRequest,
    SubmitCommissionAdjustmentApprovalRequest,
    SubmitCommissionPayoutApprovalRequest,
    SubmitContractReviewRequest,
    TodoItemSummary
} from '@poms/shared-contracts';
import { randomUUID } from 'node:crypto';
import {
    COMMISSION_APPROVER_USERNAME,
    CONTRACT_REVIEW_APPROVER_USERNAME,
    requireDevUserByUsername
} from '../../core/platform/dev-platform.fixtures';
import { CommissionAdjustment } from '../commission/commission-adjustment.entity';
import { CommissionDepartureExceptionDecision } from '../commission/commission-departure-exception-decision.entity';
import { CommissionFinalSettlementSnapshot } from '../commission/commission-final-settlement-snapshot.entity';
import { CommissionPayout } from '../commission/commission-payout.entity';
import { CommissionRoleAssignment } from '../commission/commission-role-assignment.entity';
import { CommissionRuleExplanationSnapshot } from '../commission/commission-rule-explanation-snapshot.entity';
import {
    buildPendingFinalRuleExplanation,
    buildRetentionSettlementDraft,
    DEFAULT_RETENTION_REQUIREMENT_SUMMARY,
    evaluateRetentionDueDate,
    FINAL_SETTLEMENT_STATUS_PENDING,
    FINAL_SETTLEMENT_STATUS_PENDING_RETENTION,
    NON_RETENTION_SETTLEMENT_STATUS_PENDING,
    NON_RETENTION_SETTLEMENT_STATUS_SETTLED,
    RETENTION_SETTLEMENT_STATUS_READY,
    RETENTION_SETTLEMENT_STATUS_SETTLED,
    RETENTION_SETTLEMENT_STATUS_WAITING,
    type RetentionDueEvaluation,
    type RetentionSettlementDraft,
    type RuleExplanationDraft
} from '../commission/commission-settlement-write-chain';
import { CommissionFreezeDisputeRecord } from '../commission/commission-freeze-dispute-record.entity';
import { Contract, ContractTermSnapshot } from '../contract/contract.entity';
import { ReceiptRecord } from '../contract-finance/receipt-record.entity';
import { Customer } from '../customer/customer.entity';
import { Lead } from '../lead/lead.entity';
import { Project } from '../project/project.entity';
import { CommissionGateReviewRecord } from '../project-cost/commission-gate-review-record.entity';
import { OperatingSignalToCommissionGateBinding } from '../project-cost/operating-signal-gate-binding.entity';
import { ApprovalRecord } from './approval-record.entity';
import { TodoItem } from './todo-item.entity';

const CONTRACT_REVIEW_APPROVAL_TYPE = 'contract-review';
const CONTRACT_REVIEW_NODE_KEY = 'contract-review';
const CONTRACT_BUSINESS_DOMAIN = 'contract-finance';
const CONTRACT_TARGET_TYPE = 'Contract';
const COMMISSION_PAYOUT_APPROVAL_TYPE = 'commission-payout-approval';
const COMMISSION_PAYOUT_NODE_KEY = 'commission-payout-approval';
const COMMISSION_BUSINESS_DOMAIN = 'commission';
const COMMISSION_PAYOUT_TARGET_TYPE = 'CommissionPayout';
const COMMISSION_ADJUSTMENT_APPROVAL_TYPE = 'commission-adjustment-approval';
const COMMISSION_ADJUSTMENT_NODE_KEY = 'commission-adjustment-approval';
const COMMISSION_ADJUSTMENT_TARGET_TYPE = 'CommissionAdjustment';
const TODO_SOURCE_TYPE = 'ApprovalRecord';
const TODO_TYPE = 'approval';
const SALES_FOLLOW_UP_REMINDER_SOURCE_TYPE = 'SalesFollowUpRecord';
const SALES_FOLLOW_UP_REMINDER_TODO_TYPE = 'sales_follow_up_reminder';
const PROJECT_TARGET_TYPE = 'Project';
const LEAD_TARGET_TYPE = 'Lead';
const CUSTOMER_TARGET_TYPE = 'Customer';
const CONTRACT_REVIEW_APPROVER_USER_ID = requireDevUserByUsername(CONTRACT_REVIEW_APPROVER_USERNAME).id;
const COMMISSION_APPROVER_USER_ID = requireDevUserByUsername(COMMISSION_APPROVER_USERNAME).id;
const APPROVAL_ACTIONS = ['approve', 'reject'];

@Injectable()
export class ApprovalService {
    constructor(
        @InjectRepository(ApprovalRecord)
        private readonly approvalRecordRepository: EntityRepository<ApprovalRecord>,
        @InjectRepository(TodoItem)
        private readonly todoItemRepository: EntityRepository<TodoItem>,
        @InjectRepository(Contract)
        private readonly contractRepository: EntityRepository<Contract>,
        @InjectRepository(CommissionPayout)
        private readonly commissionPayoutRepository: EntityRepository<CommissionPayout>,
        @InjectRepository(CommissionAdjustment)
        private readonly commissionAdjustmentRepository: EntityRepository<CommissionAdjustment>,
        @InjectRepository(Project)
        private readonly projectRepository: EntityRepository<Project>,
        @InjectRepository(Lead)
        private readonly leadRepository: EntityRepository<Lead>,
        @InjectRepository(Customer)
        private readonly customerRepository: EntityRepository<Customer>
    ) {}

    async submitContractReview(contractId: string, initiatorUserId: string, input: SubmitContractReviewRequest): Promise<CommandResult> {
        return this.approvalRecordRepository.getEntityManager().transactional(async (em) => {
            const contract = await em.findOne(Contract, { id: contractId });
            if (!contract) {
                throw new NotFoundException(`Contract ${contractId} not found`);
            }

            if (contract.status !== 'draft') {
                throw new BadRequestException(`Contract ${contractId} cannot submit review in status ${contract.status}`);
            }

            this.assertExpectedVersion(contract.rowVersion, input.expectedVersion, 'Contract');

            const existingApproval = await em.findOne(ApprovalRecord, {
                approvalType: CONTRACT_REVIEW_APPROVAL_TYPE,
                targetObjectType: CONTRACT_TARGET_TYPE,
                targetObjectId: contract.id,
                currentStatus: 'pending'
            });
            if (existingApproval) {
                throw new ConflictException(`Contract ${contractId} already has a pending review approval`);
            }

            contract.status = 'pending-review';

            const approvalRecordId = randomUUID();
            const todoItemId = randomUUID();

            const approvalRecord = em.create(ApprovalRecord, {
                id: approvalRecordId,
                approvalType: CONTRACT_REVIEW_APPROVAL_TYPE,
                businessDomain: CONTRACT_BUSINESS_DOMAIN,
                targetObjectType: CONTRACT_TARGET_TYPE,
                targetObjectId: contract.id,
                projectId: contract.projectId,
                currentStatus: 'pending',
                currentNodeKey: CONTRACT_REVIEW_NODE_KEY,
                initiatorUserId,
                currentApproverUserId: CONTRACT_REVIEW_APPROVER_USER_ID,
                decision: null,
                decisionComment: input.comment ?? null,
                submittedAt: new Date(),
                decidedAt: null,
                closedAt: null
            });

            const todoItem = em.create(TodoItem, {
                id: todoItemId,
                sourceType: TODO_SOURCE_TYPE,
                sourceId: approvalRecordId,
                todoType: TODO_TYPE,
                businessDomain: CONTRACT_BUSINESS_DOMAIN,
                targetObjectType: CONTRACT_TARGET_TYPE,
                targetObjectId: contract.id,
                projectId: contract.projectId,
                title: `合同审核：${contract.contractNo}`,
                summary: input.comment ?? null,
                assigneeUserId: CONTRACT_REVIEW_APPROVER_USER_ID,
                status: 'open',
                priority: 'high',
                dueAt: null,
                completedAt: null
            });

            em.persist([contract, approvalRecord, todoItem]);
            await em.flush();

            return {
                targetId: contract.id,
                targetType: CONTRACT_TARGET_TYPE,
                resultStatus: 'submitted',
                businessStatusAfter: contract.status,
                approvalRecordId: approvalRecord.id,
                confirmationRecordId: null,
                todoItemIds: [todoItem.id],
                snapshotId: null
            };
        });
    }

    async approveRecord(approvalRecordId: string, actorUserId: string, input: ApproveRecordRequest): Promise<CommandResult> {
        return this.resolveApprovalDecision(approvalRecordId, actorUserId, 'approved', input.comment ?? null, input.expectedVersion);
    }

    async rejectRecord(approvalRecordId: string, actorUserId: string, input: RejectApprovalRecordRequest): Promise<CommandResult> {
        const comment = input.comment ? `${input.reason}\n${input.comment}` : input.reason;
        return this.resolveApprovalDecision(approvalRecordId, actorUserId, 'rejected', comment, input.expectedVersion);
    }

    async submitCommissionPayoutApproval(payoutId: string, initiatorUserId: string, input: SubmitCommissionPayoutApprovalRequest): Promise<CommandResult> {
        return this.approvalRecordRepository.getEntityManager().transactional(async (em) => {
            const payout = await em.findOne(CommissionPayout, { id: payoutId });
            if (!payout) {
                throw new NotFoundException(`CommissionPayout ${payoutId} not found`);
            }

            if (payout.status !== 'draft') {
                throw new BadRequestException(`CommissionPayout ${payoutId} cannot submit approval in status ${payout.status}`);
            }

            this.assertExpectedVersion(payout.rowVersion, input.expectedVersion, 'CommissionPayout');
            this.assertRequestStageMatchesPayout(payout.stageType, input.payoutStage);

            const existingApproval = await em.findOne(ApprovalRecord, {
                approvalType: COMMISSION_PAYOUT_APPROVAL_TYPE,
                targetObjectType: COMMISSION_PAYOUT_TARGET_TYPE,
                targetObjectId: payout.id,
                currentStatus: 'pending'
            });
            if (existingApproval) {
                throw new ConflictException(`CommissionPayout ${payoutId} already has a pending approval`);
            }

            let snapshotId: string | null = null;
            if (payout.stageType === 'retention') {
                const retentionSubmitContext = await this.loadValidatedRetentionPayoutSubmitContext(em, payout, input);
                const retentionDraft = this.buildRetentionSettlementDraftFromContext(
                    retentionSubmitContext.binding.bindingAction,
                    retentionSubmitContext.gateReview,
                    retentionSubmitContext.departureDecision,
                    retentionSubmitContext.retentionReceipt,
                    retentionSubmitContext.retentionDue
                );
                const snapshot = await this.writeCurrentFinalSettlementSnapshot(
                    em,
                    payout,
                    initiatorUserId,
                    {
                        finalSettlementStatus: retentionDraft.finalSettlementStatus,
                        nonRetentionSettlementStatus: retentionDraft.nonRetentionSettlementStatus,
                        retentionSettlementStatus: retentionDraft.retentionSettlementStatus,
                        retentionRequirementSummary: retentionDraft.retentionRequirementSummary,
                        retentionReceiptSummary: retentionDraft.retentionReceiptSummary,
                        departureExceptionSummary: retentionDraft.departureExceptionSummary,
                        retentionReceiptRecordId: retentionSubmitContext.retentionReceipt.id,
                        departureExceptionDecisionId: retentionSubmitContext.departureDecision.id
                    },
                    retentionSubmitContext
                );
                await this.writeCurrentRuleExplanationSnapshot(
                    em,
                    payout.projectId,
                    snapshot.id,
                    retentionDraft.ruleExplanation,
                    initiatorUserId
                );
                snapshotId = snapshot.id;
            } else {
                await this.loadValidatedFinalPayoutApprovalContext(em, payout);
            }

            payout.status = 'pending-approval';

            const approvalRecordId = randomUUID();
            const todoItemId = randomUUID();

            const approvalRecord = em.create(ApprovalRecord, {
                id: approvalRecordId,
                approvalType: COMMISSION_PAYOUT_APPROVAL_TYPE,
                businessDomain: COMMISSION_BUSINESS_DOMAIN,
                targetObjectType: COMMISSION_PAYOUT_TARGET_TYPE,
                targetObjectId: payout.id,
                projectId: payout.projectId,
                currentStatus: 'pending',
                currentNodeKey: COMMISSION_PAYOUT_NODE_KEY,
                initiatorUserId,
                currentApproverUserId: COMMISSION_APPROVER_USER_ID,
                decision: null,
                decisionComment: null,
                submittedAt: new Date(),
                decidedAt: null,
                closedAt: null
            });

            const todoItem = em.create(TodoItem, {
                id: todoItemId,
                sourceType: TODO_SOURCE_TYPE,
                sourceId: approvalRecordId,
                todoType: TODO_TYPE,
                businessDomain: COMMISSION_BUSINESS_DOMAIN,
                targetObjectType: COMMISSION_PAYOUT_TARGET_TYPE,
                targetObjectId: payout.id,
                projectId: payout.projectId,
                title: `提成发放审批：${mapPayoutStageName(payout.stageType)}`,
                summary: null,
                assigneeUserId: COMMISSION_APPROVER_USER_ID,
                status: 'open',
                priority: 'high',
                dueAt: null,
                completedAt: null
            });

            em.persist([payout, approvalRecord, todoItem]);
            await em.flush();

            return {
                targetId: payout.id,
                targetType: COMMISSION_PAYOUT_TARGET_TYPE,
                resultStatus: 'submitted',
                businessStatusAfter: payout.status,
                approvalRecordId: approvalRecord.id,
                confirmationRecordId: null,
                todoItemIds: [todoItem.id],
                snapshotId
            };
        });
    }

    async submitCommissionAdjustmentApproval(adjustmentId: string, initiatorUserId: string, input: SubmitCommissionAdjustmentApprovalRequest): Promise<CommandResult> {
        return this.approvalRecordRepository.getEntityManager().transactional(async (em) => {
            const adjustment = await em.findOne(CommissionAdjustment, { id: adjustmentId });
            if (!adjustment) {
                throw new NotFoundException(`CommissionAdjustment ${adjustmentId} not found`);
            }

            if (adjustment.status !== 'draft') {
                throw new BadRequestException(`CommissionAdjustment ${adjustmentId} cannot submit approval in status ${adjustment.status}`);
            }

            this.assertExpectedVersion(adjustment.rowVersion, input.expectedVersion, 'CommissionAdjustment');

            const existingApproval = await em.findOne(ApprovalRecord, {
                approvalType: COMMISSION_ADJUSTMENT_APPROVAL_TYPE,
                targetObjectType: COMMISSION_ADJUSTMENT_TARGET_TYPE,
                targetObjectId: adjustment.id,
                currentStatus: 'pending'
            });
            if (existingApproval) {
                throw new ConflictException(`CommissionAdjustment ${adjustmentId} already has a pending approval`);
            }

            adjustment.status = 'pending-approval';

            const approvalRecordId = randomUUID();
            const todoItemId = randomUUID();

            const approvalRecord = em.create(ApprovalRecord, {
                id: approvalRecordId,
                approvalType: COMMISSION_ADJUSTMENT_APPROVAL_TYPE,
                businessDomain: COMMISSION_BUSINESS_DOMAIN,
                targetObjectType: COMMISSION_ADJUSTMENT_TARGET_TYPE,
                targetObjectId: adjustment.id,
                projectId: adjustment.projectId,
                currentStatus: 'pending',
                currentNodeKey: COMMISSION_ADJUSTMENT_NODE_KEY,
                initiatorUserId,
                currentApproverUserId: COMMISSION_APPROVER_USER_ID,
                decision: null,
                decisionComment: null,
                submittedAt: new Date(),
                decidedAt: null,
                closedAt: null
            });

            const todoItem = em.create(TodoItem, {
                id: todoItemId,
                sourceType: TODO_SOURCE_TYPE,
                sourceId: approvalRecordId,
                todoType: TODO_TYPE,
                businessDomain: COMMISSION_BUSINESS_DOMAIN,
                targetObjectType: COMMISSION_ADJUSTMENT_TARGET_TYPE,
                targetObjectId: adjustment.id,
                projectId: adjustment.projectId,
                title: `提成调整审批：${mapAdjustmentTypeName(adjustment.adjustmentType)}`,
                summary: adjustment.reason,
                assigneeUserId: COMMISSION_APPROVER_USER_ID,
                status: 'open',
                priority: 'high',
                dueAt: null,
                completedAt: null
            });

            em.persist([adjustment, approvalRecord, todoItem]);
            await em.flush();

            return {
                targetId: adjustment.id,
                targetType: COMMISSION_ADJUSTMENT_TARGET_TYPE,
                resultStatus: 'submitted',
                businessStatusAfter: adjustment.status,
                approvalRecordId: approvalRecord.id,
                confirmationRecordId: null,
                todoItemIds: [todoItem.id],
                snapshotId: null
            };
        });
    }

    async findApprovalRecordById(id: string): Promise<ApprovalRecordSummary | null> {
        const record = await this.approvalRecordRepository.findOne({ id });
        if (!record) {
            return null;
        }
        return this.mapApprovalRecordSummary(record);
    }

    async findLatestApprovalForTarget(targetObjectType: string, targetObjectId: string): Promise<ApprovalRecordSummary | null> {
        const record = await this.approvalRecordRepository.findOne(
            {
                targetObjectType,
                targetObjectId
            },
            {
                orderBy: {
                    submittedAt: QueryOrder.DESC,
                    createdAt: QueryOrder.DESC
                }
            }
        );

        if (!record) {
            return null;
        }
        return this.mapApprovalRecordSummary(record);
    }

    async findOpenTodosForUser(userId: string): Promise<TodoItemSummary[]> {
        const todos = await this.todoItemRepository.find({ assigneeUserId: userId, status: { $in: ['open', 'processing'] } }, { orderBy: { createdAt: QueryOrder.ASC } });

        if (todos.length === 0) {
            return [];
        }

        const approvalSourceIds = [...new Set(todos.filter((todo) => todo.sourceType === TODO_SOURCE_TYPE).map((todo) => todo.sourceId))];
        const contractTargetIds = [...new Set(todos.filter((todo) => todo.targetObjectType === CONTRACT_TARGET_TYPE).map((todo) => todo.targetObjectId))];
        const payoutTargetIds = [...new Set(todos.filter((todo) => todo.targetObjectType === COMMISSION_PAYOUT_TARGET_TYPE).map((todo) => todo.targetObjectId))];
        const adjustmentTargetIds = [...new Set(todos.filter((todo) => todo.targetObjectType === COMMISSION_ADJUSTMENT_TARGET_TYPE).map((todo) => todo.targetObjectId))];
        const projectTargetIds = [...new Set(todos.filter((todo) => todo.targetObjectType === PROJECT_TARGET_TYPE).map((todo) => todo.targetObjectId))];
        const leadTargetIds = [...new Set(todos.filter((todo) => todo.targetObjectType === LEAD_TARGET_TYPE).map((todo) => todo.targetObjectId))];
        const customerTargetIds = [...new Set(todos.filter((todo) => todo.targetObjectType === CUSTOMER_TARGET_TYPE).map((todo) => todo.targetObjectId))];

        const [approvalRecords, contracts, payouts, adjustments, projects, leads, customers] = await Promise.all([
            approvalSourceIds.length > 0 ? this.approvalRecordRepository.find({ id: { $in: approvalSourceIds } }) : Promise.resolve([]),
            contractTargetIds.length > 0 ? this.contractRepository.find({ id: { $in: contractTargetIds } }) : Promise.resolve([]),
            payoutTargetIds.length > 0 ? this.commissionPayoutRepository.find({ id: { $in: payoutTargetIds } }) : Promise.resolve([]),
            adjustmentTargetIds.length > 0 ? this.commissionAdjustmentRepository.find({ id: { $in: adjustmentTargetIds } }) : Promise.resolve([]),
            projectTargetIds.length > 0 ? this.projectRepository.find({ id: { $in: projectTargetIds } }) : Promise.resolve([]),
            leadTargetIds.length > 0 ? this.leadRepository.find({ id: { $in: leadTargetIds } }) : Promise.resolve([]),
            customerTargetIds.length > 0 ? this.customerRepository.find({ id: { $in: customerTargetIds } }) : Promise.resolve([])
        ]);

        const approvalById = new Map(approvalRecords.map((record) => [record.id, record]));
        const contractById = new Map(contracts.map((contract) => [contract.id, contract]));
        const payoutById = new Map(payouts.map((payout) => [payout.id, payout]));
        const adjustmentById = new Map(adjustments.map((adjustment) => [adjustment.id, adjustment]));
        const projectById = new Map(projects.map((project) => [project.id, project]));
        const leadById = new Map(leads.map((lead) => [lead.id, lead]));
        const customerById = new Map(customers.map((customer) => [customer.id, customer]));

        return todos.map((todo) =>
            mapTodoItemToSummary(
                todo,
                approvalById.get(todo.sourceId),
                contractById.get(todo.targetObjectId),
                payoutById.get(todo.targetObjectId),
                adjustmentById.get(todo.targetObjectId),
                projectById.get(todo.targetObjectId),
                leadById.get(todo.targetObjectId),
                customerById.get(todo.targetObjectId)
            )
        );
    }

    private async resolveApprovalDecision(approvalRecordId: string, actorUserId: string, decision: 'approved' | 'rejected', comment: string | null, expectedVersion?: number): Promise<CommandResult> {
        return this.approvalRecordRepository.getEntityManager().transactional(async (em) => {
            const approvalRecord = await em.findOne(ApprovalRecord, { id: approvalRecordId });
            if (!approvalRecord) {
                throw new NotFoundException(`ApprovalRecord ${approvalRecordId} not found`);
            }

            this.assertExpectedVersion(approvalRecord.rowVersion, expectedVersion, 'ApprovalRecord');

            if (approvalRecord.currentStatus !== 'pending') {
                throw new BadRequestException(`ApprovalRecord ${approvalRecordId} cannot be processed in status ${approvalRecord.currentStatus}`);
            }

            if (approvalRecord.currentApproverUserId !== actorUserId) {
                throw new ForbiddenException(`ApprovalRecord ${approvalRecordId} is not assigned to current user`);
            }

            const todoItem = await em.findOne(TodoItem, {
                sourceType: TODO_SOURCE_TYPE,
                sourceId: approvalRecord.id,
                assigneeUserId: actorUserId,
                status: { $in: ['open', 'processing'] }
            });

            approvalRecord.currentStatus = decision;
            approvalRecord.decision = decision;
            approvalRecord.decisionComment = comment;
            approvalRecord.decidedAt = new Date();
            approvalRecord.closedAt = new Date();
            approvalRecord.currentApproverUserId = null;

            const todoItemIds: string[] = [];
            if (todoItem) {
                todoItem.status = decision === 'approved' ? 'completed' : 'canceled';
                todoItem.completedAt = new Date();
                todoItemIds.push(todoItem.id);
            }

            if (approvalRecord.targetObjectType === CONTRACT_TARGET_TYPE && approvalRecord.approvalType === CONTRACT_REVIEW_APPROVAL_TYPE) {
                const contract = await em.findOne(Contract, { id: approvalRecord.targetObjectId });
                if (!contract) {
                    throw new NotFoundException(`Contract ${approvalRecord.targetObjectId} not found`);
                }

                contract.status = decision === 'approved' ? 'pending-review' : 'draft';

                em.persist([approvalRecord, contract, ...(todoItem ? [todoItem] : [])]);
                await em.flush();

                return {
                    targetId: contract.id,
                    targetType: CONTRACT_TARGET_TYPE,
                    resultStatus: decision,
                    businessStatusAfter: contract.status,
                    approvalRecordId: approvalRecord.id,
                    confirmationRecordId: null,
                    todoItemIds,
                    snapshotId: null
                };
            }

            if (approvalRecord.targetObjectType === COMMISSION_PAYOUT_TARGET_TYPE && approvalRecord.approvalType === COMMISSION_PAYOUT_APPROVAL_TYPE) {
                const payout = await em.findOne(CommissionPayout, { id: approvalRecord.targetObjectId });
                if (!payout) {
                    throw new NotFoundException(`CommissionPayout ${approvalRecord.targetObjectId} not found`);
                }

                let snapshotId: string | null = null;
                if (decision === 'approved') {
                    payout.status = 'approved';
                    payout.approvedAmount = payout.approvedAmount ?? payout.theoreticalCapAmount;
                    payout.approvedAt = new Date();
                    payout.approvedBy = actorUserId;

                    if (payout.stageType === 'retention') {
                        const retentionReadyContext = await this.loadValidatedRetentionPayoutReadyContext(em, payout);
                        const retentionDraft = this.buildRetentionSettlementDraftFromContext(
                            retentionReadyContext.binding.bindingAction,
                            retentionReadyContext.gateReview,
                            retentionReadyContext.departureDecision,
                            retentionReadyContext.retentionReceipt,
                            retentionReadyContext.retentionDue
                        );
                        const snapshot = await this.writeCurrentFinalSettlementSnapshot(
                            em,
                            payout,
                            actorUserId,
                            {
                                finalSettlementStatus: retentionDraft.finalSettlementStatus,
                                nonRetentionSettlementStatus: retentionDraft.nonRetentionSettlementStatus,
                                retentionSettlementStatus: retentionDraft.retentionSettlementStatus,
                                retentionRequirementSummary: retentionDraft.retentionRequirementSummary,
                                retentionReceiptSummary: retentionDraft.retentionReceiptSummary,
                                departureExceptionSummary: retentionDraft.departureExceptionSummary,
                                retentionReceiptRecordId: retentionReadyContext.retentionReceipt.id,
                                departureExceptionDecisionId: retentionReadyContext.departureDecision.id
                            },
                            retentionReadyContext
                        );
                        await this.writeCurrentRuleExplanationSnapshot(
                            em,
                            payout.projectId,
                            snapshot.id,
                            retentionDraft.ruleExplanation,
                            actorUserId
                        );
                        snapshotId = snapshot.id;
                    } else if (payout.stageType === 'final') {
                        const finalSettlementContext = await this.loadValidatedFinalPayoutApprovalContext(em, payout);
                        const snapshot = await this.writeCurrentFinalSettlementSnapshot(
                            em,
                            payout,
                            actorUserId,
                            {
                                finalSettlementStatus: FINAL_SETTLEMENT_STATUS_PENDING,
                                nonRetentionSettlementStatus: NON_RETENTION_SETTLEMENT_STATUS_PENDING,
                                retentionSettlementStatus: RETENTION_SETTLEMENT_STATUS_WAITING,
                                retentionRequirementSummary: DEFAULT_RETENTION_REQUIREMENT_SUMMARY,
                                retentionReceiptSummary: null,
                                departureExceptionSummary: null,
                                retentionReceiptRecordId: null,
                                departureExceptionDecisionId: null
                            },
                            finalSettlementContext
                        );
                        await this.writeCurrentRuleExplanationSnapshot(
                            em,
                            payout.projectId,
                            snapshot.id,
                            buildPendingFinalRuleExplanation(),
                            actorUserId
                        );
                        snapshotId = snapshot.id;
                    }
                } else {
                    payout.status = 'draft';
                    payout.approvedAmount = null;
                    payout.approvedAt = null;
                    payout.approvedBy = null;
                }

                em.persist([approvalRecord, payout, ...(todoItem ? [todoItem] : [])]);
                await em.flush();

                return {
                    targetId: payout.id,
                    targetType: COMMISSION_PAYOUT_TARGET_TYPE,
                    resultStatus: decision,
                    businessStatusAfter: payout.status,
                    approvalRecordId: approvalRecord.id,
                    confirmationRecordId: null,
                    todoItemIds,
                    snapshotId
                };
            }

            if (approvalRecord.targetObjectType === COMMISSION_ADJUSTMENT_TARGET_TYPE && approvalRecord.approvalType === COMMISSION_ADJUSTMENT_APPROVAL_TYPE) {
                const adjustment = await em.findOne(CommissionAdjustment, { id: approvalRecord.targetObjectId });
                if (!adjustment) {
                    throw new NotFoundException(`CommissionAdjustment ${approvalRecord.targetObjectId} not found`);
                }

                adjustment.status = decision === 'approved' ? 'approved' : 'rejected';

                em.persist([approvalRecord, adjustment, ...(todoItem ? [todoItem] : [])]);
                await em.flush();

                return {
                    targetId: adjustment.id,
                    targetType: COMMISSION_ADJUSTMENT_TARGET_TYPE,
                    resultStatus: decision,
                    businessStatusAfter: adjustment.status,
                    approvalRecordId: approvalRecord.id,
                    confirmationRecordId: null,
                    todoItemIds,
                    snapshotId: null
                };
            }

            throw new BadRequestException(`ApprovalRecord ${approvalRecordId} is not supported by the current approval slice`);
        });
    }

    private async mapApprovalRecordSummary(record: ApprovalRecord): Promise<ApprovalRecordSummary> {
        const relatedContract = record.targetObjectType === CONTRACT_TARGET_TYPE ? await this.contractRepository.findOne({ id: record.targetObjectId }) : null;
        const relatedPayout =
            record.targetObjectType === COMMISSION_PAYOUT_TARGET_TYPE ? await this.commissionPayoutRepository.findOne({ id: record.targetObjectId }) : null;
        const relatedAdjustment =
            record.targetObjectType === COMMISSION_ADJUSTMENT_TARGET_TYPE ? await this.commissionAdjustmentRepository.findOne({ id: record.targetObjectId }) : null;

        return mapApprovalRecordToSummary(record, relatedContract, relatedPayout, relatedAdjustment);
    }

    private assertExpectedVersion(actualVersion: number, expectedVersion: number | undefined, resourceType: string): void {
        if (expectedVersion !== undefined && actualVersion !== expectedVersion) {
            throw new ConflictException(`${resourceType} version ${expectedVersion} does not match current version ${actualVersion}`);
        }
    }

    private assertRequestStageMatchesPayout(actualStage: string, requestedStage: string | null | undefined): void {
        if (!requestedStage) {
            throw new BadRequestException('CommissionPayout stage must be provided');
        }

        if (requestedStage !== actualStage) {
            throw new BadRequestException(`CommissionPayout stage ${requestedStage} does not match current stage ${actualStage}`);
        }
    }

    private async loadValidatedFinalPayoutApprovalContext(
        em: EntityManager,
        payout: CommissionPayout
    ): Promise<{
        freezeVersion: CommissionRoleAssignment;
        binding: OperatingSignalToCommissionGateBinding;
        gateReview: CommissionGateReviewRecord;
    } | null> {
        if (payout.stageType !== 'final') {
            return null;
        }

        const context = await this.loadCurrentFinalSettlementContext(em, payout.projectId);
        const { binding, gateReview } = context;
        if (this.isBlockingGateDecision(binding.bindingAction, gateReview.gateReviewDecision)) {
            throw new BadRequestException(`CommissionPayout ${payout.id} is blocked by the current final commission gate review`);
        }

        return context;
    }

    private async loadCurrentFinalSettlementContext(
        em: EntityManager,
        projectId: string
    ): Promise<{
        freezeVersion: CommissionRoleAssignment;
        binding: OperatingSignalToCommissionGateBinding;
        gateReview: CommissionGateReviewRecord;
    }> {
        const freezeVersion = await em.findOne(CommissionRoleAssignment, {
            projectId,
            isCurrent: true,
            status: 'frozen'
        });
        if (!freezeVersion) {
            throw new BadRequestException(`Current frozen CommissionRoleAssignment is required before processing final payout approval for project ${projectId}`);
        }

        const binding = await em.findOne(OperatingSignalToCommissionGateBinding, {
            projectId,
            gateStageType: 'final',
            status: 'active'
        });
        if (!binding) {
            throw new BadRequestException(`Active final commission gate binding is required before processing final payout approval for project ${projectId}`);
        }

        const gateReview = await em.findOne(
            CommissionGateReviewRecord,
            {
                bindingId: binding.id,
                status: 'active'
            },
            {
                orderBy: {
                    handledAt: QueryOrder.DESC,
                    createdAt: QueryOrder.DESC
                }
            }
        );
        if (!gateReview) {
            throw new BadRequestException(`Active final commission gate review is required before processing final payout approval for project ${projectId}`);
        }

        return { freezeVersion, binding, gateReview };
    }

    private async loadValidatedRetentionPayoutSubmitContext(
        em: EntityManager,
        payout: CommissionPayout,
        input: SubmitCommissionPayoutApprovalRequest
    ): Promise<{
        currentSnapshot: CommissionFinalSettlementSnapshot;
        freezeVersion: CommissionRoleAssignment;
        binding: OperatingSignalToCommissionGateBinding;
        gateReview: CommissionGateReviewRecord;
        retentionDue: RetentionDueEvaluation;
        retentionReceipt: ReceiptRecord;
        departureDecision: CommissionDepartureExceptionDecision;
    }> {
        const currentSnapshot = await em.findOne(CommissionFinalSettlementSnapshot, {
            projectId: payout.projectId,
            isCurrent: true
        });
        if (!currentSnapshot || currentSnapshot.status !== 'active') {
            throw new BadRequestException(
                `Current CommissionFinalSettlementSnapshot is required before processing retention payout approval for project ${payout.projectId}`
            );
        }
        if (currentSnapshot.finalSettlementStatus !== FINAL_SETTLEMENT_STATUS_PENDING_RETENTION) {
            throw new BadRequestException(`CommissionPayout ${payout.id} can only enter retention approval after non-retention settlement is completed`);
        }
        if (currentSnapshot.nonRetentionSettlementStatus !== NON_RETENTION_SETTLEMENT_STATUS_SETTLED) {
            throw new BadRequestException(`CommissionPayout ${payout.id} requires settled non-retention payouts before entering retention approval`);
        }
        if (currentSnapshot.retentionSettlementStatus === RETENTION_SETTLEMENT_STATUS_SETTLED) {
            throw new BadRequestException(`CommissionPayout ${payout.id} retention settlement has already been completed`);
        }

        const context = await this.loadCurrentFinalSettlementContext(em, payout.projectId);
        const { freezeVersion, binding, gateReview } = context;
        if (currentSnapshot.freezeVersionId !== freezeVersion.id) {
            throw new BadRequestException(`Current CommissionFinalSettlementSnapshot for project ${payout.projectId} is out of sync with current frozen assignment`);
        }
        if (this.isReviewOrBlockingGateDecision(binding.bindingAction, gateReview.gateReviewDecision)) {
            throw new BadRequestException(`CommissionPayout ${payout.id} is blocked by the current final commission gate review`);
        }
        const retentionDue = await this.loadRetentionDueEvaluation(em, freezeVersion);
        this.assertRetentionDueReady(retentionDue, payout.id, 'submit retention payout approval');

        if (!input.summarySnapshotId) {
            throw new BadRequestException('summarySnapshotId is required for retention payout approval submit');
        }
        if (input.summarySnapshotId !== currentSnapshot.summarySnapshotId || input.summarySnapshotId !== gateReview.summarySnapshotId) {
            throw new BadRequestException('summarySnapshotId must match the current final-settlement / gate review evidence chain');
        }

        if (!input.gateReviewRecordId) {
            throw new BadRequestException('gateReviewRecordId is required for retention payout approval submit');
        }
        if (input.gateReviewRecordId !== gateReview.id || input.gateReviewRecordId !== currentSnapshot.gateReviewRecordId) {
            throw new BadRequestException('gateReviewRecordId must match the current active final gate review');
        }

        if (!input.retentionReceiptRecordId) {
            throw new BadRequestException('retentionReceiptRecordId is required for retention payout approval submit');
        }
        if (input.freezeVersionId && input.freezeVersionId !== freezeVersion.id) {
            throw new BadRequestException('freezeVersionId must match the current active frozen assignment');
        }
        if (input.baselineSelectionSource && input.baselineSelectionSource !== binding.baselineSelectionSource) {
            throw new BadRequestException('baselineSelectionSource must match the current final-settlement baseline selection source');
        }
        const retentionReceipt = await em.findOne(ReceiptRecord, { id: input.retentionReceiptRecordId });
        if (!retentionReceipt || retentionReceipt.projectId !== payout.projectId || retentionReceipt.status !== 'confirmed') {
            throw new BadRequestException(`Retention receipt ${input.retentionReceiptRecordId} must be a confirmed receipt for project ${payout.projectId}`);
        }

        if (!input.departureExceptionDecisionId) {
            throw new BadRequestException('departureExceptionDecisionId is required for retention payout approval submit');
        }
        const departureDecision = await em.findOne(CommissionDepartureExceptionDecision, { id: input.departureExceptionDecisionId });
        if (
            !departureDecision ||
            departureDecision.projectId !== payout.projectId ||
            departureDecision.freezeVersionId !== freezeVersion.id ||
            !departureDecision.isCurrent ||
            departureDecision.status !== 'active'
        ) {
            throw new BadRequestException(
                `Current departure / exception decision ${input.departureExceptionDecisionId} is required before processing retention payout approval`
            );
        }
        if (departureDecision.confirmationRequirementSummary?.trim()) {
            throw new BadRequestException('The current departure / exception decision still requires successor confirmation before retention payout approval');
        }

        const openDispute = await em.findOne(CommissionFreezeDisputeRecord, { freezeVersionId: freezeVersion.id, status: 'submitted' });
        if (openDispute) {
            throw new BadRequestException(`CommissionPayout ${payout.id} is blocked by an open freeze dispute`);
        }

        return {
            currentSnapshot,
            freezeVersion,
            binding,
            gateReview,
            retentionDue,
            retentionReceipt,
            departureDecision
        };
    }

    private async loadValidatedRetentionPayoutReadyContext(
        em: EntityManager,
        payout: CommissionPayout
    ): Promise<{
        currentSnapshot: CommissionFinalSettlementSnapshot;
        freezeVersion: CommissionRoleAssignment;
        binding: OperatingSignalToCommissionGateBinding;
        gateReview: CommissionGateReviewRecord;
        retentionDue: RetentionDueEvaluation;
        retentionReceipt: ReceiptRecord;
        departureDecision: CommissionDepartureExceptionDecision;
    }> {
        const currentSnapshot = await em.findOne(CommissionFinalSettlementSnapshot, {
            projectId: payout.projectId,
            isCurrent: true
        });
        if (!currentSnapshot || currentSnapshot.status !== 'active') {
            throw new BadRequestException(
                `Current CommissionFinalSettlementSnapshot is required before approving retention payout for project ${payout.projectId}`
            );
        }
        if (
            currentSnapshot.finalSettlementStatus !== FINAL_SETTLEMENT_STATUS_PENDING_RETENTION ||
            currentSnapshot.retentionSettlementStatus !== RETENTION_SETTLEMENT_STATUS_READY
        ) {
            throw new BadRequestException(`CommissionPayout ${payout.id} is not in a retention-ready settlement state`);
        }
        if (!currentSnapshot.retentionReceiptRecordId || !currentSnapshot.departureExceptionDecisionId) {
            throw new BadRequestException(`Current CommissionFinalSettlementSnapshot for project ${payout.projectId} is missing retention receipt or departure decision references`);
        }

        const context = await this.loadCurrentFinalSettlementContext(em, payout.projectId);
        const { freezeVersion, binding, gateReview } = context;
        if (this.isReviewOrBlockingGateDecision(binding.bindingAction, gateReview.gateReviewDecision)) {
            throw new BadRequestException(`CommissionPayout ${payout.id} is blocked by the current final commission gate review`);
        }
        const retentionDue = await this.loadRetentionDueEvaluation(em, freezeVersion);
        this.assertRetentionDueReady(retentionDue, payout.id, 'approve retention payout');

        const retentionReceipt = await em.findOne(ReceiptRecord, { id: currentSnapshot.retentionReceiptRecordId });
        if (!retentionReceipt || retentionReceipt.projectId !== payout.projectId || retentionReceipt.status !== 'confirmed') {
            throw new BadRequestException(`Current retention receipt ${currentSnapshot.retentionReceiptRecordId} is invalid for project ${payout.projectId}`);
        }

        const departureDecision = await em.findOne(CommissionDepartureExceptionDecision, { id: currentSnapshot.departureExceptionDecisionId });
        if (
            !departureDecision ||
            departureDecision.projectId !== payout.projectId ||
            departureDecision.freezeVersionId !== freezeVersion.id ||
            !departureDecision.isCurrent ||
            departureDecision.status !== 'active'
        ) {
            throw new BadRequestException(
                `Current departure / exception decision ${currentSnapshot.departureExceptionDecisionId} is invalid for project ${payout.projectId}`
            );
        }
        if (departureDecision.confirmationRequirementSummary?.trim()) {
            throw new BadRequestException('The current departure / exception decision still requires successor confirmation before retention payout approval');
        }

        const openDispute = await em.findOne(CommissionFreezeDisputeRecord, { freezeVersionId: freezeVersion.id, status: 'submitted' });
        if (openDispute) {
            throw new BadRequestException(`CommissionPayout ${payout.id} is blocked by an open freeze dispute`);
        }

        return {
            currentSnapshot,
            freezeVersion,
            binding,
            gateReview,
            retentionDue,
            retentionReceipt,
            departureDecision
        };
    }

    private buildRetentionSettlementDraftFromContext(
        bindingAction: string | null | undefined,
        gateReview: Pick<CommissionGateReviewRecord, 'gateReviewDecision' | 'blockingReasonCode' | 'nextActionSummary'>,
        departureDecision: Pick<CommissionDepartureExceptionDecision, 'decisionSummary' | 'confirmationRequirementSummary'>,
        retentionReceipt: Pick<ReceiptRecord, 'receiptAmount' | 'receiptDate'>,
        retentionDue: RetentionDueEvaluation
    ): RetentionSettlementDraft {
        return buildRetentionSettlementDraft({
            openFreezeDispute: false,
            retentionDue,
            departureDecision: {
                decisionSummary: departureDecision.decisionSummary,
                confirmationRequirementSummary: departureDecision.confirmationRequirementSummary ?? null
            },
            retentionReceipt: {
                receiptAmount: retentionReceipt.receiptAmount,
                receiptDate: retentionReceipt.receiptDate
            },
            gateBindingAction: bindingAction ?? null,
            gateReviewDecision: gateReview.gateReviewDecision,
            gateReviewBlockingReasonCode: gateReview.blockingReasonCode ?? null,
            gateNextActionSummary: gateReview.nextActionSummary ?? null
        });
    }

    private async loadRetentionDueEvaluation(
        em: EntityManager,
        freezeVersion: Pick<CommissionRoleAssignment, 'effectiveHandoverBaselineSnapshotId'>
    ): Promise<RetentionDueEvaluation> {
        if (!freezeVersion.effectiveHandoverBaselineSnapshotId) {
            return evaluateRetentionDueDate(null);
        }

        const baselineSnapshot = await em.findOne(ContractTermSnapshot, {
            id: freezeVersion.effectiveHandoverBaselineSnapshotId
        });

        return evaluateRetentionDueDate(baselineSnapshot?.retentionDueDate ?? null);
    }

    private assertRetentionDueReady(retentionDue: RetentionDueEvaluation, payoutId: string, actionName: string): void {
        if (retentionDue.retentionDueStatus === 'missing') {
            throw new BadRequestException(`CommissionPayout ${payoutId} cannot ${actionName} without a current retention due date fact`);
        }
        if (retentionDue.retentionDueStatus === 'pending') {
            throw new BadRequestException(`CommissionPayout ${payoutId} cannot ${actionName} before retention due date ${retentionDue.retentionDueDate}`);
        }
    }

    private async writeCurrentFinalSettlementSnapshot(
        em: EntityManager,
        payout: CommissionPayout,
        actorUserId: string,
        statusPatch: {
            finalSettlementStatus: string;
            nonRetentionSettlementStatus: string;
            retentionSettlementStatus: string;
            retentionRequirementSummary: string | null;
            retentionReceiptSummary: string | null;
            departureExceptionSummary: string | null;
            retentionReceiptRecordId: string | null;
            departureExceptionDecisionId: string | null;
        },
        finalSettlementContext?: {
            freezeVersion: CommissionRoleAssignment;
            binding: OperatingSignalToCommissionGateBinding;
            gateReview: CommissionGateReviewRecord;
        } | null
    ): Promise<CommissionFinalSettlementSnapshot> {
        const { freezeVersion, binding, gateReview } =
            finalSettlementContext ?? (await this.loadCurrentFinalSettlementContext(em, payout.projectId));
        const currentSnapshot = await em.findOne(CommissionFinalSettlementSnapshot, {
            projectId: payout.projectId,
            isCurrent: true
        });

        if (currentSnapshot) {
            currentSnapshot.isCurrent = false;
            currentSnapshot.status = 'superseded';
            currentSnapshot.updatedBy = actorUserId;
            em.persist(currentSnapshot);
            await em.flush();
        }

        const snapshot = em.create(CommissionFinalSettlementSnapshot, {
            id: randomUUID(),
            projectId: payout.projectId,
            freezeVersionId: freezeVersion.id,
            gateReviewRecordId: gateReview.id,
            retentionReceiptRecordId: statusPatch.retentionReceiptRecordId,
            departureExceptionDecisionId: statusPatch.departureExceptionDecisionId,
            version: currentSnapshot ? currentSnapshot.version + 1 : 1,
            isCurrent: true,
            finalSettlementStatus: statusPatch.finalSettlementStatus,
            nonRetentionSettlementStatus: statusPatch.nonRetentionSettlementStatus,
            retentionSettlementStatus: statusPatch.retentionSettlementStatus,
            retentionRequirementSummary: statusPatch.retentionRequirementSummary,
            retentionReceiptSummary: statusPatch.retentionReceiptSummary,
            departureExceptionSummary: statusPatch.departureExceptionSummary,
            baselineSelectionSource: binding.baselineSelectionSource,
            taxImpactSummary: binding.taxImpactSummary,
            taxImpactPendingAmount: binding.taxImpactPendingAmount,
            dataMaturityLevel: binding.dataMaturityLevel,
            costActionRecommendation: binding.costActionRecommendation,
            currentActionLevel: binding.currentActionLevel,
            referencedBaselineVersion: binding.referencedBaselineVersion,
            referencedSnapshotVersion: binding.referencedSnapshotVersion,
            summaryPackageKey: gateReview.summaryPackageKey,
            summarySnapshotId: gateReview.summarySnapshotId,
            projectionLevel: gateReview.projectionLevel,
            exportPolicy: gateReview.exportPolicy,
            generatedAt: new Date(),
            status: 'active',
            supersedesId: currentSnapshot?.id ?? null,
            createdBy: actorUserId,
            updatedBy: actorUserId
        });

        em.persist(snapshot);
        return snapshot;
    }

    private async writeCurrentRuleExplanationSnapshot(
        em: EntityManager,
        projectId: string,
        finalSettlementSnapshotId: string,
        explanation: RuleExplanationDraft,
        actorUserId: string
    ): Promise<void> {
        const currentRuleExplanation = await em.findOne(CommissionRuleExplanationSnapshot, {
            projectId,
            isCurrent: true
        });

        if (currentRuleExplanation) {
            currentRuleExplanation.isCurrent = false;
            currentRuleExplanation.status = 'superseded';
            currentRuleExplanation.updatedBy = actorUserId;
            em.persist(currentRuleExplanation);
            await em.flush();
        }

        const nextRuleExplanation = em.create(CommissionRuleExplanationSnapshot, {
            id: randomUUID(),
            projectId,
            finalSettlementSnapshotId,
            version: currentRuleExplanation ? currentRuleExplanation.version + 1 : 1,
            isCurrent: true,
            currentStageStatus: explanation.currentStageStatus,
            gateDecisionCode: explanation.gateDecisionCode,
            blockingReasonCategory: explanation.blockingReasonCategory,
            blockingReasonCode: explanation.blockingReasonCode,
            blockingReasonSummary: explanation.blockingReasonSummary,
            gateDecisionSummary: explanation.gateDecisionSummary,
            nextActionSummary: explanation.nextActionSummary,
            generatedAt: new Date(),
            status: 'active',
            supersedesId: currentRuleExplanation?.id ?? null,
            createdBy: actorUserId,
            updatedBy: actorUserId
        });

        em.persist(nextRuleExplanation);
    }

    private isBlockingGateDecision(bindingAction: string | null | undefined, gateReviewDecision: string | null | undefined): boolean {
        return [bindingAction, gateReviewDecision]
            .map((value) => value?.trim().toUpperCase())
            .some((value) => value === 'BLOCK' || value?.startsWith('BLOCK_'));
    }

    private isReviewOrBlockingGateDecision(bindingAction: string | null | undefined, gateReviewDecision: string | null | undefined): boolean {
        return [bindingAction, gateReviewDecision]
            .map((value) => value?.trim().toUpperCase())
            .some((value) => value === 'REVIEW' || value === 'BLOCK' || value?.startsWith('REVIEW_') || value?.startsWith('BLOCK_'));
    }
}

function mapApprovalRecordToSummary(
    record: ApprovalRecord,
    relatedContract: Contract | null,
    relatedPayout: CommissionPayout | null,
    relatedAdjustment: CommissionAdjustment | null
): ApprovalRecordSummary {
    return {
        id: record.id,
        approvalType: record.approvalType,
        businessDomain: record.businessDomain,
        targetObjectType: record.targetObjectType,
        targetObjectId: record.targetObjectId,
        projectId: record.projectId ?? null,
        currentStatus: record.currentStatus,
        currentNodeKey: record.currentNodeKey,
        currentNodeName: mapNodeName(record.currentNodeKey),
        initiatorUserId: record.initiatorUserId,
        currentApproverUserId: record.currentApproverUserId ?? null,
        decision: record.decision ?? null,
        decisionComment: record.decisionComment ?? null,
        targetTitle: relatedContract?.contractNo ?? (relatedPayout ? mapPayoutTitle(relatedPayout) : relatedAdjustment ? mapAdjustmentTitle(relatedAdjustment) : null),
        targetStatus: relatedContract?.status ?? relatedPayout?.status ?? relatedAdjustment?.status ?? null,
        submittedAt: record.submittedAt.toISOString(),
        decidedAt: record.decidedAt?.toISOString() ?? null,
        closedAt: record.closedAt?.toISOString() ?? null,
        rowVersion: record.rowVersion,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString()
    };
}

function mapTodoItemToSummary(
    todoItem: TodoItem,
    approvalRecord?: ApprovalRecord,
    relatedContract?: Contract,
    relatedPayout?: CommissionPayout,
    relatedAdjustment?: CommissionAdjustment,
    relatedProject?: Project,
    relatedLead?: Lead,
    relatedCustomer?: Customer
): TodoItemSummary {
    const targetTitle =
        relatedContract?.contractNo ??
        (relatedPayout ? mapPayoutTitle(relatedPayout) : relatedAdjustment ? mapAdjustmentTitle(relatedAdjustment) : relatedProject?.projectName ?? relatedLead?.leadName ?? relatedCustomer?.displayName ?? null);
    const isSalesFollowUpReminder = todoItem.sourceType === SALES_FOLLOW_UP_REMINDER_SOURCE_TYPE && todoItem.todoType === SALES_FOLLOW_UP_REMINDER_TODO_TYPE;

    return {
        id: todoItem.id,
        sourceType: todoItem.sourceType,
        sourceId: todoItem.sourceId,
        todoType: todoItem.todoType,
        businessDomain: todoItem.businessDomain,
        targetObjectType: todoItem.targetObjectType,
        targetObjectId: todoItem.targetObjectId,
        projectId: todoItem.projectId ?? null,
        title: todoItem.title,
        summary: todoItem.summary ?? null,
        targetTitle,
        currentNodeName: approvalRecord ? mapNodeName(approvalRecord.currentNodeKey) : isSalesFollowUpReminder ? mapSalesFollowUpReminderNodeName(todoItem.dueAt) : null,
        allowedActions: todoItem.todoType === TODO_TYPE && ['open', 'processing'].includes(todoItem.status) ? APPROVAL_ACTIONS : [],
        assigneeUserId: todoItem.assigneeUserId,
        status: todoItem.status,
        priority: todoItem.priority,
        dueAt: todoItem.dueAt?.toISOString() ?? null,
        completedAt: todoItem.completedAt?.toISOString() ?? null,
        rowVersion: todoItem.rowVersion,
        createdAt: todoItem.createdAt.toISOString(),
        updatedAt: todoItem.updatedAt.toISOString()
    };
}

function mapSalesFollowUpReminderNodeName(dueAt: Date | null | undefined): string | null {
    if (!dueAt) {
        return '下次跟进';
    }

    return `下次跟进：${formatChinaDateTime(dueAt)}`;
}

function formatChinaDateTime(value: Date): string {
    const chinaTime = new Date(value.getTime() + 8 * 60 * 60 * 1000);
    const pad = (input: number) => input.toString().padStart(2, '0');
    return `${chinaTime.getUTCFullYear()}-${pad(chinaTime.getUTCMonth() + 1)}-${pad(chinaTime.getUTCDate())} ${pad(chinaTime.getUTCHours())}:${pad(chinaTime.getUTCMinutes())}`;
}

function mapNodeName(currentNodeKey: string): string | null {
    if (currentNodeKey === CONTRACT_REVIEW_NODE_KEY) {
        return '合同审核';
    }
    if (currentNodeKey === COMMISSION_PAYOUT_NODE_KEY) {
        return '提成发放审批';
    }
    if (currentNodeKey === COMMISSION_ADJUSTMENT_NODE_KEY) {
        return '提成调整审批';
    }

    return null;
}

function mapPayoutTitle(payout: CommissionPayout): string {
    return `${mapPayoutStageName(payout.stageType)}提成发放`;
}

function mapAdjustmentTitle(adjustment: CommissionAdjustment): string {
    return `${mapAdjustmentTypeName(adjustment.adjustmentType)}调整`;
}

function mapAdjustmentTypeName(adjustmentType: string): string {
    if (adjustmentType === 'suspend-payout') {
        return '暂停发放';
    }
    if (adjustmentType === 'reverse-payout') {
        return '冲销发放';
    }
    if (adjustmentType === 'clawback') {
        return '扣回';
    }
    if (adjustmentType === 'supplement') {
        return '补发';
    }
    if (adjustmentType === 'recalculate') {
        return '重算';
    }
    return adjustmentType;
}

function mapPayoutStageName(stageType: string): string {
    if (stageType === 'first') {
        return '第一阶段';
    }
    if (stageType === 'second') {
        return '第二阶段';
    }
    if (stageType === 'final') {
        return '最终阶段';
    }
    if (stageType === 'retention') {
        return '质保金结算';
    }
    return stageType;
}
