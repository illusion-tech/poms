import type { TodoItemSummary } from '@poms/admin-data-access';
import { resolveTodoNavigationTarget } from './todo-navigation';

describe('resolveTodoNavigationTarget', () => {
    it('routes contract todos to contract detail', () => {
        const result = resolveTodoNavigationTarget(createTodo({ targetObjectType: 'Contract', targetObjectId: 'contract-1' }));

        expect(result).toEqual({
            navigable: true,
            commands: ['/contracts', 'contract-1']
        });
    });

    it('routes project todos to project detail', () => {
        const result = resolveTodoNavigationTarget(createTodo({ targetObjectType: 'Project', targetObjectId: 'project-1' }));

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
                sourceType: 'SalesFollowUpRecord',
                sourceId: 'follow-up-1',
                todoType: 'sales_follow_up_reminder',
                targetObjectType: 'Project',
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
                sourceType: 'SalesFollowUpRecord',
                sourceId: 'follow-up-2',
                todoType: 'sales_follow_up_reminder',
                targetObjectType: 'Lead',
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

    it('routes customer sales follow-up reminders to the customer list detail context', () => {
        const result = resolveTodoNavigationTarget(
            createTodo({
                id: 'todo-3',
                sourceType: 'SalesFollowUpRecord',
                sourceId: 'follow-up-3',
                todoType: 'sales_follow_up_reminder',
                targetObjectType: 'Customer',
                targetObjectId: 'customer-1'
            })
        );

        expect(result).toEqual({
            navigable: true,
            commands: ['/customers'],
            queryParams: {
                customerId: 'customer-1',
                followUpId: 'follow-up-3',
                todoId: 'todo-3'
            }
        });
    });

    it('routes commission payout todos to operations with payout and approval query params', () => {
        const result = resolveTodoNavigationTarget(
            createTodo({
                sourceType: 'ApprovalRecord',
                sourceId: 'approval-1',
                targetObjectType: 'CommissionPayout',
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
                targetObjectType: 'CommissionAdjustment',
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
                targetObjectType: 'CommissionPayout',
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
        sourceType: 'ApprovalRecord',
        sourceId: 'approval-default',
        todoType: 'approval',
        businessDomain: '提成',
        targetObjectType: 'Project',
        targetObjectId: 'target-1',
        projectId: null,
        title: '处理待办',
        summary: null,
        targetTitle: null,
        currentNodeName: null,
        allowedActions: [],
        assigneeUserId: 'user-1',
        status: 'open',
        priority: 'normal',
        dueAt: null,
        completedAt: null,
        rowVersion: 1,
        createdAt: '2026-04-28T00:00:00.000Z',
        updatedAt: '2026-04-28T00:00:00.000Z',
        ...overrides
    };
}
