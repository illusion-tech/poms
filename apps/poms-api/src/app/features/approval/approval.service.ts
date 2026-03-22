import { EntityManager, EntityRepository, QueryOrder } from '@mikro-orm/core';
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
        return record ? mapApprovalRecordToSummary(record) : null;
    }

    async findOpenTodosForUser(userId: string): Promise<TodoItemSummary[]> {
        const todos = await this.todoItemRepository.find(
            { assigneeUserId: userId, status: { $in: ['open', 'processing'] } },
            { orderBy: { createdAt: QueryOrder.ASC } }
        );

        return todos.map(mapTodoItemToSummary);
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

function mapApprovalRecordToSummary(record: ApprovalRecord): ApprovalRecordSummary {
    return {
        id: record.id,
        approvalType: record.approvalType,
        businessDomain: record.businessDomain,
        targetObjectType: record.targetObjectType,
        targetObjectId: record.targetObjectId,
        projectId: record.projectId ?? null,
        currentStatus: record.currentStatus,
        currentNodeKey: record.currentNodeKey,
        initiatorUserId: record.initiatorUserId,
        currentApproverUserId: record.currentApproverUserId ?? null,
        decision: record.decision ?? null,
        decisionComment: record.decisionComment ?? null,
        submittedAt: record.submittedAt.toISOString(),
        decidedAt: record.decidedAt?.toISOString() ?? null,
        closedAt: record.closedAt?.toISOString() ?? null,
        rowVersion: record.rowVersion,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString()
    };
}

function mapTodoItemToSummary(todoItem: TodoItem): TodoItemSummary {
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
