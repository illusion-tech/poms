import { defineEntity } from '@mikro-orm/core';
import {
    ATTACHMENT_RELATION_TYPES,
    ATTACHMENT_SECURITY_LEVELS,
    ATTACHMENT_STORAGE_PROVIDER_TYPES,
    ATTACHMENT_TARGET_TYPES,
    ATTACHMENT_UPLOAD_MODES,
    ATTACHMENT_UPLOAD_SESSION_OPERATION_TYPES,
    ATTACHMENT_UPLOAD_SESSION_STATUSES,
    type AttachmentCategory,
    type AttachmentRelationType,
    type AttachmentSecurityLevel,
    type AttachmentStorageProviderType,
    type AttachmentTargetType,
    type AttachmentUploadMode,
    type AttachmentUploadSessionOperationType,
    type AttachmentUploadSessionStatus
} from '@poms/shared-contracts';
import { Attachment } from './attachment.entity';

const p = defineEntity.properties;

const toSqlStringList = (values: readonly string[]): string => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');
const toSqlVarcharArray = (values: readonly string[]): string => `array[${values.map((value) => `'${value.replaceAll("'", "''")}'::character varying`).join(', ')}]`;

export const AttachmentUploadSessionSchema = defineEntity({
    name: 'AttachmentUploadSession',
    tableName: 'attachment_upload_session',
    schema: 'poms',
    comment: '附件上传会话',
    indexes: [
        { name: 'idx_attachment_upload_session_status_expires', properties: ['status', 'expiresAt'] },
        { name: 'idx_attachment_upload_session_created_by', properties: ['createdBy', 'createdAt'] },
        { name: 'idx_attachment_upload_session_target', properties: ['targetType', 'targetId', 'status'] },
        { name: 'idx_attachment_upload_session_base_attachment', properties: ['baseAttachmentId'] },
        { name: 'idx_attachment_upload_session_completed_attachment', properties: ['completedAttachmentId'] }
    ],
    checks: [
        { name: 'chk_attachment_upload_session_operation_type', expression: `"operation_type" in (${toSqlStringList(ATTACHMENT_UPLOAD_SESSION_OPERATION_TYPES)})` },
        { name: 'chk_attachment_upload_session_status', expression: `"status" in (${toSqlStringList(ATTACHMENT_UPLOAD_SESSION_STATUSES)})` },
        { name: 'chk_attachment_upload_session_upload_mode', expression: `"upload_mode" in (${toSqlStringList(ATTACHMENT_UPLOAD_MODES)})` },
        { name: 'chk_attachment_upload_session_provider_type', expression: `"provider_type" in (${toSqlStringList(ATTACHMENT_STORAGE_PROVIDER_TYPES)})` },
        { name: 'chk_attachment_upload_session_target_type', expression: `"target_type" is null or "target_type" = any (${toSqlVarcharArray(ATTACHMENT_TARGET_TYPES)})` },
        { name: 'chk_attachment_upload_session_security_level', expression: `"security_level" is null or "security_level" = any (${toSqlVarcharArray(ATTACHMENT_SECURITY_LEVELS)})` },
        { name: 'chk_attachment_upload_session_relation_type', expression: `"relation_type" is null or "relation_type" = any (${toSqlVarcharArray(ATTACHMENT_RELATION_TYPES)})` }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('上传会话主键'),
        operationType: p.string().$type<AttachmentUploadSessionOperationType>().length(32).fieldName('operation_type').comment('上传意图'),
        status: p.string().$type<AttachmentUploadSessionStatus>().length(32).comment('上传会话状态'),
        uploadMode: p.string().$type<AttachmentUploadMode>().length(32).fieldName('upload_mode').comment('上传方式'),
        providerType: p.string().$type<AttachmentStorageProviderType>().length(32).fieldName('provider_type').comment('冻结的存储 provider'),
        storageBucket: p.string().length(255).nullable().fieldName('storage_bucket').comment('冻结的存储桶'),
        storageKey: p.string().length(1024).fieldName('storage_key').comment('冻结的对象 key'),
        targetType: p.string().$type<AttachmentTargetType>().length(64).nullable().fieldName('target_type').comment('业务对象类型'),
        targetId: p.uuid().nullable().fieldName('target_id').comment('业务对象标识'),
        baseAttachmentId: () =>
            p
                .manyToOne(Attachment)
                .mapToPk()
                .nullable()
                .fieldName('base_attachment_id')
                .foreignKeyName('attachment_upload_session_base_attachment_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('新版本上传的基准附件'),
        completedAttachmentId: () =>
            p
                .manyToOne(Attachment)
                .mapToPk()
                .nullable()
                .fieldName('completed_attachment_id')
                .foreignKeyName('attachment_upload_session_completed_attachment_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('完成后创建的附件版本'),
        originalName: p.string().length(255).fieldName('original_name').comment('原始文件名'),
        displayName: p.string().length(255).fieldName('display_name').comment('展示名称'),
        extension: p.string().length(32).comment('文件扩展名'),
        mimeType: p.string().length(255).fieldName('mime_type').comment('MIME 类型'),
        sizeBytes: p.integer().fieldName('size_bytes').comment('声明文件大小，单位字节'),
        checksumSha256: p.string().length(64).nullable().fieldName('checksum_sha256').comment('客户端声明的 sha256 校验和'),
        category: p.string().$type<AttachmentCategory>().length(64).nullable().comment('附件业务分类'),
        securityLevel: p.string().$type<AttachmentSecurityLevel>().length(32).nullable().fieldName('security_level').comment('附件安全等级'),
        relationType: p.string().$type<AttachmentRelationType>().length(32).nullable().fieldName('relation_type').comment('附件关联类型'),
        description: p.text().nullable().comment('附件说明'),
        changeNote: p.text().nullable().fieldName('change_note').comment('版本变更说明'),
        expiresAt: p.datetime().fieldName('expires_at').comment('会话过期时间'),
        uploadedAt: p.datetime().nullable().fieldName('uploaded_at').comment('对象上传完成时间'),
        completedAt: p.datetime().nullable().fieldName('completed_at').comment('会话完成时间'),
        abortedAt: p.datetime().nullable().fieldName('aborted_at').comment('会话中止时间'),
        failedReason: p.text().nullable().fieldName('failed_reason').comment('失败或中止原因'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .onUpdate(() => new Date())
            .fieldName('updated_at')
            .comment('最后更新时间')
    }
});

export class AttachmentUploadSession extends AttachmentUploadSessionSchema.class {}

AttachmentUploadSessionSchema.setClass(AttachmentUploadSession);
