import { AttachmentStorageProviderType } from '@poms/admin-data-access';

interface AttachmentStorageProviderPresentation {
    label: string;
    shortLabel: string;
    icon: string;
    description: string;
}

const ATTACHMENT_STORAGE_PROVIDER_PRESENTATION: Record<AttachmentStorageProviderType, AttachmentStorageProviderPresentation> = {
    [AttachmentStorageProviderType.Local]: {
        label: '本地存储',
        shortLabel: 'Local',
        icon: 'pi pi-database',
        description: '通过 POMS 后端代理读写本地附件目录，适合作为默认兜底存储。'
    },
    [AttachmentStorageProviderType.HuaweiObsS3]: {
        label: '华为云 OBS',
        shortLabel: 'OBS',
        icon: 'pi pi-cloud',
        description: '使用 OBS S3-compatible endpoint 与短期上传目标，适合生产对象存储。'
    }
};

export function attachmentStorageProviderLabel(providerType: AttachmentStorageProviderType): string {
    return ATTACHMENT_STORAGE_PROVIDER_PRESENTATION[providerType]?.label ?? providerType;
}

export function attachmentStorageProviderShortLabel(providerType: AttachmentStorageProviderType): string {
    return ATTACHMENT_STORAGE_PROVIDER_PRESENTATION[providerType]?.shortLabel ?? providerType;
}

export function attachmentStorageProviderIcon(providerType: AttachmentStorageProviderType): string {
    return ATTACHMENT_STORAGE_PROVIDER_PRESENTATION[providerType]?.icon ?? 'pi pi-box';
}

export function attachmentStorageProviderDescription(providerType: AttachmentStorageProviderType): string {
    return ATTACHMENT_STORAGE_PROVIDER_PRESENTATION[providerType]?.description ?? '附件对象存储 provider。';
}
