import type { AttachmentLinkSummary, AttachmentSummary } from '@poms/shared-contracts';
import { PlatformUser } from '../platform/platform-user.entity';
import { Attachment, AttachmentLink } from './attachment.entity';
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
