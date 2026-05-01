import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { TodoPriorityValue, TodoSourceTypeValue, TodoStatusValue, TodoTypeValue } from '@poms/shared-contracts';
import type { BusinessDomain, CommandResult, TargetObjectType, TodoPriority } from '@poms/shared-contracts';
import { randomUUID } from 'node:crypto';
import { ConfirmationParticipant, ConfirmationRecord, type ConfirmationParticipantStatus } from './confirmation-record.entity';
import { TodoItem } from './todo-item.entity';

const CONFIRMATION_SOURCE_TYPE = TodoSourceTypeValue.ConfirmationRecord;
const CONFIRMATION_TODO_TYPE = TodoTypeValue.Confirmation;
const OPEN_TODO_STATUSES = [TodoStatusValue.Open, TodoStatusValue.Processing] as const;

export interface ConfirmationParticipantInput {
    participantId: string;
    participantRoleKey: string;
    participantDisplayName?: string | null;
    todoTitle?: string;
    todoSummary?: string | null;
    dueAt?: Date | null;
}

export interface CreateConfirmationRecordInput {
    confirmationType: string;
    businessDomain: BusinessDomain;
    targetType: TargetObjectType;
    targetId: string;
    projectId?: string | null;
    title: string;
    summary?: string | null;
    comment?: string | null;
    priority?: TodoPriority;
    participants: ConfirmationParticipantInput[];
}

export interface ConfirmParticipantInput {
    comment?: string | null;
    expectedVersion?: number;
}

export interface CloseConfirmationRecordInput {
    reason: string;
    comment?: string | null;
    expectedVersion?: number;
}

export interface ConfirmationProgressParticipant {
    participantId: string;
    participantRoleKey: string;
    participantDisplayName: string | null;
    participantStatus: ConfirmationParticipantStatus;
    confirmedAt: string | null;
    confirmedComment: string | null;
}

export interface ConfirmationProgress {
    id: string;
    confirmationType: string;
    businessDomain: BusinessDomain;
    targetType: TargetObjectType;
    targetId: string;
    projectId: string | null;
    status: string;
    requiredCount: number;
    confirmedCount: number;
    submittedAt: string;
    confirmedAt: string | null;
    closedAt: string | null;
    rowVersion: number;
    participants: ConfirmationProgressParticipant[];
}

@Injectable()
export class ConfirmationService {
    constructor(
        @InjectRepository(ConfirmationRecord)
        private readonly confirmationRecordRepository: EntityRepository<ConfirmationRecord>,
        @InjectRepository(ConfirmationParticipant)
        private readonly confirmationParticipantRepository: EntityRepository<ConfirmationParticipant>,
        @InjectRepository(TodoItem)
        private readonly todoItemRepository: EntityRepository<TodoItem>
    ) {}

    async createConfirmationRecord(initiatorUserId: string, input: CreateConfirmationRecordInput): Promise<CommandResult> {
        this.assertParticipantInput(input.participants);

        return this.confirmationRecordRepository.getEntityManager().transactional(async (em) => {
            const existingOpenRecord = await em.findOne(ConfirmationRecord, {
                confirmationType: input.confirmationType,
                targetType: input.targetType,
                targetId: input.targetId,
                status: 'pending'
            });
            if (existingOpenRecord) {
                throw new ConflictException(`ConfirmationRecord already exists for ${input.targetType} ${input.targetId}`);
            }

            const confirmationRecordId = randomUUID();
            const now = new Date();
            const confirmationRecord = em.create(ConfirmationRecord, {
                id: confirmationRecordId,
                confirmationType: input.confirmationType,
                businessDomain: input.businessDomain,
                targetType: input.targetType,
                targetId: input.targetId,
                projectId: input.projectId ?? null,
                status: 'pending',
                requiredCount: input.participants.length,
                confirmedCount: 0,
                confirmationComment: input.comment ?? null,
                submittedAt: now,
                confirmedAt: null,
                closedAt: null,
                closedBy: null,
                closeReason: null,
                createdBy: initiatorUserId,
                updatedBy: initiatorUserId
            });

            const participantEntities: ConfirmationParticipant[] = [];
            const todoItems: TodoItem[] = [];

            for (const participant of input.participants) {
                const participantEntity = em.create(ConfirmationParticipant, {
                    id: randomUUID(),
                    confirmationRecordId,
                    participantId: participant.participantId,
                    participantRoleKey: participant.participantRoleKey,
                    participantDisplayName: participant.participantDisplayName ?? null,
                    participantStatus: 'pending',
                    confirmedAt: null,
                    confirmedComment: null,
                    createdBy: initiatorUserId,
                    updatedBy: initiatorUserId
                });
                participantEntities.push(participantEntity);

                todoItems.push(
                    em.create(TodoItem, {
                        id: randomUUID(),
                        sourceType: CONFIRMATION_SOURCE_TYPE,
                        sourceId: confirmationRecordId,
                        todoType: CONFIRMATION_TODO_TYPE,
                        businessDomain: input.businessDomain,
                        targetObjectType: input.targetType,
                        targetObjectId: input.targetId,
                        projectId: input.projectId ?? null,
                        title: participant.todoTitle ?? input.title,
                        summary: participant.todoSummary ?? input.summary ?? null,
                        assigneeUserId: participant.participantId,
                        status: TodoStatusValue.Open,
                        priority: input.priority ?? TodoPriorityValue.High,
                        dueAt: participant.dueAt ?? null,
                        completedAt: null
                    })
                );
            }

            em.persist([confirmationRecord, ...participantEntities, ...todoItems]);
            await em.flush();

            return {
                targetId: input.targetId,
                targetType: input.targetType,
                resultStatus: confirmationRecord.status,
                businessStatusAfter: confirmationRecord.status,
                approvalRecordId: null,
                confirmationRecordId: confirmationRecord.id,
                todoItemIds: todoItems.map((todo) => todo.id),
                snapshotId: null
            };
        });
    }

