import type { MikroORM } from '@mikro-orm/core';
import { PostgreSqlDriver, PostgreSqlPlatform } from '@mikro-orm/postgresql';
import { PomsSchemaGenerator } from './poms-schema-generator';

class PomsPostgreSqlPlatform extends PostgreSqlPlatform {
    override lookupExtensions(orm: MikroORM): void {
        super.lookupExtensions(orm);
        PomsSchemaGenerator.register(orm);
    }
}

/** Register the same scalar-aware generator for runtime and CLI bootstrap. */
export class PomsPostgreSqlDriver extends PostgreSqlDriver {
    protected override readonly platform = new PomsPostgreSqlPlatform();
}
