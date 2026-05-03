import { BusinessDomain, TargetObjectType, TodoPriority, TodoSourceType, TodoStatus, TodoType, type TodoItemSummary } from '@poms/admin-data-access';
import { buildCommissionTodoDeepLinkContext } from './commission-todo-deeplink';

const PAYOUT_ID = '51000000-0000-4000-8000-000000000391';
const ADJUSTMENT_ID = '52000000-0000-4000-8000-000000000391';
const PAYOUT_APPROVAL_ID = '61000000-0000-4000-8000-000000000391';

describe('buildCommissionTodoDeepLinkContext', () => {
    it('builds payout context from approval todo and found row', () => {
        const context = buildCommissionTodoDeepLinkContext({
            query: { payoutId: PAYOUT_ID, adjustmentId: null, approvalRecordId: PAYOUT_APPROVAL_ID },
            todos: [
                createTodo({
                    sourceId: PAYOUT_APPROVAL_ID,
                    targetObjectType: TargetObjectType.CommissionPayout,
                    targetObjectId: PAYOUT_ID,
                    title: '首期发放审批',
                    targetTitle: '首期发放',
                    currentNodeName: '销售总监审批'
                })
            ],
            payoutIds: new Set([PAYOUT_ID]),
            adjustmentIds: new Set()
        });

        expect(context).toMatchObject({
            kind: 'payout',
            targetFound: true,
            todoTitle: '首期发放审批',
            todoTargetTitle: '首期发放',
            currentNodeName: '销售总监审批',
            highlightPayoutId: PAYOUT_ID,
            highlightAdjustmentId: null
        });
    });

    it('keeps a readable warning context when the target row is missing', () => {
        const context = buildCommissionTodoDeepLinkContext({
            query: { payoutId: PAYOUT_ID, adjustmentId: null, approvalRecordId: PAYOUT_APPROVAL_ID },
            todos: [],
            payoutIds: new Set(),
            adjustmentIds: new Set()
        });

        expect(context).toMatchObject({
            kind: 'payout',
            targetFound: false,
            summary: '未找到提成发放目标行',
            highlightPayoutId: null
        });
        expect(context?.detail).toContain(PAYOUT_ID);
        expect(context?.detail).toContain(PAYOUT_APPROVAL_ID);
    });

    it('resolves ambiguous query params only when one target actually exists', () => {
        const context = buildCommissionTodoDeepLinkContext({
            query: { payoutId: PAYOUT_ID, adjustmentId: ADJUSTMENT_ID, approvalRecordId: null },
            todos: [],
            payoutIds: new Set(),
            adjustmentIds: new Set([ADJUSTMENT_ID])
        });

        expect(context).toMatchObject({
            kind: 'adjustment',
            targetFound: true,
            highlightPayoutId: null,
            highlightAdjustmentId: ADJUSTMENT_ID
        });
    });
});

function createTodo(overrides: Partial<TodoItemSummary> = {}): TodoItemSummary {
    return {
        id: '41000000-0000-4000-8000-000000000399',
        sourceType: TodoSourceType.ApprovalRecord,
        sourceId: '61000000-0000-4000-8000-000000000399',
        todoType: TodoType.Approval,
        businessDomain: BusinessDomain.Commission,
        targetObjectType: TargetObjectType.CommissionPayout,
        targetObjectId: PAYOUT_ID,
        projectId: '21000000-0000-4000-8000-000000000201',
        title: '提成待办',
        summary: null,
        targetTitle: null,
        currentNodeName: '审批节点',
        allowedActions: ['open'],
        assigneeUserId: '10000000-0000-4000-8000-000000000001',
        status: TodoStatus.Open,
        priority: TodoPriority.Normal,
        dueAt: null,
        completedAt: null,
        rowVersion: 1,
        createdAt: '2026-04-28T09:00:00.000Z',
        updatedAt: '2026-04-28T09:00:00.000Z',
        ...overrides
    };
}
