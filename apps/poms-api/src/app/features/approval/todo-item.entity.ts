import { defineEntity } from '@mikro-orm/core';
import {
    BUSINESS_DOMAINS,
    TARGET_OBJECT_TYPES,
    TODO_PRIORITIES,
    TODO_SOURCE_TYPES,
    TODO_STATUSES,
    TODO_TYPES,
    TodoStatusValue,
    type BusinessDomain,
    type TargetObjectType,
    type TodoPriority,
    type TodoSourceType,
    type TodoStatus,
    type TodoType
} from '@poms/shared-contracts';

const p = defineEntity.properties;

const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

export const TodoItemSchema = defineEntity({
    name: 'TodoItem',
    tableName: 'todo_item',
    schema: 'poms',
    comment: 'POMS 第一阶段统一待办表',
    indexes: [
        { name: 'idx_todo_item_assignee_status', properties: ['assigneeUserId', 'status'] },
        { name: 'idx_todo_item_target', properties: ['targetObjectType', 'targetObjectId'] }
    ],
    uniques: [
        {
            name: 'uq_todo_item_open_source',
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.sourceType}", "${columns.sourceId}", "${columns.assigneeUserId}") where "${columns.status}" in (${toSqlStringList([TodoStatusValue.Open, TodoStatusValue.Processing])})`
        }
    ],
    checks: [
        {
            name: 'chk_todo_item_source_type',
            expression: `"source_type" in (${toSqlStringList(TODO_SOURCE_TYPES)})`
        },
        {
            name: 'chk_todo_item_todo_type',
            expression: `"todo_type" in (${toSqlStringList(TODO_TYPES)})`
        },
        {
            name: 'chk_todo_item_business_domain',
            expression: `"business_domain" in (${toSqlStringList(BUSINESS_DOMAINS)})`
        },
        {
            name: 'chk_todo_item_target_object_type',
            expression: `"target_object_type" in (${toSqlStringList(TARGET_OBJECT_TYPES)})`
        },
        {
            name: 'chk_todo_item_status',
            expression: `"status" in (${toSqlStringList(TODO_STATUSES)})`
        },
        {
            name: 'chk_todo_item_priority',
            expression: `"priority" in (${toSqlStringList(TODO_PRIORITIES)})`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        sourceType: p.string().$type<TodoSourceType>().length(64).fieldName('source_type'),
        sourceId: p.uuid().fieldName('source_id'),
        todoType: p.string().$type<TodoType>().length(64).fieldName('todo_type'),
        businessDomain: p.string().$type<BusinessDomain>().length(64).fieldName('business_domain'),
        targetObjectType: p.string().$type<TargetObjectType>().length(64).fieldName('target_object_type'),
        targetObjectId: p.uuid().fieldName('target_object_id'),
        projectId: p.uuid().nullable().fieldName('project_id'),
        title: p.string().length(255),
        summary: p.text().nullable(),
        assigneeUserId: p.uuid().fieldName('assignee_user_id'),
        status: p.string().$type<TodoStatus>().length(32),
        priority: p.string().$type<TodoPriority>().length(16),
        dueAt: p.datetime().nullable().fieldName('due_at'),
        completedAt: p.datetime().nullable().fieldName('completed_at'),
        rowVersion: p.integer().version().default(1).fieldName('row_version'),
        createdAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .fieldName('created_at'),
        updatedAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .onUpdate(() => new Date())
            .fieldName('updated_at')
    }
});

export class TodoItem extends TodoItemSchema.class {}

TodoItemSchema.setClass(TodoItem);
