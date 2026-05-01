import { TargetObjectType, TodoSourceType, TodoType, type TodoItemSummary } from '@poms/admin-data-access';

export const TODO_TARGET_OBJECT_TYPE = {
    Customer: TargetObjectType.Customer,
    Lead: TargetObjectType.Lead,
    Contract: TargetObjectType.Contract,
    Project: TargetObjectType.Project,
    CommissionPayout: TargetObjectType.CommissionPayout,
    CommissionAdjustment: TargetObjectType.CommissionAdjustment
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

type TodoNavigationInput = Pick<TodoItemSummary, 'id' | 'targetObjectType' | 'targetObjectId' | 'projectId' | 'sourceType' | 'sourceId' | 'todoType'>;

const APPROVAL_RECORD_SOURCE_TYPE = TodoSourceType.ApprovalRecord;
const SALES_FOLLOW_UP_RECORD_SOURCE_TYPE = TodoSourceType.SalesFollowUpRecord;
const SALES_FOLLOW_UP_REMINDER_TODO_TYPE = TodoType.SalesFollowUpReminder;

export function resolveTodoNavigationTarget(todo: TodoNavigationInput): TodoNavigationTarget {
    switch (todo.targetObjectType) {
        case TODO_TARGET_OBJECT_TYPE.Customer:
            return {
                navigable: true,
                commands: ['/customers'],
                queryParams: salesFollowUpReminderQueryParams(todo, 'customerId')
            };
        case TODO_TARGET_OBJECT_TYPE.Lead:
            return {
                navigable: true,
                commands: ['/leads'],
                queryParams: salesFollowUpReminderQueryParams(todo, 'leadId')
            };
        case TODO_TARGET_OBJECT_TYPE.Contract:
            return {
                navigable: true,
                commands: ['/contracts', todo.targetObjectId]
            };
        case TODO_TARGET_OBJECT_TYPE.Project:
            return {
                navigable: true,
                commands: ['/projects', todo.targetObjectId],
                queryParams: salesFollowUpReminderQueryParams(todo)
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

function salesFollowUpReminderQueryParams(todo: TodoNavigationInput, targetQueryParam?: 'customerId' | 'leadId'): Record<string, string> | undefined {
    if (todo.sourceType !== SALES_FOLLOW_UP_RECORD_SOURCE_TYPE || todo.todoType !== SALES_FOLLOW_UP_REMINDER_TODO_TYPE) {
        return targetQueryParam ? { [targetQueryParam]: todo.targetObjectId } : undefined;
    }

    const queryParams: Record<string, string> = {
        followUpId: todo.sourceId
    };

    queryParams['todoId'] = todo.id;

    if (targetQueryParam) {
        queryParams[targetQueryParam] = todo.targetObjectId;
    }

    return queryParams;
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