    async confirmParticipant(confirmationRecordId: string, actorUserId: string, input: ConfirmParticipantInput = {}): Promise<CommandResult> {
        return this.confirmationRecordRepository.getEntityManager().transactional(async (em) => {
            const confirmationRecord = await em.findOne(ConfirmationRecord, { id: confirmationRecordId });
            if (!confirmationRecord) {
                throw new NotFoundException(`ConfirmationRecord ${confirmationRecordId} not found`);
            }

            this.assertExpectedVersion(confirmationRecord.rowVersion, input.expectedVersion, 'ConfirmationRecord');

            if (confirmationRecord.status !== 'pending') {
                throw new BadRequestException(`ConfirmationRecord ${confirmationRecordId} cannot be confirmed in status ${confirmationRecord.status}`);
            }

            const participant = await em.findOne(ConfirmationParticipant, {
                confirmationRecordId,
                participantId: actorUserId
            });
            if (!participant) {
                throw new ForbiddenException(`ConfirmationRecord ${confirmationRecordId} is not assigned to current user`);
            }
            if (participant.participantStatus !== 'pending') {
                throw new ConflictException(`Confirmation participant ${actorUserId} is already ${participant.participantStatus}`);
            }

            const todoItem = await em.findOne(TodoItem, {
                sourceType: CONFIRMATION_SOURCE_TYPE,
                sourceId: confirmationRecordId,
                assigneeUserId: actorUserId,
                status: { $in: [...OPEN_TODO_STATUSES] }
            });

            const now = new Date();
            participant.participantStatus = 'confirmed';
            participant.confirmedAt = now;
            participant.confirmedComment = input.comment ?? null;
            participant.updatedBy = actorUserId;

            confirmationRecord.confirmedCount += 1;
            confirmationRecord.updatedBy = actorUserId;

            if (confirmationRecord.confirmedCount >= confirmationRecord.requiredCount) {
                confirmationRecord.status = 'confirmed';
                confirmationRecord.confirmedAt = now;
            }

            const todoItemIds: string[] = [];
            if (todoItem) {
                todoItem.status = TodoStatusValue.Completed;
                todoItem.completedAt = now;
                todoItemIds.push(todoItem.id);
            }

            em.persist([confirmationRecord, participant, ...(todoItem ? [todoItem] : [])]);
            await em.flush();

            return {
                targetId: confirmationRecord.targetId,
                targetType: confirmationRecord.targetType,
                resultStatus: confirmationRecord.status,
                businessStatusAfter: confirmationRecord.status,
                approvalRecordId: null,
                confirmationRecordId: confirmationRecord.id,
                todoItemIds,
                snapshotId: null
            };
        });
    }

