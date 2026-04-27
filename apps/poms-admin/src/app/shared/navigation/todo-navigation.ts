import type { TodoItemSummary } from '@poms/admin-data-access';

export const TODO_TARGET_OBJECT_TYPE = {
    Contract: 'Contract',
    Project: 'Project',
    CommissionPayout: 'CommissionPayout',
    CommissionAdjustment: 'CommissionAdjustment'
} as const;

export type KnownTodoTargetObjectType = (typeof TODO_TARGET_OBJECT_TYPE)[keyof typeof TODO_TARGET_OBJECT_TYPE];

export type TodoNavigationTarget =
    | {
          navigable: true;
          commands: string[];
          queryParams?: Record<string, string>;
      }
    | {
          navigable: false;
          reason: string;
      };

type TodoNavigationInput = Pick<TodoItemSummary, 'targetObjectType' | 'targetObjectId' | 'projectId' | 'sourceType' | 'sourceId'>;

const APPROVAL_RECORD_SOURCE_TYPE = 'ApprovalRecord';

export function resolveTodoNavigationTarget(todo: TodoNavigationInput): TodoNavigationTarget {
    switch (todo.targetObjectType) {
        case TODO_TARGET_OBJECT_TYPE.Contract:
            return {
                navigable: true,
                commands: ['/contracts', todo.targetObjectId]
            };
        case TODO_TARGET_OBJECT_TYPE.Project:
            return {
                navigable: true,
                commands: ['/projects', todo.targetObjectId]
            };
        case TODO_TARGET_OBJECT_TYPE.CommissionPayout:
            return commissionNavigationTarget(todo, 'payoutId');
        case TODO_TARGET_OBJECT_TYPE.CommissionAdjustment:
            return commissionNavigationTarget(todo, 'adjustmentId');
        default:
            return {
                navigable: false,
                reason: '暂不支持打开此类待办'
            };
    }
}

function commissionNavigationTarget(todo: TodoNavigationInput, targetQueryParam: 'payoutId' | 'adjustmentId'): TodoNavigationTarget {
    if (!todo.projectId) {
        return {
            navigable: false,
            reason: '缺少项目上下文，无法打开提成待办'
        };
    }

    const queryParams: Record<string, string> = {
        [targetQueryParam]: todo.targetObjectId
    };

    if (todo.sourceType === APPROVAL_RECORD_SOURCE_TYPE) {
        queryParams['approvalRecordId'] = todo.sourceId;
    }

    return {
        navigable: true,
        commands: ['/projects', todo.projectId, 'commission', 'operations'],
        queryParams
    };
}
