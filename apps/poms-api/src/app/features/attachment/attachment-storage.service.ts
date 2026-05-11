import { Injectable } from '@nestjs/common';
import { extname, join } from 'node:path';
import type { Readable } from 'node:stream';
import { AttachmentStorageProviderTypeValue } from '@poms/shared-contracts';
import { AttachmentStorageProviderRegistry } from './attachment-storage-provider-registry.service';
import type { AttachmentObjectLocation, StoredAttachmentFile } from './attachment-object-storage-provider.types';

@Injectable()
export class AttachmentStorageService {
    constructor(private readonly storageProviderRegistry: AttachmentStorageProviderRegistry) {}

    async saveOriginal(input: { attachmentId: string; originalName: string; buffer: Buffer; uploadedAt?: Date }): Promise<StoredAttachmentFile> {
        const uploadedAt = input.uploadedAt ?? new Date();
        const extension = extname(input.originalName).toLowerCase() || '.bin';
        const yyyy = String(uploadedAt.getUTCFullYear());
        const mm = String(uploadedAt.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(uploadedAt.getUTCDate()).padStart(2, '0');
        return this.storageProviderRegistry.putWithDefaultProvider({
            storageKey: join('attachments', yyyy, mm, dd, input.attachmentId, `original${extension}`).replace(/\\/g, '/'),
            body: input.buffer
        });
    }

    async openReadStream(location: AttachmentObjectLocation | string): Promise<Readable> {
        return this.storageProviderRegistry.readObject(this.normalizeLocation(location));
    }

    async readBuffer(location: AttachmentObjectLocation | string): Promise<Buffer> {
        return this.storageProviderRegistry.readBuffer(this.normalizeLocation(location));
    }

    async saveDownloadPackage(input: { packageId: string; fileName: string; buffer: Buffer; createdAt?: Date }): Promise<StoredAttachmentFile> {
        const createdAt = input.createdAt ?? new Date();
        const yyyy = String(createdAt.getUTCFullYear());
        const mm = String(createdAt.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(createdAt.getUTCDate()).padStart(2, '0');
        const safeFileName = input.fileName.replace(/[\\/:*?"<>|]+/g, '_') || `${input.packageId}.zip`;
        return this.storageProviderRegistry.putWithDefaultProvider({
            storageKey: join('attachment-download-packages', yyyy, mm, dd, input.packageId, safeFileName).replace(/\\/g, '/'),
            body: input.buffer,
            contentType: 'application/zip'
        });
    }

    async remove(location: AttachmentObjectLocation | string): Promise<void> {
        try {
            await this.storageProviderRegistry.deleteObject(this.normalizeLocation(location));
        } catch {
            // Best-effort cleanup only. DB state remains authoritative.
        }
    }

    private normalizeLocation(location: AttachmentObjectLocation | string): AttachmentObjectLocation {
        if (typeof location !== 'string') {
            return location;
        }

        return {
            storageProvider: AttachmentStorageProviderTypeValue.Local,
            storageBucket: null,
            storageKey: location
        };
    }
}
