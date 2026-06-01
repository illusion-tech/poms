import { BusinessDomain, TargetObjectType, TodoPriority, TodoSourceType, TodoStatus, TodoType, type TodoItemSummary } from '@poms/admin-data-access';
import { resolveTodoNavigationTarget } from './todo-navigation';

describe('resolveTodoNavigationTarget', () => {
    it('routes contract todos to contract detail', () => {
        const result = resolveTodoNavigationTarget(createTodo({ targetObjectType: TargetObjectType.Contract, targetObjectId: 'contract-1' }));

        expect(result).toEqual({
            navigable: true,
            commands: ['/contracts', 'contract-1']
        });
    });

    it('routes project todos to project detail', () => {
        const result = resolveTodoNavigationTarget(createTodo({ targetObjectType: TargetObjectType.Project, targetObjectId: 'project-1' }));

        expect(result).toEqual({
            navigable: true,
            commands: ['/projects', 'project-1'],
            queryParams: undefined
        });
    });

    it('routes project sales follow-up reminders with follow-up query params', () => {
        const result = resolveTodoNavigationTarget(
            createTodo({
                id: 'todo-1',
                sourceType: TodoSourceType.SalesFollowUpRecord,
                sourceId: 'follow-up-1',
                todoType: TodoType.SalesFollowUpReminder,
                targetObjectType: TargetObjectType.Project,
                targetObjectId: 'project-1'
            })
        );

        expect(result).toEqual({
            navigable: true,
            commands: ['/projects', 'project-1'],
            queryParams: {
                followUpId: 'follow-up-1',
                todoId: 'todo-1'
            }
        });
    });

    it('routes lead sales follow-up reminders to the lead list detail context', () => {
        const result = resolveTodoNavigationTarget(
            createTodo({
                id: 'todo-2',
                sourceType: TodoSourceType.SalesFollowUpRecord,
                sourceId: 'follow-up-2',
                todoType: TodoType.SalesFollowUpReminder,
                targetObjectType: TargetObjectType.Lead,
                targetObjectId: 'lead-1'
            })
        );

        expect(result).toEqual({
            navigable: true,
            commands: ['/leads'],
            queryParams: {
                leadId: 'lead-1',
                followUpId: 'follow-up-2',
                todoId: 'todo-2'
            }
        });
    });

    it('routes customer sales follow-up reminders to the customer workspace', () => {
        const result = resolveTodoNavigationTarget(
            createTodo({
                id: 'todo-3',
                sourceType: TodoSourceType.SalesFollowUpRecord,
                sourceId: 'follow-up-3',
                todoType: TodoType.SalesFollowUpReminder,
                targetObjectType: TargetObjectType.Customer,
                targetObjectId: 'customer-1'
            })
        );

        expect(result).toEqual({
            navigable: true,
            commands: ['/customers', 'customer-1'],
            queryParams: {
                followUpId: 'follow-up-3',
                todoId: 'todo-3'
            }
        });
    });

    it('routes commission payout todos to operations with payout and approval query params', () => {
        const result = resolveTodoNavigationTarget(
            createTodo({
                sourceType: TodoSourceType.ApprovalRecord,
                sourceId: 'approval-1',
                targetObjectType: TargetObjectType.CommissionPayout,
                targetObjectId: 'payout-1',
                projectId: 'project-1'
            })
        );

        expect(result).toEqual({
            navigable: true,
            commands: ['/projects', 'project-1', 'commission', 'operations'],
            queryParams: {
                payoutId: 'payout-1',
                approvalRecordId: 'approval-1'
            }
        });
    });

    it('routes commission adjustment todos to operations with adjustment query params', () => {
        const result = resolveTodoNavigationTarget(
            createTodo({
                sourceType: 'System',
                sourceId: 'source-1',
                targetObjectType: TargetObjectType.CommissionAdjustment,
                targetObjectId: 'adjustment-1',
                projectId: 'project-1'
            })
        );

        expect(result).toEqual({
            navigable: true,
            commands: ['/projects', 'project-1', 'commission', 'operations'],
            queryParams: {
                adjustmentId: 'adjustment-1'
            }
        });
    });

    it('does not navigate commission todos without project context', () => {
        const result = resolveTodoNavigationTarget(
            createTodo({
                targetObjectType: TargetObjectType.CommissionPayout,
                targetObjectId: 'payout-1',
                projectId: null
            })
        );

        expect(result).toEqual({
            navigable: false,
            reason: '缺少项目上下文，无法打开提成待办'
        });
    });

    it('does not navigate unknown target types', () => {
        const result = resolveTodoNavigationTarget(createTodo({ targetObjectType: 'UnknownTarget' }));

        expect(result).toEqual({
            navigable: false,
            reason: '暂不支持打开此类待办'
        });
    });
});

function createTodo(overrides: Partial<TodoItemSummary> = {}): TodoItemSummary {
    return {
        id: 'todo-1',
        sourceType: TodoSourceType.ApprovalRecord,
        sourceId: 'approval-default',
        todoType: TodoType.Approval,
        businessDomain: BusinessDomain.Commission,
        targetObjectType: TargetObjectType.Project,
        targetObjectId: 'target-1',
        projectId: null,
        title: '处理待办',
        summary: null,
        targetTitle: null,
        currentNodeName: null,
        allowedActions: [],
        assigneeUserId: 'user-1',
        status: TodoStatus.Open,
        priority: TodoPriority.Normal,
        dueAt: null,
        completedAt: null,
        rowVersion: 1,
        createdAt: '2026-04-28T00:00:00.000Z',
        updatedAt: '2026-04-28T00:00:00.000Z',
        ...overrides
    };
}
