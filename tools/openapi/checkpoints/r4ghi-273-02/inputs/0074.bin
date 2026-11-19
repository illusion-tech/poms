import { Injectable, NotFoundException } from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { AttachmentStorageProviderConnectionTestStatusValue, AttachmentStorageProviderTypeValue } from '@poms/shared-contracts';
import type {
    AttachmentObjectLocation,
    AttachmentObjectMetadata,
    AttachmentObjectPutInput,
    AttachmentObjectStorageProvider,
    AttachmentStorageProviderRuntimeConfig,
    StoredAttachmentFile
} from './attachment-object-storage-provider.types';

@Injectable()
export class LocalAttachmentObjectStorageProvider implements AttachmentObjectStorageProvider {
    readonly providerType = AttachmentStorageProviderTypeValue.Local;
    readonly #root = resolve(process.env['POMS_ATTACHMENT_LOCAL_ROOT'] ?? 'storage/attachments');

    async putObject(_config: AttachmentStorageProviderRuntimeConfig, input: AttachmentObjectPutInput): Promise<StoredAttachmentFile> {
        const absolutePath = this.resolveKey(input.storageKey);
        await mkdir(dirname(absolutePath), { recursive: true });
        await writeFile(absolutePath, input.body);

        return {
            storageProvider: this.providerType,
            storageBucket: null,
            storageKey: input.storageKey
        };
    }

    async readObject(_config: AttachmentStorageProviderRuntimeConfig, location: AttachmentObjectLocation) {
        const absolutePath = this.resolveKey(location.storageKey);

        try {
            await stat(absolutePath);
        } catch {
            throw new NotFoundException(`Attachment file ${location.storageKey} not found`);
        }

        return createReadStream(absolutePath);
    }

    async headObject(_config: AttachmentStorageProviderRuntimeConfig, location: AttachmentObjectLocation): Promise<AttachmentObjectMetadata> {
        try {
            const fileStat = await stat(this.resolveKey(location.storageKey));
            return {
                sizeBytes: fileStat.size,
                eTag: null,
                lastModified: fileStat.mtime.toISOString(),
                contentType: null,
                checksumSha256: null
            };
        } catch {
            throw new NotFoundException(`Attachment file ${location.storageKey} not found`);
        }
    }

    async deleteObject(_config: AttachmentStorageProviderRuntimeConfig, location: AttachmentObjectLocation): Promise<void> {
        await unlink(this.resolveKey(location.storageKey));
    }

    async testConnection() {
        const key = `.poms-storage-test-${randomUUID()}`;
        const absolutePath = this.resolveKey(key);

        await mkdir(dirname(absolutePath), { recursive: true });
        await writeFile(absolutePath, Buffer.from('ok'));
        await unlink(absolutePath);

        return {
            status: AttachmentStorageProviderConnectionTestStatusValue.Success,
            message: `Local attachment storage root is writable: ${this.#root}`,
            checkedAt: new Date().toISOString()
        };
    }

    private resolveKey(storageKey: string): string {
        const normalized = storageKey.replace(/\\/g, '/').replace(/^\/+/, '');
        const absolutePath = resolve(this.#root, normalized);

        if (absolutePath !== this.#root && !absolutePath.startsWith(`${this.#root}${sep}`)) {
            throw new Error('Invalid attachment storage key');
        }

        return absolutePath;
    }
}
