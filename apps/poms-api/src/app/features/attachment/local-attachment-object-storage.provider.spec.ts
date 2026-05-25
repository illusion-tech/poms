import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AttachmentStorageProviderConfigStatusValue, AttachmentStorageProviderConnectionTestStatusValue, AttachmentStorageProviderTypeValue } from '@poms/shared-contracts';
import { LocalAttachmentObjectStorageProvider } from './local-attachment-object-storage.provider';
import type { AttachmentStorageProviderRuntimeConfig } from './attachment-object-storage-provider.types';

describe('LocalAttachmentObjectStorageProvider', () => {
    const previousRoot = process.env['POMS_ATTACHMENT_LOCAL_ROOT'];
    let root: string;
    let provider: LocalAttachmentObjectStorageProvider;

    beforeEach(async () => {
        root = await mkdtemp(join(tmpdir(), 'poms-local-storage-'));
        process.env['POMS_ATTACHMENT_LOCAL_ROOT'] = root;
        provider = new LocalAttachmentObjectStorageProvider();
    });

    afterEach(async () => {
        if (previousRoot === undefined) {
            delete process.env['POMS_ATTACHMENT_LOCAL_ROOT'];
        } else {
            process.env['POMS_ATTACHMENT_LOCAL_ROOT'] = previousRoot;
        }
        await rm(root, { recursive: true, force: true });
    });

    it('writes, heads, reads and deletes local objects under the configured root', async () => {
        const location = await provider.putObject(localConfig(), {
            storageKey: 'attachments/2026/file.txt',
            body: Buffer.from('hello')
        });

        expect(location).toEqual({
            storageProvider: AttachmentStorageProviderTypeValue.Local,
            storageBucket: null,
            storageKey: 'attachments/2026/file.txt'
        });
        await expect(provider.headObject(localConfig(), location)).resolves.toMatchObject({
            sizeBytes: 5
        });
        const stream = await provider.readObject(localConfig(), location);
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        expect(Buffer.concat(chunks).toString('utf8')).toBe('hello');
        await provider.deleteObject(localConfig(), location);
        await expect(provider.headObject(localConfig(), location)).rejects.toThrow(`Attachment file ${location.storageKey} not found`);
    });

    it('rejects path traversal outside the configured root', async () => {
        await expect(
            provider.putObject(localConfig(), {
                storageKey: '../outside.txt',
                body: Buffer.from('bad')
            })
        ).rejects.toThrow('Invalid attachment storage key');
    });

    it('tests local root writability without leaving a persistent object', async () => {
        const result = await provider.testConnection(localConfig());

        expect(result.status).toBe(AttachmentStorageProviderConnectionTestStatusValue.Success);
    });

    function localConfig(): AttachmentStorageProviderRuntimeConfig {
        return {
            id: null,
            providerType: AttachmentStorageProviderTypeValue.Local,
            displayName: 'Local',
            status: AttachmentStorageProviderConfigStatusValue.Active,
            enabled: true,
            endpoint: null,
            region: null,
            bucket: null,
            keyPrefix: null,
            forcePathStyle: false,
            accessKeyId: null,
            secretAccessKey: null
        };
    }
});
