import { defineEntity } from '@mikro-orm/core';
import { PlatformUser } from './platform-user.entity';

const p = defineEntity.properties;

export const LocalCredentialSchema = defineEntity({
    name: 'LocalCredential',
    tableName: 'local_credential',
    schema: 'poms',
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()'),
        userId: () =>
            p
                .manyToOne(PlatformUser)
                .mapToPk()
                .unique()
                .fieldName('user_id')
                .foreignKeyName('local_credential_user_id_foreign')
                .updateRule('cascade')
                .deleteRule('cascade'),
        passwordHash: p.string().length(255).fieldName('password_hash'),
        createdAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .fieldName('created_at'),
        updatedAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .onUpdate(() => new Date())
            .fieldName('updated_at')
    }
});

export class LocalCredential extends LocalCredentialSchema.class {}

LocalCredentialSchema.setClass(LocalCredential);
