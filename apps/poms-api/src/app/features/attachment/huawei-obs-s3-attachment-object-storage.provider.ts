import { BadGatewayException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, createHmac } from 'node:crypto';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { AttachmentStorageProviderConnectionTestStatusValue, AttachmentStorageProviderTypeValue } from '@poms/shared-contracts';
import type {
    AttachmentObjectLocation,
    AttachmentObjectMetadata,
    AttachmentObjectPutInput,
    AttachmentObjectStorageProvider,
    AttachmentPresignedPutTarget,
    AttachmentStorageProviderRuntimeConfig,
    StoredAttachmentFile
} from './attachment-object-storage-provider.types';

interface SignedRequestInput {
    config: AttachmentStorageProviderRuntimeConfig;
    method: 'DELETE' | 'GET' | 'HEAD' | 'PUT';
    key: string | null;
    body?: Buffer;
    contentType?: string | null;
}

@Injectable()
export class HuaweiObsS3AttachmentObjectStorageProvider implements AttachmentObjectStorageProvider {
    readonly providerType = AttachmentStorageProviderTypeValue.HuaweiObsS3;

    async putObject(config: AttachmentStorageProviderRuntimeConfig, input: AttachmentObjectPutInput): Promise<StoredAttachmentFile> {
        await this.sendSignedRequest({
            config,
            method: 'PUT',
            key: input.storageKey,
            body: input.body,
            contentType: input.contentType ?? 'application/octet-stream'
        });

        return {
            storageProvider: this.providerType,
            storageBucket: this.requireBucket(config),
            storageKey: input.storageKey
        };
    }

    async readObject(config: AttachmentStorageProviderRuntimeConfig, location: AttachmentObjectLocation) {
        const response = await this.sendSignedRequest({
            config,
            method: 'GET',
            key: location.storageKey
        });

        if (!response.body) {
            throw new BadGatewayException('Attachment storage provider returned an empty object stream.');
        }

        return Readable.fromWeb(response.body as WebReadableStream<Uint8Array>);
    }

    async headObject(config: AttachmentStorageProviderRuntimeConfig, location: AttachmentObjectLocation): Promise<AttachmentObjectMetadata> {
        const response = await this.sendSignedRequest({
            config,
            method: 'HEAD',
            key: location.storageKey
        });

        const sizeBytes = Number(response.headers.get('content-length') ?? 0);
        return {
            sizeBytes: Number.isFinite(sizeBytes) ? sizeBytes : 0,
            eTag: response.headers.get('etag'),
            lastModified: response.headers.get('last-modified'),
            contentType: response.headers.get('content-type')
        };
    }

    async deleteObject(config: AttachmentStorageProviderRuntimeConfig, location: AttachmentObjectLocation): Promise<void> {
        await this.sendSignedRequest({
            config,
            method: 'DELETE',
            key: location.storageKey
        });
    }

    async createPresignedPutTarget(
        config: AttachmentStorageProviderRuntimeConfig,
        location: AttachmentObjectLocation,
        input: { contentType?: string | null; expiresAt: Date }
    ): Promise<AttachmentPresignedPutTarget> {
        const url = this.buildObjectUrl(config, location.storageKey);
        const now = new Date();
        const amzDate = this.toAmzDate(now);
        const dateStamp = amzDate.slice(0, 8);
        const credentialScope = `${dateStamp}/${this.requireRegion(config)}/s3/aws4_request`;
        const expiresInSeconds = Math.max(1, Math.min(3600, Math.floor((input.expiresAt.getTime() - now.getTime()) / 1000)));
        const signedHeaders = 'host';

        url.searchParams.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256');
        url.searchParams.set('X-Amz-Credential', `${this.requireAccessKeyId(config)}/${credentialScope}`);
        url.searchParams.set('X-Amz-Date', amzDate);
        url.searchParams.set('X-Amz-Expires', String(expiresInSeconds));
        url.searchParams.set('X-Amz-SignedHeaders', signedHeaders);

        const canonicalHeaders = `host:${url.host}\n`;
        const canonicalRequest = ['PUT', url.pathname || '/', this.canonicalQueryString(url.searchParams), canonicalHeaders, signedHeaders, 'UNSIGNED-PAYLOAD'].join('\n');
        const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, createHash('sha256').update(canonicalRequest).digest('hex')].join('\n');
        const signingKey = this.signingKey(this.requireSecretAccessKey(config), dateStamp, this.requireRegion(config));
        const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
        url.searchParams.set('X-Amz-Signature', signature);

