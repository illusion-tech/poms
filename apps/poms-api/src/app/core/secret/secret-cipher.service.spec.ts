import { BadRequestException } from '@nestjs/common';
import { SecretCipherService } from './secret-cipher.service';

describe('SecretCipherService', () => {
    let service: SecretCipherService;

    beforeEach(() => {
        service = new SecretCipherService();
        delete process.env['POMS_SECRET_KEY'];
        delete process.env['JWT_SECRET'];
    });

    it('encrypts and decrypts secrets without exposing plaintext', () => {
        const encrypted = service.encrypt('raw-secret');

        expect(encrypted).toMatch(/^v1:/);
        expect(encrypted).not.toContain('raw-secret');
        expect(service.decrypt(encrypted)).toBe('raw-secret');
    });

    it('uses configured key source order and rejects unreadable values', () => {
        process.env['POMS_SECRET_KEY'] = 'first-key';
        const encrypted = service.encrypt('raw-secret');

        process.env['POMS_SECRET_KEY'] = 'second-key';

        expect(() => service.decrypt(encrypted, { unreadableMessage: 'Storage provider secret is not readable.' })).toThrow(BadRequestException);
    });
});
