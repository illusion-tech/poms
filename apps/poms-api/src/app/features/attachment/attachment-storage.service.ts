import { Injectable, NotFoundException } from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import type { Readable } from 'node:stream';

export interface StoredAttachmentFile {
    storageProvider: 'local';
    storageBucket: string | null;
    storageKey: string;
}

@Injectable()
export class AttachmentStorageService {
    readonly #root = resolve(process.env['POMS_ATTACHMENT_LOCAL_ROOT'] ?? 'storage/attachments');

    async saveOriginal(input: { attachmentId: string; originalName: string; buffer: Buffer; uploadedAt?: Date }): Promise<StoredAttachmentFile> {
        const uploadedAt = input.uploadedAt ?? new Date();
        const extension = extname(input.originalName).toLowerCase() || '.bin';
        const yyyy = String(uploadedAt.getUTCFullYear());
        const mm = String(uploadedAt.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(uploadedAt.getUTCDate()).padStart(2, '0');
        const storageKey = join('attachments', yyyy, mm, dd, input.attachmentId, `original${extension}`).replace(/\\/g, '/');
        const absolutePath = this.resolveKey(storageKey);

        await mkdir(dirname(absolutePath), { recursive: true });
        await writeFile(absolutePath, input.buffer);

        return {
            storageProvider: 'local',
            storageBucket: null,
            storageKey
        };
    }

    async openReadStream(storageKey: string): Promise<Readable> {
        const absolutePath = this.resolveKey(storageKey);

        try {
            await stat(absolutePath);
        } catch {
            throw new NotFoundException(`Attachment file ${storageKey} not found`);
        }

        return createReadStream(absolutePath);
    }

    async remove(storageKey: string): Promise<void> {
        try {
            await unlink(this.resolveKey(storageKey));
        } catch {
            // Best-effort cleanup only. DB state remains authoritative.
        }
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
