import type { AttachmentLinkSummary, AttachmentSummary, AttachmentUploadSessionSummary } from '@poms/shared-contracts';
import { PlatformUser } from '../platform/platform-user.entity';
import { Attachment, AttachmentLink } from './attachment.entity';
import { AttachmentUploadSession } from './attachment-upload-session.entity';
import { buildAttachmentPreviewUrl, buildAttachmentThumbnailUrl, isPreviewSupported, isThumbnailAvailable } from './attachment-preview.util';

export function mapAttachmentLinkToSummary(link: AttachmentLink): AttachmentLinkSummary {
    return {
        id: link.id,
        attachmentId: link.attachmentId,
        targetType: link.targetType,
        targetId: link.targetId,
        relationType: link.relationType,
        status: link.status,
        linkedBy: link.linkedBy ?? null,
        linkedAt: link.linkedAt.toISOString(),
        unlinkedBy: link.unlinkedBy ?? null,
        unlinkedAt: link.unlinkedAt?.toISOString() ?? null
    };
}

export function mapAttachmentToSummary(
    attachment: Attachment,
    links: AttachmentLink[] = [],
    context: {
        uploadedBy?: PlatformUser | null;
    } = {}
): AttachmentSummary {
    return {
        id: attachment.id,
        originalName: attachment.originalName,
        displayName: attachment.displayName,
        extension: attachment.extension,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        checksumSha256: attachment.checksumSha256,
        category: attachment.category,
        securityLevel: attachment.securityLevel,
        status: attachment.status,
        description: attachment.description ?? null,
        previousAttachmentId: attachment.previousAttachmentId ?? null,
        changeNote: attachment.changeNote ?? null,
        versionGroupId: attachment.versionGroupId ?? attachment.id,
        versionNo: attachment.versionNo,
        isLatest: attachment.isLatest,
        isFinal: attachment.isFinal,
        previewSupported: isPreviewSupported(attachment),
        previewMimeType: isPreviewSupported(attachment) ? attachment.mimeType : null,
        previewUrl: isPreviewSupported(attachment) ? buildAttachmentPreviewUrl(attachment.id) : null,
        thumbnailAvailable: isThumbnailAvailable(attachment),
        thumbnailUrl: isThumbnailAvailable(attachment) ? buildAttachmentThumbnailUrl(attachment.id) : null,
        uploadedBy: attachment.uploadedBy ?? null,
        uploadedByName: context.uploadedBy?.displayName ?? context.uploadedBy?.username ?? null,
        uploadedAt: attachment.uploadedAt.toISOString(),
        updatedAt: attachment.updatedAt.toISOString(),
        deletedAt: attachment.deletedAt?.toISOString() ?? null,
        links: links.map(mapAttachmentLinkToSummary)
    };
}

export function mapAttachmentUploadSessionToSummary(session: AttachmentUploadSession): AttachmentUploadSessionSummary {
    return {
        id: session.id,
        operationType: session.operationType,
        status: session.status,
        uploadMode: session.uploadMode,
        providerType: session.providerType,
        targetType: session.targetType ?? null,
        targetId: session.targetId ?? null,
        baseAttachmentId: session.baseAttachmentId ?? null,
        completedAttachmentId: session.completedAttachmentId ?? null,
        originalName: session.originalName,
        displayName: session.displayName,
        extension: session.extension,
        mimeType: session.mimeType,
        sizeBytes: session.sizeBytes,
        maxSizeBytes: session.maxSizeBytes,
        checksumSha256: session.checksumSha256 ?? null,
        category: session.category ?? null,
        securityLevel: session.securityLevel ?? null,
        relationType: session.relationType ?? null,
        description: session.description ?? null,
        changeNote: session.changeNote ?? null,
        expiresAt: session.expiresAt.toISOString(),
        uploadedAt: session.uploadedAt?.toISOString() ?? null,
        completedAt: session.completedAt?.toISOString() ?? null,
        abortedAt: session.abortedAt?.toISOString() ?? null,
        failedReason: session.failedReason ?? null,
        rowVersion: session.rowVersion,
        createdAt: session.createdAt.toISOString(),
        createdBy: session.createdBy ?? null,
        updatedAt: session.updatedAt.toISOString()
    };
}
