import type { SecretCipherOptions } from '../../core/secret/secret-cipher.service';

export const ATTACHMENT_STORAGE_SECRET_CIPHER_OPTIONS: SecretCipherOptions = {
    envKeys: ['ATTACHMENT_STORAGE_PROVIDER_SECRET_KEY', 'POMS_SECRET_KEY', 'JWT_SECRET'],
    defaultValue: 'poms-dev-secret-change-in-production',
    unreadableMessage: 'Attachment storage provider secret is not readable.'
};
