import type { Readable } from 'node:stream';
import type {
    AttachmentUploadMode,
    AttachmentStorageProviderConfigStatus,
    AttachmentStorageProviderConnectionTestResult,
    AttachmentStorageProviderType
} from '@poms/shared-contracts';

export interface StoredAttachmentFile {
    storageProvider: AttachmentStorageProviderType;
    storageBucket: string | null;
    storageKey: string;
}

export interface AttachmentObjectLocation {
    storageProvider: AttachmentStorageProviderType;
    storageBucket: string | null;
    storageKey: string;
}

export interface AttachmentObjectPutInput {
    storageKey: string;
    body: Buffer;
    contentType?: string | null;
}

export interface AttachmentObjectMetadata {
    sizeBytes: number;
    eTag: string | null;
    lastModified: string | null;
    contentType: string | null;
    checksumSha256: string | null;
}

export interface AttachmentObjectUploadPlan extends AttachmentObjectLocation {
    uploadMode: AttachmentUploadMode;
}

export interface AttachmentPresignedPutTarget {
    method: 'PUT';
    url: string;
    headers: Record<string, string>;
    expiresAt: string;
}

export interface AttachmentStorageProviderRuntimeConfig {
    id: string | null;
    providerType: AttachmentStorageProviderType;
    displayName: string;
    status: AttachmentStorageProviderConfigStatus;
    enabled: boolean;
    endpoint: string | null;
    region: string | null;
    bucket: string | null;
    keyPrefix: string | null;
    forcePathStyle: boolean;
    accessKeyId: string | null;
    secretAccessKey: string | null;
}

export interface AttachmentObjectStorageProvider {
    readonly providerType: AttachmentStorageProviderType;
    putObject(config: AttachmentStorageProviderRuntimeConfig, input: AttachmentObjectPutInput): Promise<StoredAttachmentFile>;
    readObject(config: AttachmentStorageProviderRuntimeConfig, location: AttachmentObjectLocation): Promise<Readable>;
    headObject(config: AttachmentStorageProviderRuntimeConfig, location: AttachmentObjectLocation): Promise<AttachmentObjectMetadata>;
    deleteObject(config: AttachmentStorageProviderRuntimeConfig, location: AttachmentObjectLocation): Promise<void>;
    createPresignedPutTarget?(
        config: AttachmentStorageProviderRuntimeConfig,
        location: AttachmentObjectLocation,
        input: { contentType?: string | null; checksumSha256?: string | null; expiresAt: Date }
    ): Promise<AttachmentPresignedPutTarget>;
    testConnection(config: AttachmentStorageProviderRuntimeConfig): Promise<AttachmentStorageProviderConnectionTestResult>;
}
