jest.mock('@mikro-orm/nestjs', () => ({
    InjectRepository: () => () => undefined
}));

import { TodoItem } from '../approval/todo-item.entity';
import { Customer } from '../customer/customer.entity';
import { Lead } from '../lead/lead.entity';
import { Project } from '../project/project.entity';
import { SalesFollowUpRecord } from './sales-follow-up-record.entity';
import { SalesFollowUpRepository } from './sales-follow-up.repository';

describe('SalesFollowUpRepository reminder todo sync', () => {
    const customerId = '11000000-0000-4000-8000-000000000001';
    const leadId = '50000000-0000-4000-8000-000000000001';
    const projectId = '20000000-0000-4000-8000-000000000001';
    const userId = '00000000-0000-4000-8000-000000000003';
    const orgId = '10000000-0000-4000-8000-000000000002';
    const recordId = '57000000-0000-4000-8000-000000000001';

    let repository: SalesFollowUpRepository;
    let em: {
        persist: jest.Mock;
        flush: jest.Mock;
        find: jest.Mock;
        findOne: jest.Mock;
        create: jest.Mock;
    };

    beforeEach(() => {
        em = {
            persist: jest.fn(),
            flush: jest.fn().mockResolvedValue(undefined),
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn((_, data) => Object.assign(new TodoItem(), data))
        };
        const followUpRepository = {
            getEntityManager: jest.fn(() => em)
        };

        repository = new SalesFollowUpRepository(
            followUpRepository as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never
        );
    });

    it('creates one project reminder todo and completes the previous stream reminder', async () => {
        const previousTodo = createTodo({ sourceId: '57000000-0000-4000-8000-000000000099' });
        em.find.mockResolvedValueOnce([previousTodo]);
        em.findOne.mockResolvedValueOnce(null);

        await repository.saveWithReminderSync(createRecord({ leadId, projectId }), createContext());

        expect(previousTodo.status).toBe('completed');
        expect(previousTodo.completedAt).toBeInstanceOf(Date);
        expect(em.create).toHaveBeenCalledWith(
            TodoItem,
            expect.objectContaining({
                sourceType: 'SalesFollowUpRecord',
                sourceId: recordId,
                todoType: 'sales_follow_up_reminder',
                businessDomain: 'sales',
                targetObjectType: 'Project',
                targetObjectId: projectId,
                projectId,
                title: '销售跟进提醒：华南地铁项目',
                summary: '与客户确认项目推进节奏',
                assigneeUserId: userId,
                status: 'open',
                priority: 'normal',
                dueAt: new Date('2026-05-06T02:00:00.000Z')
            })
        );
        expect(em.flush).toHaveBeenCalled();
    });

    it('completes the previous stream reminder without creating a new todo when nextFollowUpAt is empty', async () => {
        const previousTodo = createTodo({ sourceId: '57000000-0000-4000-8000-000000000099' });
        em.find.mockResolvedValueOnce([previousTodo]);

        await repository.saveWithReminderSync(createRecord({ leadId, nextFollowUpAt: null }), createContext({ project: null }));

        expect(previousTodo.status).toBe('completed');
        expect(em.findOne).not.toHaveBeenCalled();
        expect(em.create).not.toHaveBeenCalled();
        expect(em.flush).toHaveBeenCalled();
    });

    it('cancels the superseded record reminder and creates the replacement reminder', async () => {
        const supersededTodo = createTodo({ sourceId: '57000000-0000-4000-8000-000000000099' });
        const supersededRecord = createRecord({ id: '57000000-0000-4000-8000-000000000099', status: 'superseded' });
        const replacementRecord = createRecord({ leadId });
        em.find.mockResolvedValueOnce([supersededTodo]).mockResolvedValueOnce([]);
        em.findOne.mockResolvedValueOnce(null);

        await repository.saveReplacementWithReminderSync({
            supersededRecord,
            replacementRecord,
            context: createContext({ project: null })
        });

        expect(supersededTodo.status).toBe('canceled');
        expect(em.create).toHaveBeenCalledWith(
            TodoItem,
            expect.objectContaining({
                sourceId: recordId,
                targetObjectType: 'Lead',
                targetObjectId: leadId,
                title: '销售跟进提醒：华南地铁线索'
            })
        );
        expect(em.flush).toHaveBeenCalled();
    });

    it('cancels the voided record reminder without creating a fallback todo', async () => {
        const activeTodo = createTodo({ sourceId: recordId });
        em.find.mockResolvedValueOnce([activeTodo]);

        await repository.saveVoidWithReminderSync(createRecord({ status: 'voided' }));

        expect(activeTodo.status).toBe('canceled');
        expect(activeTodo.completedAt).toBeInstanceOf(Date);
        expect(em.create).not.toHaveBeenCalled();
        expect(em.flush).toHaveBeenCalled();
    });

    function createRecord(overrides: Partial<SalesFollowUpRecord> = {}): SalesFollowUpRecord {
        return Object.assign(new SalesFollowUpRecord(), {
            id: recordId,
            customerId,
            leadId: null,
            projectId: null,
            followUpType: 'meeting',
            status: 'active',
            occurredAt: new Date('2026-04-30T09:00:00.000Z'),
            summary: '与客户确认项目推进节奏',
            detail: '客户要求下周提交范围确认材料。',
            outcome: 'progress',
            nextFollowUpAt: new Date('2026-05-06T02:00:00.000Z'),
            ownerOrgId: orgId,
            ownerUserId: userId,
            rowVersion: 1,
            createdAt: new Date('2026-04-30T09:00:00.000Z'),
            updatedAt: new Date('2026-04-30T09:00:00.000Z'),
            ...overrides
        });
    }

    function createContext(overrides: { customer?: Customer; lead?: Lead | null; project?: Project | null } = {}) {
        return {
            customer: overrides.customer ?? Object.assign(new Customer(), { id: customerId, displayName: '华南地铁集团' }),
            lead: overrides.lead === undefined ? Object.assign(new Lead(), { id: leadId, leadName: '华南地铁线索' }) : overrides.lead,
            project: overrides.project === undefined ? Object.assign(new Project(), { id: projectId, projectName: '华南地铁项目' }) : overrides.project
        };
    }

    function createTodo(overrides: Partial<TodoItem> = {}): TodoItem {
        return Object.assign(new TodoItem(), {
            id: '58000000-0000-4000-8000-000000000001',
            sourceType: 'SalesFollowUpRecord',
            sourceId: recordId,
            todoType: 'sales_follow_up_reminder',
            businessDomain: 'sales',
            targetObjectType: 'Project',
            targetObjectId: projectId,
            projectId,
            title: '销售跟进提醒：华南地铁项目',
            summary: '与客户确认项目推进节奏',
            assigneeUserId: userId,
            status: 'open',
            priority: 'normal',
            dueAt: new Date('2026-05-06T02:00:00.000Z'),
            completedAt: null,
            rowVersion: 1,
            createdAt: new Date('2026-04-30T09:00:00.000Z'),
            updatedAt: new Date('2026-04-30T09:00:00.000Z'),
            ...overrides
        });
    }
});
