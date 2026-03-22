import { EntityRepository, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import type {
    ApprovalRecordSummary,
    ApproveRecordRequest,
    CommandResult,
    RejectApprovalRecordRequest,
    SubmitContractReviewRequest,
    TodoItemSummary
} from '@poms/shared-contracts';
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException
} from '@nestjs/common';
import { DEV_USERS } from '../../core/platform/dev-platform.fixtures';
import { Contract } from '../contract/contract.entity';
import { ApprovalRecord } from './approval-record.entity';
import { TodoItem } from './todo-item.entity';

const CONTRACT_REVIEW_APPROVAL_TYPE = 'contract-review';
const CONTRACT_REVIEW_NODE_KEY = 'contract-review';
const CONTRACT_BUSINESS_DOMAIN = 'contract-finance';
const CONTRACT_TARGET_TYPE = 'Contract';
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
        private readonly contractRepository: EntityRepository<Contract>
    ) {}

    async submitContractReview(
        contractId: string,
        initiatorUserId: string,
        input: SubmitContractReviewRequest
    ): Promise<CommandResult> {
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

            const approvalRecord = em.create(ApprovalRecord, {
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
                sourceType: TODO_SOURCE_TYPE,
                sourceId: approvalRecord.id,
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

    async approveRecord(
        approvalRecordId: string,
        actorUserId: string,
        input: ApproveRecordRequest
    ): Promise<CommandResult> {
        return this.resolveApprovalDecision(approvalRecordId, actorUserId, 'approved', input.comment ?? null, input.expectedVersion);
    }

    async rejectRecord(
        approvalRecordId: string,
        actorUserId: string,
        input: RejectApprovalRecordRequest
    ): Promise<CommandResult> {
        const comment = input.comment ? `${input.reason}\n${input.comment}` : input.reason;
        return this.resolveApprovalDecision(approvalRecordId, actorUserId, 'rejected', comment, input.expectedVersion);
    }

    async findApprovalRecordById(id: string): Promise<ApprovalRecordSummary | null> {
        const record = await this.approvalRecordRepository.findOne({ id });
        if (!record) {
            return null;
        }

        const relatedContract = record.targetObjectType === CONTRACT_TARGET_TYPE
            ? await this.contractRepository.findOne({ id: record.targetObjectId })
            : null;

        return mapApprovalRecordToSummary(record, relatedContract);
    }

    async findOpenTodosForUser(userId: string): Promise<TodoItemSummary[]> {
        const todos = await this.todoItemRepository.find(
            { assigneeUserId: userId, status: { $in: ['open', 'processing'] } },
            { orderBy: { createdAt: QueryOrder.ASC } }
        );

        if (todos.length === 0) {
            return [];
        }

        const approvalSourceIds = [...new Set(
            todos
                .filter((todo) => todo.sourceType === TODO_SOURCE_TYPE)
                .map((todo) => todo.sourceId)
        )];
        const contractTargetIds = [...new Set(
            todos
                .filter((todo) => todo.targetObjectType === CONTRACT_TARGET_TYPE)
                .map((todo) => todo.targetObjectId)
        )];

        const [approvalRecords, contracts] = await Promise.all([
            approvalSourceIds.length > 0
                ? this.approvalRecordRepository.find({ id: { $in: approvalSourceIds } })
                : Promise.resolve([]),
            contractTargetIds.length > 0
                ? this.contractRepository.find({ id: { $in: contractTargetIds } })
                : Promise.resolve([])
        ]);

        const approvalById = new Map(approvalRecords.map((record) => [record.id, record]));
        const contractById = new Map(contracts.map((contract) => [contract.id, contract]));

        return todos.map((todo) => mapTodoItemToSummary(todo, approvalById.get(todo.sourceId), contractById.get(todo.targetObjectId)));
    }

    private async resolveApprovalDecision(
        approvalRecordId: string,
        actorUserId: string,
        decision: 'approved' | 'rejected',
        comment: string | null,
        expectedVersion?: number
    ): Promise<CommandResult> {
        return this.approvalRecordRepository.getEntityManager().transactional(async (em) => {
            const approvalRecord = await em.findOne(ApprovalRecord, { id: approvalRecordId });
            if (!approvalRecord) {
                throw new NotFoundException(`ApprovalRecord ${approvalRecordId} not found`);
            }

            this.assertExpectedVersion(approvalRecord.rowVersion, expectedVersion, 'ApprovalRecord');

            if (approvalRecord.currentStatus !== 'pending') {
                throw new BadRequestException(
                    `ApprovalRecord ${approvalRecordId} cannot be processed in status ${approvalRecord.currentStatus}`
                );
            }

            if (approvalRecord.currentApproverUserId !== actorUserId) {
                throw new ForbiddenException(`ApprovalRecord ${approvalRecordId} is not assigned to current user`);
            }

            if (approvalRecord.targetObjectType !== CONTRACT_TARGET_TYPE || approvalRecord.approvalType !== CONTRACT_REVIEW_APPROVAL_TYPE) {
                throw new BadRequestException(`ApprovalRecord ${approvalRecordId} is not supported by the current approval slice`);
            }

            const contract = await em.findOne(Contract, { id: approvalRecord.targetObjectId });
            if (!contract) {
                throw new NotFoundException(`Contract ${approvalRecord.targetObjectId} not found`);
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

            contract.status = decision === 'approved' ? 'pending-review' : 'draft';

            const todoItemIds: string[] = [];
            if (todoItem) {
                todoItem.status = decision === 'approved' ? 'completed' : 'canceled';
                todoItem.completedAt = new Date();
                todoItemIds.push(todoItem.id);
            }

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
        });
    }

    private assertExpectedVersion(actualVersion: number, expectedVersion: number | undefined, resourceType: string): void {
        if (expectedVersion !== undefined && actualVersion !== expectedVersion) {
            throw new ConflictException(`${resourceType} version ${expectedVersion} does not match current version ${actualVersion}`);
        }
    }
}

function mapApprovalRecordToSummary(record: ApprovalRecord, relatedContract: Contract | null): ApprovalRecordSummary {
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
        targetTitle: relatedContract?.contractNo ?? null,
        targetStatus: relatedContract?.status ?? null,
        submittedAt: record.submittedAt.toISOString(),
        decidedAt: record.decidedAt?.toISOString() ?? null,
        closedAt: record.closedAt?.toISOString() ?? null,
        rowVersion: record.rowVersion,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString()
    };
}

function mapTodoItemToSummary(todoItem: TodoItem, approvalRecord?: ApprovalRecord, relatedContract?: Contract): TodoItemSummary {
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
        targetTitle: relatedContract?.contractNo ?? null,
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

    return null;
}
