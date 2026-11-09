import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';

export interface SecretCipherOptions {
    envKeys?: string[];
    defaultValue?: string;
    unreadableMessage?: string;
}

const DEFAULT_SECRET_CIPHER_OPTIONS: Required<SecretCipherOptions> = {
    envKeys: ['POMS_SECRET_KEY', 'JWT_SECRET'],
    defaultValue: 'poms-dev-secret-change-in-production',
    unreadableMessage: 'Secret value is not readable.'
};

@Injectable()
export class SecretCipherService {
    encrypt(secret: string, options: SecretCipherOptions = {}): string {
        const iv = randomBytes(12);
        const cipher = createCipheriv('aes-256-gcm', this.secretKey(options), iv);
        const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
        const tag = cipher.getAuthTag();
        return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
    }

    decrypt(encryptedSecret: string, options: SecretCipherOptions = {}): string {
        const [version, ivValue, tagValue, encryptedValue] = encryptedSecret.split(':');
        if (version !== 'v1' || !ivValue || !tagValue || !encryptedValue) {
            throw new BadRequestException(this.resolveOptions(options).unreadableMessage);
        }

        try {
            const decipher = createDecipheriv('aes-256-gcm', this.secretKey(options), Buffer.from(ivValue, 'base64'));
            decipher.setAuthTag(Buffer.from(tagValue, 'base64'));
            return Buffer.concat([decipher.update(Buffer.from(encryptedValue, 'base64')), decipher.final()]).toString('utf8');
        } catch {
            throw new BadRequestException(this.resolveOptions(options).unreadableMessage);
        }
    }

    private secretKey(options: SecretCipherOptions): Buffer {
        const resolved = this.resolveOptions(options);
        const source = resolved.envKeys.map((key) => process.env[key]).find((value): value is string => Boolean(value)) ?? resolved.defaultValue;
        return createHash('sha256').update(source).digest();
    }

    private resolveOptions(options: SecretCipherOptions): Required<SecretCipherOptions> {
        return {
            envKeys: options.envKeys ?? DEFAULT_SECRET_CIPHER_OPTIONS.envKeys,
            defaultValue: options.defaultValue ?? DEFAULT_SECRET_CIPHER_OPTIONS.defaultValue,
            unreadableMessage: options.unreadableMessage ?? DEFAULT_SECRET_CIPHER_OPTIONS.unreadableMessage
        };
    }
}
