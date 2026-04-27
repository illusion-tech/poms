import type { TodoItemSummary } from '@poms/admin-data-access';

export type CommissionTodoDeepLinkKind = 'payout' | 'adjustment' | 'ambiguous';

export interface CommissionTodoDeepLinkQuery {
    payoutId: string | null;
    adjustmentId: string | null;
    approvalRecordId: string | null;
}

export interface CommissionTodoDeepLinkContext {
    kind: CommissionTodoDeepLinkKind;
    targetId: string;
    targetLabel: string;
    approvalRecordId: string | null;
    targetFound: boolean;
    todoTitle: string | null;
    todoTargetTitle: string | null;
    currentNodeName: string | null;
    summary: string;
    detail: string;
    highlightPayoutId: string | null;
    highlightAdjustmentId: string | null;
}

interface BuildCommissionTodoDeepLinkContextInput {
    query: CommissionTodoDeepLinkQuery;
    todos: readonly TodoItemSummary[];
    payoutIds: ReadonlySet<string>;
    adjustmentIds: ReadonlySet<string>;
}

export function buildCommissionTodoDeepLinkContext(input: BuildCommissionTodoDeepLinkContextInput): CommissionTodoDeepLinkContext | null {
    const payoutId = normalizeId(input.query.payoutId);
    const adjustmentId = normalizeId(input.query.adjustmentId);
    const approvalRecordId = normalizeId(input.query.approvalRecordId);

    if (!payoutId && !adjustmentId) {
        return null;
    }

    if (payoutId && adjustmentId) {
        const payoutFound = input.payoutIds.has(payoutId);
        const adjustmentFound = input.adjustmentIds.has(adjustmentId);

        if (payoutFound && !adjustmentFound) {
            return buildSingleTargetContext({
                kind: 'payout',
                targetId: payoutId,
                approvalRecordId,
                targetFound: true,
                todos: input.todos
            });
        }

        if (adjustmentFound && !payoutFound) {
            return buildSingleTargetContext({
                kind: 'adjustment',
                targetId: adjustmentId,
                approvalRecordId,
                targetFound: true,
                todos: input.todos
            });
        }

        return {
            kind: 'ambiguous',
            targetId: `${payoutId} / ${adjustmentId}`,
            targetLabel: '提成待办',
            approvalRecordId,
            targetFound: false,
            todoTitle: null,
            todoTargetTitle: null,
            currentNodeName: null,
            summary: '提成待办深链参数不唯一',
            detail: 'URL 同时包含发放和调整目标，页面不会自动选择业务对象。请从待办入口重新进入。',
            highlightPayoutId: null,
            highlightAdjustmentId: null
        };
    }

    if (payoutId) {
        return buildSingleTargetContext({
            kind: 'payout',
            targetId: payoutId,
            approvalRecordId,
            targetFound: input.payoutIds.has(payoutId),
            todos: input.todos
        });
    }

    if (!adjustmentId) {
        return null;
    }

    return buildSingleTargetContext({
        kind: 'adjustment',
        targetId: adjustmentId,
        approvalRecordId,
        targetFound: input.adjustmentIds.has(adjustmentId),
        todos: input.todos
    });
}

function buildSingleTargetContext(input: { kind: Exclude<CommissionTodoDeepLinkKind, 'ambiguous'>; targetId: string; approvalRecordId: string | null; targetFound: boolean; todos: readonly TodoItemSummary[] }): CommissionTodoDeepLinkContext {
    const targetLabel = input.kind === 'payout' ? '提成发放' : '提成调整';
    const todo = findTodo(input.todos, input.kind, input.targetId, input.approvalRecordId);
    const nodeText = todo?.currentNodeName ? `当前节点：${todo.currentNodeName}` : null;
    const approvalText = input.approvalRecordId ? `审批记录：${input.approvalRecordId}` : '审批记录：暂无';
    const targetText = todo?.targetTitle ? `目标：${todo.targetTitle}` : `目标 ID：${input.targetId}`;

    return {
        kind: input.kind,
        targetId: input.targetId,
        targetLabel,
        approvalRecordId: input.approvalRecordId,
        targetFound: input.targetFound,
        todoTitle: todo?.title ?? null,
        todoTargetTitle: todo?.targetTitle ?? null,
        currentNodeName: todo?.currentNodeName ?? null,
        summary: input.targetFound ? `已定位${targetLabel}待办` : `未找到${targetLabel}目标行`,
        detail: input.targetFound
            ? [todo?.title ?? '已根据 URL 定位目标行', targetText, nodeText, approvalText].filter(Boolean).join('；')
            : `URL 指向的${targetLabel} ${input.targetId} 当前不在表格数据中，可能已处理或数据尚未同步。${input.approvalRecordId ? `审批记录：${input.approvalRecordId}` : ''}`,
        highlightPayoutId: input.kind === 'payout' && input.targetFound ? input.targetId : null,
        highlightAdjustmentId: input.kind === 'adjustment' && input.targetFound ? input.targetId : null
    };
}

function findTodo(todos: readonly TodoItemSummary[], kind: Exclude<CommissionTodoDeepLinkKind, 'ambiguous'>, targetId: string, approvalRecordId: string | null): TodoItemSummary | null {
    const targetObjectType = kind === 'payout' ? 'CommissionPayout' : 'CommissionAdjustment';
    const byApproval = approvalRecordId ? todos.find((todo) => todo.sourceType === 'ApprovalRecord' && todo.sourceId === approvalRecordId && todo.targetObjectType === targetObjectType && todo.targetObjectId === targetId) : null;

    return byApproval ?? todos.find((todo) => todo.targetObjectType === targetObjectType && todo.targetObjectId === targetId && todo.status === 'open') ?? null;
}

function normalizeId(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
}
