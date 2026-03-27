import type { AxiosInstance } from 'axios';
import { expectStatus } from './http';
import type {
    ApprovalRecordSummary,
    ApproveRecordRequest,
    CommandResult,
    RejectApprovalRecordRequest,
    TodoItemSummary
} from './types';

export async function listMyTodos(client: AxiosInstance): Promise<TodoItemSummary[]> {
    const response = await client.get<TodoItemSummary[]>('/me/todos');
    return expectStatus(response, 200);
}

export async function findOpenTodoForTarget(
    client: AxiosInstance,
    targetObjectType: string,
    targetObjectId: string
): Promise<TodoItemSummary> {
    const todos = await listMyTodos(client);
    const todo = todos.find(
        (item) =>
            item.targetObjectType === targetObjectType &&
            item.targetObjectId === targetObjectId &&
            item.status === 'open'
    );

    expect(todo).toBeDefined();
    return todo!;
}

export async function expectNoOpenTodoForTarget(
    client: AxiosInstance,
    targetObjectType: string,
    targetObjectId: string
): Promise<void> {
    const todos = await listMyTodos(client);
    const openTodo = todos.find(
        (item) =>
            item.targetObjectType === targetObjectType &&
            item.targetObjectId === targetObjectId &&
            item.status === 'open'
    );

    expect(openTodo).toBeUndefined();
}

export async function getApprovalRecord(
    client: AxiosInstance,
    approvalRecordId: string
): Promise<ApprovalRecordSummary> {
    const response = await client.get<ApprovalRecordSummary>(
        `/approval-records/${approvalRecordId}`
    );
    return expectStatus(response, 200);
}

export async function approveRecord(
    client: AxiosInstance,
    approvalRecordId: string,
    input: ApproveRecordRequest
): Promise<CommandResult> {
    const response = await client.post<CommandResult>(
        `/approval-records/${approvalRecordId}/approve`,
        input
    );
    return expectStatus(response, 200);
}

export async function rejectRecord(
    client: AxiosInstance,
    approvalRecordId: string,
    input: RejectApprovalRecordRequest
): Promise<CommandResult> {
    const response = await client.post<CommandResult>(
        `/approval-records/${approvalRecordId}/reject`,
        input
    );
    return expectStatus(response, 200);
}
