import { EntityRepository, QueryOrder } from '@mikro-orm/core';
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
import { DEV_USERS } from '../../core/platform/dev-platform.fixtures';
import { CommissionAdjustment } from '../commission/commission-adjustment.entity';
import { CommissionPayout } from '../commission/commission-payout.entity';
import { Contract } from '../contract/contract.entity';
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
const DEFAULT_APPROVER_USER_ID = DEV_USERS[0].id;
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
        private readonly commissionAdjustmentRepository: EntityRepository<CommissionAdjustment>
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
                currentApproverUserId: DEFAULT_APPROVER_USER_ID,
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
                assigneeUserId: DEFAULT_APPROVER_USER_ID,
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

            const existingApproval = await em.findOne(ApprovalRecord, {
                approvalType: COMMISSION_PAYOUT_APPROVAL_TYPE,
                targetObjectType: COMMISSION_PAYOUT_TARGET_TYPE,
                targetObjectId: payout.id,
                currentStatus: 'pending'
            });
            if (existingApproval) {
                throw new ConflictException(`CommissionPayout ${payoutId} already has a pending approval`);
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
                currentApproverUserId: DEFAULT_APPROVER_USER_ID,
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
                assigneeUserId: DEFAULT_APPROVER_USER_ID,
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
                snapshotId: null
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
                currentApproverUserId: DEFAULT_APPROVER_USER_ID,
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
                assigneeUserId: DEFAULT_APPROVER_USER_ID,
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

        const [approvalRecords, contracts, payouts, adjustments] = await Promise.all([
            approvalSourceIds.length > 0 ? this.approvalRecordRepository.find({ id: { $in: approvalSourceIds } }) : Promise.resolve([]),
            contractTargetIds.length > 0 ? this.contractRepository.find({ id: { $in: contractTargetIds } }) : Promise.resolve([]),
            payoutTargetIds.length > 0 ? this.commissionPayoutRepository.find({ id: { $in: payoutTargetIds } }) : Promise.resolve([]),
            adjustmentTargetIds.length > 0 ? this.commissionAdjustmentRepository.find({ id: { $in: adjustmentTargetIds } }) : Promise.resolve([])
        ]);

        const approvalById = new Map(approvalRecords.map((record) => [record.id, record]));
        const contractById = new Map(contracts.map((contract) => [contract.id, contract]));
        const payoutById = new Map(payouts.map((payout) => [payout.id, payout]));
        const adjustmentById = new Map(adjustments.map((adjustment) => [adjustment.id, adjustment]));

        return todos.map((todo) =>
            mapTodoItemToSummary(todo, approvalById.get(todo.sourceId), contractById.get(todo.targetObjectId), payoutById.get(todo.targetObjectId), adjustmentById.get(todo.targetObjectId))
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

                if (decision === 'approved') {
                    payout.status = 'approved';
                    payout.approvedAmount = payout.approvedAmount ?? payout.theoreticalCapAmount;
                    payout.approvedAt = new Date();
                } else {
                    payout.status = 'draft';
                    payout.approvedAmount = null;
                    payout.approvedAt = null;
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
                    snapshotId: null
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
    relatedAdjustment?: CommissionAdjustment
): TodoItemSummary {
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
        targetTitle: relatedContract?.contractNo ?? (relatedPayout ? mapPayoutTitle(relatedPayout) : relatedAdjustment ? mapAdjustmentTitle(relatedAdjustment) : null),
        currentNodeName: approvalRecord ? mapNodeName(approvalRecord.currentNodeKey) : null,
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
    return stageType;
}
