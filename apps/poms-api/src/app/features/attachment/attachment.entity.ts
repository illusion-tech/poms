import { defineEntity } from '@mikro-orm/core';
import {
    ATTACHMENT_LINK_STATUSES,
    ATTACHMENT_RELATION_TYPES,
    ATTACHMENT_SECURITY_LEVELS,
    ATTACHMENT_STATUSES,
    ATTACHMENT_TARGET_TYPES,
    AttachmentLinkStatusValue,
    AttachmentStatusValue,
    type AttachmentCategory,
    type AttachmentLinkStatus,
    type AttachmentRelationType,
    type AttachmentSecurityLevel,
    type AttachmentStatus,
    type AttachmentTargetType
} from '@poms/shared-contracts';

const p = defineEntity.properties;

const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');

export const AttachmentSchema = defineEntity({
    name: 'Attachment',
    tableName: 'attachment',
    schema: 'poms',
    comment: '统一附件元数据',
    indexes: [
        { name: 'idx_attachment_uploaded_at', properties: ['uploadedAt'] },
        { name: 'idx_attachment_uploaded_by', properties: ['uploadedBy'] },
        { name: 'idx_attachment_category_status', properties: ['category', 'status'] },
        { name: 'idx_attachment_checksum_sha256', properties: ['checksumSha256'] }
    ],
    checks: [
        {
            name: 'chk_attachment_security_level',
            expression: `"security_level" in (${toSqlStringList(ATTACHMENT_SECURITY_LEVELS)})`
        },
        {
            name: 'chk_attachment_status',
            expression: `"status" in (${toSqlStringList(ATTACHMENT_STATUSES)})`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('附件主键'),
        originalName: p.string().length(255).fieldName('original_name').comment('原始文件名'),
        displayName: p.string().length(255).fieldName('display_name').comment('展示名称'),
        extension: p.string().length(32).comment('文件扩展名'),
        mimeType: p.string().length(255).fieldName('mime_type').comment('MIME 类型'),
        sizeBytes: p.integer().fieldName('size_bytes').comment('文件大小，单位字节'),
        checksumSha256: p.string().length(64).fieldName('checksum_sha256').comment('文件 sha256 校验和'),
        category: p.string().$type<AttachmentCategory>().length(64).comment('附件业务分类'),
        securityLevel: p.string().$type<AttachmentSecurityLevel>().length(32).fieldName('security_level').comment('附件安全等级'),
        storageProvider: p.string().length(32).fieldName('storage_provider').comment('存储 provider'),
        storageBucket: p.string().length(255).nullable().fieldName('storage_bucket').comment('存储桶'),
        storageKey: p.string().length(1024).fieldName('storage_key').comment('对象存储 key'),
        status: p.string().$type<AttachmentStatus>().length(32).default(AttachmentStatusValue.Active).comment('附件状态'),
        description: p.text().nullable().comment('附件说明'),
        versionGroupId: p.uuid().nullable().fieldName('version_group_id').comment('版本组标识，一期预留'),
        versionNo: p.integer().default(1).fieldName('version_no').comment('版本号，一期默认 1'),
        isLatest: p.boolean().default(true).fieldName('is_latest').comment('是否最新版本，一期默认 true'),
        isFinal: p.boolean().default(false).fieldName('is_final').comment('是否最终版，一期默认 false'),
        previousAttachmentId: p.uuid().nullable().fieldName('previous_attachment_id').comment('上一版本附件，一期预留'),
        changeNote: p.text().nullable().fieldName('change_note').comment('版本变更说明，一期预留'),
        uploadedBy: p.uuid().nullable().fieldName('uploaded_by').comment('上传人标识'),
        uploadedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('uploaded_at').comment('上传时间'),
        deletedBy: p.uuid().nullable().fieldName('deleted_by').comment('删除/作废操作人标识'),
        deletedAt: p.datetime().nullable().fieldName('deleted_at').comment('删除/作废时间'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        updatedAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .onUpdate(() => new Date())
            .fieldName('updated_at')
            .comment('最后更新时间')
    }
});

export class Attachment extends AttachmentSchema.class {}

AttachmentSchema.setClass(Attachment);

export const AttachmentLinkSchema = defineEntity({
    name: 'AttachmentLink',
    tableName: 'attachment_link',
    schema: 'poms',
    comment: '附件与业务对象挂载关系',
    indexes: [
        {
            name: 'idx_attachment_link_target',
            properties: ['targetType', 'targetId', 'status', 'linkedAt'],
            expression: (columns, table, indexName) =>
                `create index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.targetType}", "${columns.targetId}", "${columns.status}", "${columns.linkedAt}" desc)`
        },
        { name: 'idx_attachment_link_attachment_status', properties: ['attachmentId', 'status'] },
        {
            name: 'uq_attachment_link_active_relation',
            properties: ['attachmentId', 'targetType', 'targetId', 'relationType'],
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.attachmentId}", "${columns.targetType}", "${columns.targetId}", "${columns.relationType}") where "${columns.status}" = '${AttachmentLinkStatusValue.Active}'`
        }
    ],
    checks: [
        {
            name: 'chk_attachment_link_target_type',
            expression: `"target_type" in (${toSqlStringList(ATTACHMENT_TARGET_TYPES)})`
        },
        {
            name: 'chk_attachment_link_relation_type',
            expression: `"relation_type" in (${toSqlStringList(ATTACHMENT_RELATION_TYPES)})`
        },
        {
            name: 'chk_attachment_link_status',
            expression: `"status" in (${toSqlStringList(ATTACHMENT_LINK_STATUSES)})`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('附件关联主键'),
        attachmentId: () =>
            p
                .manyToOne(Attachment)
                .mapToPk()
                .fieldName('attachment_id')
                .foreignKeyName('attachment_link_attachment_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('附件标识'),
        targetType: p.string().$type<AttachmentTargetType>().length(64).fieldName('target_type').comment('业务对象类型'),
        targetId: p.uuid().fieldName('target_id').comment('业务对象标识'),
        relationType: p.string().$type<AttachmentRelationType>().length(32).fieldName('relation_type').comment('关联关系类型'),
        status: p.string().$type<AttachmentLinkStatus>().length(32).default(AttachmentLinkStatusValue.Active).comment('关联状态'),
        linkedBy: p.uuid().nullable().fieldName('linked_by').comment('关联操作人标识'),
        linkedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('linked_at').comment('关联时间'),
        unlinkedBy: p.uuid().nullable().fieldName('unlinked_by').comment('取消关联操作人标识'),
        unlinkedAt: p.datetime().nullable().fieldName('unlinked_at').comment('取消关联时间')
    }
});

export class AttachmentLink extends AttachmentLinkSchema.class {}

AttachmentLinkSchema.setClass(AttachmentLink);
