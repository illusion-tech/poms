import { createHash } from 'node:crypto';
import { AttachmentStorageProviderConnectionTestStatusValue, AttachmentStorageProviderTypeValue } from '@poms/shared-contracts';
import { HuaweiObsS3AttachmentObjectStorageProvider } from './huawei-obs-s3-attachment-object-storage.provider';
import type { AttachmentStorageProviderRuntimeConfig } from './attachment-object-storage-provider.types';

describe('HuaweiObsS3AttachmentObjectStorageProvider', () => {
    let provider: HuaweiObsS3AttachmentObjectStorageProvider;
    let fetchMock: jest.SpiedFunction<typeof fetch>;

    beforeEach(() => {
        provider = new HuaweiObsS3AttachmentObjectStorageProvider();
        fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
    });

    afterEach(() => {
        fetchMock.mockRestore();
    });

    it('sends path-style S3-compatible put requests with SigV4 headers', async () => {
        const body = Buffer.from('hello');

        const location = await provider.putObject(config(), {
            storageKey: 'attachments/2026/需求.pdf',
            body,
            contentType: 'application/pdf'
        });

        const [url, init] = fetchMock.mock.calls[0];
        const headers = init?.headers as Record<string, string>;
        expect(String(url)).toBe('https://obs.cn-south-1.myhuaweicloud.com/poms-prod/attachments/2026/%E9%9C%80%E6%B1%82.pdf');
        expect(init?.method).toBe('PUT');
        expect(headers['authorization']).toContain('AWS4-HMAC-SHA256 Credential=AK/');
        expect(headers['x-amz-content-sha256']).toBe(createHash('sha256').update(body).digest('hex'));
        expect(headers['content-type']).toBe('application/pdf');
        expect(location).toEqual({
            storageProvider: AttachmentStorageProviderTypeValue.HuaweiObsS3,
            storageBucket: 'poms-prod',
            storageKey: 'attachments/2026/需求.pdf'
        });
    });

    it('parses object metadata from head responses', async () => {
        fetchMock.mockResolvedValueOnce(
            new Response(null, {
                status: 200,
                headers: {
                    'content-length': '42',
                    etag: '"etag-value"',
                    'last-modified': 'Mon, 11 May 2026 00:00:00 GMT',
                    'content-type': 'application/pdf'
                }
            })
        );

        const metadata = await provider.headObject(config(), {
            storageProvider: AttachmentStorageProviderTypeValue.HuaweiObsS3,
            storageBucket: 'poms-prod',
            storageKey: 'attachments/file.pdf'
        });

        expect(metadata).toEqual({
            sizeBytes: 42,
            eTag: '"etag-value"',
            lastModified: 'Mon, 11 May 2026 00:00:00 GMT',
            contentType: 'application/pdf'
        });
    });

    it('uses a signed bucket head request for connection tests', async () => {
        const result = await provider.testConnection(config());

        const [url, init] = fetchMock.mock.calls[0];
        expect(String(url)).toBe('https://obs.cn-south-1.myhuaweicloud.com/poms-prod');
        expect(init?.method).toBe('HEAD');
        expect(result.status).toBe(AttachmentStorageProviderConnectionTestStatusValue.Success);
    });

    function config(): AttachmentStorageProviderRuntimeConfig {
        return {
            id: '95000000-0000-4000-8000-000000000001',
            providerType: AttachmentStorageProviderTypeValue.HuaweiObsS3,
            displayName: '华为云 OBS',
            status: 'active',
            enabled: true,
            endpoint: 'https://obs.cn-south-1.myhuaweicloud.com',
            region: 'cn-south-1',
            bucket: 'poms-prod',
            keyPrefix: 'attachments',
            forcePathStyle: true,
            accessKeyId: 'AK',
            secretAccessKey: 'SK'
        };
    }
});
