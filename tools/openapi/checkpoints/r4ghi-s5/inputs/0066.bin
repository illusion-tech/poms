import { defineEntity } from '@mikro-orm/core';
import {
    ATTACHMENT_LINK_STATUSES,
    ATTACHMENT_RELATION_TYPES,
    ATTACHMENT_SECURITY_LEVELS,
    ATTACHMENT_STATUSES,
    ATTACHMENT_TARGET_TYPES,
    ATTACHMENT_DOWNLOAD_PACKAGE_ITEM_STATUSES,
    ATTACHMENT_DOWNLOAD_PACKAGE_STATUSES,
    AttachmentLinkStatusValue,
    AttachmentDownloadPackageStatusValue,
    AttachmentStatusValue,
    PROJECT_HANDOVER_ATTACHMENT_CHECKLIST_ITEM_STATUSES,
    type AttachmentCategory,
    type AttachmentDownloadPackageItemStatus,
    type AttachmentDownloadPackageManifestSummary,
    type AttachmentDownloadPackageStatus,
    type AttachmentLinkStatus,
    type AttachmentRelationType,
    type AttachmentSecurityLevel,
    type AttachmentStatus,
    type AttachmentTargetType,
    type ProjectHandoverAttachmentChecklistItemStatus,
    type ProjectHandoverAttachmentSourceRef
} from '@poms/shared-contracts';
import { ProjectHandover } from '../project-handover/project-handover.entity';
import { Project } from '../project/project.entity';

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
        { name: 'idx_attachment_checksum_sha256', properties: ['checksumSha256'] },
        { name: 'idx_attachment_version_group_uploaded_at', properties: ['versionGroupId', 'uploadedAt'] },
        {
            name: 'uq_attachment_version_no',
            properties: ['versionGroupId', 'versionNo'],
            expression: (columns, table, indexName) => `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.versionGroupId}", "${columns.versionNo}")`
        },
        {
            name: 'uq_attachment_latest_active',
            properties: ['versionGroupId'],
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.versionGroupId}") where "status" = '${AttachmentStatusValue.Active}' and "is_latest" = true`
        },
        {
            name: 'uq_attachment_final_active',
            properties: ['versionGroupId'],
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.versionGroupId}") where "status" = '${AttachmentStatusValue.Active}' and "is_final" = true`
        }
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
        versionGroupId: p.uuid().fieldName('version_group_id').comment('版本组标识'),
        versionNo: p.integer().default(1).fieldName('version_no').comment('版本号'),
        isLatest: p.boolean().default(true).fieldName('is_latest').comment('是否最新版本'),
        isFinal: p.boolean().default(false).fieldName('is_final').comment('是否最终版'),
        previousAttachmentId: p.uuid().nullable().fieldName('previous_attachment_id').comment('上一版本附件'),
        changeNote: p.text().nullable().fieldName('change_note').comment('版本变更说明'),
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

