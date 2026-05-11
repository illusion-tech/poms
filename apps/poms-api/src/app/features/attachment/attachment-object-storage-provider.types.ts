import type { Readable } from 'node:stream';
import type {
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
    testConnection(config: AttachmentStorageProviderRuntimeConfig): Promise<AttachmentStorageProviderConnectionTestResult>;
}
