import { defineEntity } from '@mikro-orm/core';

const p = defineEntity.properties;

export const TodoItemSchema = defineEntity({
    name: 'TodoItem',
    tableName: 'todo_item',
    schema: 'poms',
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        sourceType: p.string().length(64).fieldName('source_type'),
        sourceId: p.uuid().fieldName('source_id'),
        todoType: p.string().length(64).fieldName('todo_type'),
        businessDomain: p.string().length(64).fieldName('business_domain'),
        targetObjectType: p.string().length(64).fieldName('target_object_type'),
        targetObjectId: p.uuid().fieldName('target_object_id'),
        projectId: p.uuid().nullable().fieldName('project_id'),
        title: p.string().length(255),
        summary: p.text().nullable(),
        assigneeUserId: p.uuid().fieldName('assignee_user_id'),
        status: p.string().length(32),
        priority: p.string().length(16),
        dueAt: p.datetime().nullable().fieldName('due_at'),
        completedAt: p.datetime().nullable().fieldName('completed_at'),
        rowVersion: p.integer().version().default(1).fieldName('row_version'),
        createdAt: p
            .datetime()
            .onCreate(() => new Date())
            .fieldName('created_at'),
        updatedAt: p
            .datetime()
            .onCreate(() => new Date())
            .onUpdate(() => new Date())
            .fieldName('updated_at')
    }
});

export class TodoItem extends TodoItemSchema.class {}

TodoItemSchema.setClass(TodoItem);
