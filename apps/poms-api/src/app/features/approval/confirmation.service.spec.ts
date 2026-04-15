import { BadRequestException, ConflictException } from '@nestjs/common';

const generatedIds = [
    '40000000-0000-4000-8000-000000000101',
    '40000000-0000-4000-8000-000000000102',
    '40000000-0000-4000-8000-000000000103',
    '40000000-0000-4000-8000-000000000104',
    '40000000-0000-4000-8000-000000000105'
];

jest.mock('node:crypto', () => ({
    randomUUID: jest.fn(() => generatedIds.shift() ?? '40000000-0000-4000-8000-000000000999')
}));

jest.mock('@mikro-orm/nestjs', () => ({
    InjectRepository: () => () => undefined
}));

jest.mock('./confirmation-record.entity', () => ({
    ConfirmationRecord: class ConfirmationRecord {},
    ConfirmationParticipant: class ConfirmationParticipant {}
}));

jest.mock('./todo-item.entity', () => ({
    TodoItem: class TodoItem {}
}));

import { ConfirmationService } from './confirmation.service';

describe('ConfirmationService', () => {
    const confirmationRecordId = '40000000-0000-4000-8000-000000000101';
    const participantUserId = '00000000-0000-4000-8000-000000000011';
    const projectId = '20000000-0000-4000-8000-000000000001';
    const targetId = '30000000-0000-4000-8000-000000000001';
    const initiatorUserId = '00000000-0000-4000-8000-000000000001';

    let service: ConfirmationService;
    let confirmationRecordRepository: { getEntityManager: jest.Mock; findOne: jest.Mock };
    let confirmationParticipantRepository: { find: jest.Mock };
    let todoItemRepository: Record<string, never>;
    let em: {
        transactional: jest.Mock;
        findOne: jest.Mock;
        find: jest.Mock;
        create: jest.Mock;
        persist: jest.Mock;
        flush: jest.Mock;
    };

    beforeEach(() => {
        generatedIds.splice(0, generatedIds.length, ...[
            '40000000-0000-4000-8000-000000000101',
            '40000000-0000-4000-8000-000000000102',
            '40000000-0000-4000-8000-000000000103',
            '40000000-0000-4000-8000-000000000104',
            '40000000-0000-4000-8000-000000000105'
        ]);

        em = {
            transactional: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn((_entity, data) => ({ rowVersion: 1, createdAt: new Date(), updatedAt: new Date(), ...data })),
            persist: jest.fn(),
            flush: jest.fn()
        };
        em.transactional.mockImplementation(async (callback: (innerEm: typeof em) => Promise<unknown>) => callback(em));

        confirmationRecordRepository = {
            getEntityManager: jest.fn(() => em),
            findOne: jest.fn()
        };
        confirmationParticipantRepository = {
            find: jest.fn()
        };
        todoItemRepository = {};

        service = new ConfirmationService(
            confirmationRecordRepository as never,
            confirmationParticipantRepository as never,
            todoItemRepository as never
        );
    });

    it('creates a pending confirmation record with participant todos', async () => {
        em.findOne.mockResolvedValueOnce(null);

        const result = await service.createConfirmationRecord(initiatorUserId, {
            confirmationType: 'project-handover',
            businessDomain: 'project-handover',
            targetType: 'ProjectHandover',
            targetId,
            projectId,
            title: '项目移交确认',
            participants: [
                {
                    participantId: participantUserId,
                    participantRoleKey: 'sales-owner',
                    participantDisplayName: '销售负责人'
                }
            ]
        });

        expect(em.create).toHaveBeenCalledWith(
            expect.any(Function),
            expect.objectContaining({
                id: confirmationRecordId,
                targetType: 'ProjectHandover',
                targetId,
                requiredCount: 1,
                confirmedCount: 0,
                status: 'pending'
            })
        );
        expect(em.persist).toHaveBeenCalled();
        expect(result).toEqual({
            targetId,
            targetType: 'ProjectHandover',
            resultStatus: 'pending',
            businessStatusAfter: 'pending',
            approvalRecordId: null,
            confirmationRecordId,
            todoItemIds: ['40000000-0000-4000-8000-000000000103'],
            snapshotId: null
        });
    });

    it('rejects duplicate participants before creating a confirmation record', async () => {
        await expect(
            service.createConfirmationRecord(initiatorUserId, {
                confirmationType: 'project-handover',
                businessDomain: 'project-handover',
                targetType: 'ProjectHandover',
                targetId,
                title: '项目移交确认',
                participants: [
                    { participantId: participantUserId, participantRoleKey: 'sales-owner' },
                    { participantId: participantUserId, participantRoleKey: 'sales-owner' }
                ]
            })
        ).rejects.toThrow(BadRequestException);
    });

    it('blocks duplicate pending confirmation records for the same target', async () => {
        em.findOne.mockResolvedValueOnce({ id: confirmationRecordId });

        await expect(
            service.createConfirmationRecord(initiatorUserId, {
                confirmationType: 'project-handover',
                businessDomain: 'project-handover',
                targetType: 'ProjectHandover',
                targetId,
                title: '项目移交确认',
                participants: [{ participantId: participantUserId, participantRoleKey: 'sales-owner' }]
            })
        ).rejects.toThrow(ConflictException);
    });

    it('confirms a participant and completes the record when all participants are confirmed', async () => {
        const record = makeConfirmationRecord();
        const participant = { confirmationRecordId, participantId: participantUserId, participantStatus: 'pending', updatedBy: null };
        const todo = { id: '50000000-0000-4000-8000-000000000001', status: 'open', completedAt: null };
        em.findOne.mockResolvedValueOnce(record).mockResolvedValueOnce(participant).mockResolvedValueOnce(todo);

        const result = await service.confirmParticipant(confirmationRecordId, participantUserId, {
            comment: '已确认',
            expectedVersion: 1
        });

        expect(participant.participantStatus).toBe('confirmed');
        expect(record.status).toBe('confirmed');
        expect(record.confirmedCount).toBe(1);
        expect(todo.status).toBe('completed');
        expect(result.confirmationRecordId).toBe(confirmationRecordId);
        expect(result.resultStatus).toBe('confirmed');
    });

    it('closes a pending confirmation record and cancels open todos', async () => {
        const record = makeConfirmationRecord();
        const participant = { participantStatus: 'pending', updatedBy: null };
        const todo = { id: '50000000-0000-4000-8000-000000000001', status: 'open', completedAt: null };
        em.findOne.mockResolvedValueOnce(record);
        em.find.mockResolvedValueOnce([participant]).mockResolvedValueOnce([todo]);

        const result = await service.closeConfirmationRecord(confirmationRecordId, initiatorUserId, {
            reason: 'handover-canceled',
            expectedVersion: 1
        });

        expect(record.status).toBe('closed');
        expect(participant.participantStatus).toBe('closed');
        expect(todo.status).toBe('canceled');
        expect(result.resultStatus).toBe('closed');
        expect(result.todoItemIds).toEqual([todo.id]);
    });

    it('finds the latest confirmation progress by target', async () => {
        const record = { ...makeConfirmationRecord(), status: 'confirmed', confirmedCount: 1, confirmedAt: new Date('2026-04-15T00:10:00.000Z') };
        confirmationRecordRepository.findOne.mockResolvedValue(record);
        confirmationParticipantRepository.find.mockResolvedValue([
            {
                participantId: participantUserId,
                participantRoleKey: 'sales-owner',
                participantDisplayName: '销售负责人',
                participantStatus: 'confirmed',
                confirmedAt: new Date('2026-04-15T00:10:00.000Z'),
                confirmedComment: '已确认'
            }
        ]);

        const result = await service.findLatestConfirmationProgressByTarget('ProjectHandover', targetId, 'project-handover');

        expect(confirmationRecordRepository.findOne).toHaveBeenCalledWith(
            { targetType: 'ProjectHandover', targetId, confirmationType: 'project-handover' },
            { orderBy: { submittedAt: 'DESC', createdAt: 'DESC' } }
        );
        expect(result?.status).toBe('confirmed');
        expect(result?.participants).toHaveLength(1);
        expect(result?.participants[0].participantStatus).toBe('confirmed');
    });
});

function makeConfirmationRecord() {
    return {
        id: '40000000-0000-4000-8000-000000000101',
        confirmationType: 'project-handover',
        businessDomain: 'project-handover',
        targetType: 'ProjectHandover',
        targetId: '30000000-0000-4000-8000-000000000001',
        projectId: '20000000-0000-4000-8000-000000000001',
        status: 'pending',
        requiredCount: 1,
        confirmedCount: 0,
        submittedAt: new Date(),
        confirmedAt: null,
        closedAt: null,
        rowVersion: 1,
        updatedBy: null
    };
}