        return {
            method: 'PUT',
            url: url.toString(),
            headers: input.contentType ? { 'content-type': input.contentType } : {},
            expiresAt: input.expiresAt.toISOString()
        };
    }

    async testConnection(config: AttachmentStorageProviderRuntimeConfig) {
        await this.sendSignedRequest({
            config,
            method: 'HEAD',
            key: null
        });

        return {
            status: AttachmentStorageProviderConnectionTestStatusValue.Success,
            message: 'Huawei OBS S3-compatible bucket is reachable with the configured credentials.',
            checkedAt: new Date().toISOString()
        };
    }

    private async sendSignedRequest(input: SignedRequestInput): Promise<Response> {
        const body = input.body ?? Buffer.alloc(0);
        const payloadHash = createHash('sha256').update(body).digest('hex');
        const url = this.buildObjectUrl(input.config, input.key);
        const now = new Date();
        const amzDate = this.toAmzDate(now);
        const dateStamp = amzDate.slice(0, 8);
        const headers = new Map<string, string>([
            ['host', url.host],
            ['x-amz-content-sha256', payloadHash],
            ['x-amz-date', amzDate]
        ]);

        if (input.contentType) {
            headers.set('content-type', input.contentType);
        }

        const signedHeaders = [...headers.keys()].sort().join(';');
        const canonicalHeaders = [...headers.entries()]
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, value]) => `${key}:${value.trim()}\n`)
            .join('');
        const canonicalRequest = [input.method, url.pathname || '/', url.searchParams.toString(), canonicalHeaders, signedHeaders, payloadHash].join('\n');
        const credentialScope = `${dateStamp}/${this.requireRegion(input.config)}/s3/aws4_request`;
        const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, createHash('sha256').update(canonicalRequest).digest('hex')].join('\n');
        const signingKey = this.signingKey(this.requireSecretAccessKey(input.config), dateStamp, this.requireRegion(input.config));
        const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
        const authorization = `AWS4-HMAC-SHA256 Credential=${this.requireAccessKeyId(input.config)}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
        const requestHeaders = Object.fromEntries([...headers.entries(), ['authorization', authorization]]);
        const requestInit: RequestInit = {
            method: input.method,
            headers: requestHeaders
        };
        if (input.method === 'PUT') {
            requestInit.body = body as unknown as BodyInit;
        }
        const response = await fetch(url, requestInit);

        if (response.status === 404) {
            throw new NotFoundException(`Attachment storage object ${input.key ?? this.requireBucket(input.config)} not found`);
        }
        if (!response.ok) {
            const message = await this.safeErrorMessage(response);
            throw new BadGatewayException(`Attachment storage provider request failed: ${input.method} ${url.pathname} returned ${response.status}${message ? ` ${message}` : ''}`);
        }

        return response;
    }

    private buildObjectUrl(config: AttachmentStorageProviderRuntimeConfig, key: string | null): URL {
        const endpoint = this.requireEndpoint(config);
        const bucket = this.requireBucket(config);
        const endpointUrl = new URL(endpoint);
        const basePath = endpointUrl.pathname.replace(/\/+$/, '');
        const keyPath = key ? this.encodePath(key) : '';

        if (config.forcePathStyle) {
            endpointUrl.pathname = [basePath, this.encodePath(bucket), keyPath].filter(Boolean).join('/');
            return endpointUrl;
        }

        endpointUrl.hostname = `${bucket}.${endpointUrl.hostname}`;
        endpointUrl.pathname = [basePath, keyPath].filter(Boolean).join('/') || '/';
        return endpointUrl;
    }

    private signingKey(secretAccessKey: string, dateStamp: string, region: string): Buffer {
        const dateKey = createHmac('sha256', `AWS4${secretAccessKey}`).update(dateStamp).digest();
        const regionKey = createHmac('sha256', dateKey).update(region).digest();
        const serviceKey = createHmac('sha256', regionKey).update('s3').digest();
        return createHmac('sha256', serviceKey).update('aws4_request').digest();
    }

    private encodePath(value: string): string {
        return value
            .split('/')
            .filter((part, index, list) => part.length > 0 || (index === 0 && list.length === 1))
            .map((part) => encodeURIComponent(part))
            .join('/');
    }

    private canonicalQueryString(searchParams: URLSearchParams): string {
        return [...searchParams.entries()]
            .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
                const keyComparison = leftKey.localeCompare(rightKey);
                return keyComparison === 0 ? leftValue.localeCompare(rightValue) : keyComparison;
            })
            .map(([key, value]) => `${this.encodeQueryComponent(key)}=${this.encodeQueryComponent(value)}`)
            .join('&');
    }

    private encodeQueryComponent(value: string): string {
        return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
    }

    private toAmzDate(date: Date): string {
        return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
    }

    private async safeErrorMessage(response: Response): Promise<string> {
        try {
            return (await response.text()).replace(/\s+/g, ' ').trim().slice(0, 300);
        } catch {
            return '';
        }
    }

    private requireEndpoint(config: AttachmentStorageProviderRuntimeConfig): string {
        if (!config.endpoint) throw new BadGatewayException('Attachment storage provider endpoint is not configured.');
        return config.endpoint;
    }

    private requireRegion(config: AttachmentStorageProviderRuntimeConfig): string {
        if (!config.region) throw new BadGatewayException('Attachment storage provider region is not configured.');
        return config.region;
    }

    private requireBucket(config: AttachmentStorageProviderRuntimeConfig): string {
        if (!config.bucket) throw new BadGatewayException('Attachment storage provider bucket is not configured.');
        return config.bucket;
    }

    private requireAccessKeyId(config: AttachmentStorageProviderRuntimeConfig): string {
        if (!config.accessKeyId) throw new BadGatewayException('Attachment storage provider access key is not configured.');
        return config.accessKeyId;
    }

    private requireSecretAccessKey(config: AttachmentStorageProviderRuntimeConfig): string {
        if (!config.secretAccessKey) throw new BadGatewayException('Attachment storage provider secret key is not configured.');
        return config.secretAccessKey;
    }
}