    async closeConfirmationRecord(confirmationRecordId: string, actorUserId: string, input: CloseConfirmationRecordInput): Promise<CommandResult> {
        return this.confirmationRecordRepository.getEntityManager().transactional(async (em) => {
            const confirmationRecord = await em.findOne(ConfirmationRecord, { id: confirmationRecordId });
            if (!confirmationRecord) {
                throw new NotFoundException(`ConfirmationRecord ${confirmationRecordId} not found`);
            }

            this.assertExpectedVersion(confirmationRecord.rowVersion, input.expectedVersion, 'ConfirmationRecord');

            if (confirmationRecord.status !== 'pending') {
                throw new BadRequestException(`ConfirmationRecord ${confirmationRecordId} cannot be closed in status ${confirmationRecord.status}`);
            }

            const [participants, todoItems] = await Promise.all([
                em.find(ConfirmationParticipant, {
                    confirmationRecordId,
                    participantStatus: 'pending'
                }),
                em.find(TodoItem, {
                    sourceType: CONFIRMATION_SOURCE_TYPE,
                    sourceId: confirmationRecordId,
                    status: { $in: [...OPEN_TODO_STATUSES] }
                })
            ]);

            const now = new Date();
            confirmationRecord.status = 'closed';
            confirmationRecord.closedAt = now;
            confirmationRecord.closedBy = actorUserId;
            confirmationRecord.closeReason = input.comment ? `${input.reason}\n${input.comment}` : input.reason;
            confirmationRecord.updatedBy = actorUserId;

            for (const participant of participants) {
                participant.participantStatus = 'closed';
                participant.updatedBy = actorUserId;
            }
            for (const todoItem of todoItems) {
                todoItem.status = TodoStatusValue.Canceled;
                todoItem.completedAt = now;
            }

            em.persist([confirmationRecord, ...participants, ...todoItems]);
            await em.flush();

            return {
                targetId: confirmationRecord.targetId,
                targetType: confirmationRecord.targetType,
                resultStatus: confirmationRecord.status,
                businessStatusAfter: confirmationRecord.status,
                approvalRecordId: null,
                confirmationRecordId: confirmationRecord.id,
                todoItemIds: todoItems.map((todo) => todo.id),
                snapshotId: null
            };
        });
    }

    async findConfirmationProgressById(confirmationRecordId: string): Promise<ConfirmationProgress | null> {
        const confirmationRecord = await this.confirmationRecordRepository.findOne({ id: confirmationRecordId });
        if (!confirmationRecord) {
            return null;
        }

        return this.buildConfirmationProgress(confirmationRecord);
    }

    async findLatestConfirmationProgressByTarget(targetType: TargetObjectType, targetId: string, confirmationType?: string): Promise<ConfirmationProgress | null> {
        const where = confirmationType ? { targetType, targetId, confirmationType } : { targetType, targetId };
        const confirmationRecord = await this.confirmationRecordRepository.findOne(where, {
            orderBy: { submittedAt: 'DESC', createdAt: 'DESC' }
        });
        if (!confirmationRecord) {
            return null;
        }

        return this.buildConfirmationProgress(confirmationRecord);
    }

    private async buildConfirmationProgress(confirmationRecord: ConfirmationRecord): Promise<ConfirmationProgress> {
        const participants = await this.confirmationParticipantRepository.find(
            { confirmationRecordId: confirmationRecord.id },
            { orderBy: { createdAt: 'ASC' } }
        );

        return {
            id: confirmationRecord.id,
            confirmationType: confirmationRecord.confirmationType,
            businessDomain: confirmationRecord.businessDomain,
            targetType: confirmationRecord.targetType,
            targetId: confirmationRecord.targetId,
            projectId: confirmationRecord.projectId ?? null,
            status: confirmationRecord.status,
            requiredCount: confirmationRecord.requiredCount,
            confirmedCount: confirmationRecord.confirmedCount,
            submittedAt: confirmationRecord.submittedAt.toISOString(),
            confirmedAt: confirmationRecord.confirmedAt?.toISOString() ?? null,
            closedAt: confirmationRecord.closedAt?.toISOString() ?? null,
            rowVersion: confirmationRecord.rowVersion,
            participants: participants.map((participant) => ({
                participantId: participant.participantId,
                participantRoleKey: participant.participantRoleKey,
                participantDisplayName: participant.participantDisplayName ?? null,
                participantStatus: participant.participantStatus,
                confirmedAt: participant.confirmedAt?.toISOString() ?? null,
                confirmedComment: participant.confirmedComment ?? null
            }))
        };
    }

    private assertParticipantInput(participants: ConfirmationParticipantInput[]): void {
        if (participants.length === 0) {
            throw new BadRequestException('ConfirmationRecord requires at least one participant');
        }

        const participantIds = new Set<string>();
        for (const participant of participants) {
            if (participantIds.has(participant.participantId)) {
                throw new BadRequestException(`Duplicate confirmation participant ${participant.participantId}`);
            }
            participantIds.add(participant.participantId);
        }
    }

    private assertExpectedVersion(actualVersion: number, expectedVersion: number | undefined, resourceType: string): void {
        if (expectedVersion !== undefined && actualVersion !== expectedVersion) {
            throw new ConflictException(`${resourceType} version ${expectedVersion} does not match current version ${actualVersion}`);
        }
    }
}
