import { Attachment } from './attachment.entity';

export type AttachmentPreviewKind = 'image' | 'pdf' | 'unsupported';

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp']);
const IMAGE_MIME_PREFIX = 'image/';

export function getAttachmentPreviewKind(attachment: Attachment): AttachmentPreviewKind {
    const extension = attachment.extension.toLowerCase();
    const mimeType = attachment.mimeType.toLowerCase();

    if (mimeType.startsWith(IMAGE_MIME_PREFIX) && IMAGE_EXTENSIONS.has(extension)) {
        return 'image';
    }

    if (mimeType === 'application/pdf' || extension === 'pdf') {
        return 'pdf';
    }

    return 'unsupported';
}

export function isPreviewSupported(attachment: Attachment): boolean {
    return getAttachmentPreviewKind(attachment) !== 'unsupported';
}

export function isThumbnailAvailable(attachment: Attachment): boolean {
    return getAttachmentPreviewKind(attachment) === 'image';
}

export function buildAttachmentPreviewUrl(attachmentId: string): string {
    return `/api/attachments/${attachmentId}/preview`;
}

export function buildAttachmentThumbnailUrl(attachmentId: string): string {
    return `/api/attachments/${attachmentId}/thumbnail`;
}