export const ProjectHandoverAttachmentSelectionSchema = defineEntity({
    name: 'ProjectHandoverAttachmentSelection',
    tableName: 'project_handover_attachment_selection',
    schema: 'poms',
    comment: '项目移交附件清单选择项',
    indexes: [
        { name: 'idx_phas_handover_status', properties: ['handoverId', 'status'] },
        { name: 'idx_phas_project_handover', properties: ['projectId', 'handoverId'] },
        { name: 'idx_phas_attachment', properties: ['attachmentId'] },
        {
            name: 'uq_phas_handover_version_group',
            properties: ['handoverId', 'versionGroupId'],
            expression: (columns, table, indexName) =>
                `create unique index "${indexName}" on "${table.schema}"."${table.name}" ("${columns.handoverId}", "${columns.versionGroupId}") where "${columns.versionGroupId}" is not null`
        }
    ],
    checks: [
        {
            name: 'chk_phas_status',
            expression: `"status" in (${toSqlStringList(PROJECT_HANDOVER_ATTACHMENT_CHECKLIST_ITEM_STATUSES)})`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('清单选择项主键'),
        handoverId: () =>
            p
                .manyToOne(ProjectHandover)
                .mapToPk()
                .fieldName('handover_id')
                .foreignKeyName('project_handover_attachment_selection_handover_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade')
                .comment('项目移交记录 ID'),
        projectId: () =>
            p
                .manyToOne(Project)
                .mapToPk()
                .fieldName('project_id')
                .foreignKeyName('project_handover_attachment_selection_project_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('项目 ID'),
        attachmentId: () =>
            p
                .manyToOne(Attachment)
                .mapToPk()
                .nullable()
                .fieldName('attachment_id')
                .foreignKeyName('project_handover_attachment_selection_attachment_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('选中的附件版本 ID'),
        versionGroupId: p.uuid().nullable().fieldName('version_group_id').comment('附件版本组 ID'),
        displayName: p.string().length(255).fieldName('display_name').comment('清单展示名'),
        category: p.string().$type<AttachmentCategory>().length(64).nullable().comment('附件分类'),
        securityLevel: p.string().$type<AttachmentSecurityLevel>().length(32).nullable().fieldName('security_level').comment('附件安全等级'),
        status: p.string().$type<ProjectHandoverAttachmentChecklistItemStatus>().length(32).comment('清单状态'),
        selectionReason: p.string().length(64).nullable().fieldName('selection_reason').comment('版本选择原因'),
        exclusionReason: p.text().nullable().fieldName('exclusion_reason').comment('排除原因'),
        sourceRefs: p.json<ProjectHandoverAttachmentSourceRef[]>().fieldName('source_refs').comment('来源引用'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号')
    }
});

export class ProjectHandoverAttachmentSelection extends ProjectHandoverAttachmentSelectionSchema.class {}

ProjectHandoverAttachmentSelectionSchema.setClass(ProjectHandoverAttachmentSelection);

export const AttachmentDownloadPackageSchema = defineEntity({
    name: 'AttachmentDownloadPackage',
    tableName: 'attachment_download_package',
    schema: 'poms',
    comment: '附件批量下载包',
    indexes: [
        { name: 'idx_adp_handover_status', properties: ['handoverId', 'status'] },
        { name: 'idx_adp_project_created', properties: ['projectId', 'createdAt'] },
        { name: 'idx_adp_expires_at', properties: ['expiresAt'] }
    ],
    checks: [
        {
            name: 'chk_adp_status',
            expression: `"status" in (${toSqlStringList(ATTACHMENT_DOWNLOAD_PACKAGE_STATUSES)})`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('下载包主键'),
        handoverId: () =>
            p
                .manyToOne(ProjectHandover)
                .mapToPk()
                .fieldName('handover_id')
                .foreignKeyName('attachment_download_package_handover_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade')
                .comment('项目移交记录 ID'),
        projectId: () =>
            p
                .manyToOne(Project)
                .mapToPk()
                .fieldName('project_id')
                .foreignKeyName('attachment_download_package_project_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('项目 ID'),
        status: p.string().$type<AttachmentDownloadPackageStatus>().length(32).default(AttachmentDownloadPackageStatusValue.Pending).comment('下载包状态'),
        manifestSummary: p.json<AttachmentDownloadPackageManifestSummary>().fieldName('manifest_summary').comment('manifest 摘要'),
        storageProvider: p.string().length(32).nullable().fieldName('storage_provider').comment('存储 provider'),
        storageBucket: p.string().length(255).nullable().fieldName('storage_bucket').comment('存储桶'),
        storageKey: p.string().length(1024).nullable().fieldName('storage_key').comment('内部存储 key'),
        fileName: p.string().length(255).nullable().fieldName('file_name').comment('下载文件名'),
        expiresAt: p.datetime().fieldName('expires_at').comment('过期时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        downloadedAt: p.datetime().nullable().fieldName('downloaded_at').comment('最近下载时间'),
        downloadCount: p.integer().default(0).fieldName('download_count').comment('下载次数'),
        failedReason: p.text().nullable().fieldName('failed_reason').comment('失败原因'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号')
    }
});

export class AttachmentDownloadPackage extends AttachmentDownloadPackageSchema.class {}

AttachmentDownloadPackageSchema.setClass(AttachmentDownloadPackage);

export const AttachmentDownloadPackageItemSchema = defineEntity({
    name: 'AttachmentDownloadPackageItem',
    tableName: 'attachment_download_package_item',
    schema: 'poms',
    comment: '附件批量下载包明细',
    indexes: [
        { name: 'idx_adpi_package', properties: ['packageId'] },
        { name: 'idx_adpi_handover_attachment', properties: ['handoverId', 'attachmentId'] }
    ],
    checks: [
        {
            name: 'chk_adpi_status',
            expression: `"status" in (${toSqlStringList(ATTACHMENT_DOWNLOAD_PACKAGE_ITEM_STATUSES)})`
        }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('下载包明细主键'),
        packageId: () =>
            p
                .manyToOne(AttachmentDownloadPackage)
                .mapToPk()
                .fieldName('package_id')
                .foreignKeyName('attachment_download_package_item_package_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade')
                .comment('下载包 ID'),
        handoverId: () =>
            p
                .manyToOne(ProjectHandover)
                .mapToPk()
                .fieldName('handover_id')
                .foreignKeyName('attachment_download_package_item_handover_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade')
                .comment('项目移交记录 ID'),
        attachmentId: () =>
            p
                .manyToOne(Attachment)
                .mapToPk()
                .nullable()
                .fieldName('attachment_id')
                .foreignKeyName('attachment_download_package_item_attachment_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('附件版本 ID'),
        versionGroupId: p.uuid().nullable().fieldName('version_group_id').comment('附件版本组 ID'),
        status: p.string().$type<AttachmentDownloadPackageItemStatus>().length(32).comment('明细状态'),
        sourceRefs: p.json<ProjectHandoverAttachmentSourceRef[]>().fieldName('source_refs').comment('来源引用'),
        fileName: p.string().length(255).nullable().fieldName('file_name').comment('包内文件名'),
        exclusionReason: p.text().nullable().fieldName('exclusion_reason').comment('排除原因'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间')
    }
});

export class AttachmentDownloadPackageItem extends AttachmentDownloadPackageItemSchema.class {}

AttachmentDownloadPackageItemSchema.setClass(AttachmentDownloadPackageItem);
