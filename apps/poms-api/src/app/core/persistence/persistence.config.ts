import type { MigrationsOptions, SeederOptions } from '@mikro-orm/core';
import { Migrator } from '@mikro-orm/migrations';
import type { MikroOrmModuleOptions } from '@mikro-orm/nestjs';
import { type Options as PostgreSqlOptions, PostgreSqlDriver } from '@mikro-orm/postgresql';
import { SeedManager } from '@mikro-orm/seeder';
import { loadValidatedEnv } from '../../../config/load-env';

type MikroOrmConfigOverrides = Partial<PostgreSqlOptions> & {
    connect?: boolean;
};

export function createBaseMikroOrmOptions(overrides: MikroOrmConfigOverrides = {}): PostgreSqlOptions & { connect: boolean } {
    const env = loadValidatedEnv();
    const migrations: MigrationsOptions = {
        tableName: env.MIGRATIONS_TABLE_NAME,
        path: 'apps/poms-api/src/migrations',
        pathTs: 'apps/poms-api/src/migrations',
        glob: '!(*.d).{js,ts}',
        transactional: true,
        allOrNothing: true,
        safe: true,
        emit: 'ts',
        snapshot: false,
        ...(overrides.migrations ?? {})
    };

    const seeder: SeederOptions = {
        path: 'apps/poms-api/src/seeders',
        pathTs: 'apps/poms-api/src/seeders',
        defaultSeeder: 'DatabaseSeeder',
        glob: '!(*.d).{js,ts}',
        emit: 'ts'
    };

    return {
        driver: PostgreSqlDriver,
        clientUrl: env.DATABASE_URL,
        host: env.DB_HOST,
        port: env.DB_PORT,
        dbName: env.DB_DATABASE,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        schema: env.DB_SCHEMA,
        connect: env.DB_CONNECT,
        ensureDatabase: false,
        baseDir: process.cwd(),
        entities: ['./dist/apps/poms-api/**/*.entity.js'],
        entitiesTs: ['apps/poms-api/src/**/*.entity.ts'],
        extensions: [Migrator, SeedManager],
        debug: env.DB_DEBUG,
        seeder,
        migrations,
        ...overrides
    };
}

export function createNestMikroOrmOptions(): MikroOrmModuleOptions {
    return {
        ...createBaseMikroOrmOptions(),
        registerRequestContext: true,
        autoLoadEntities: true
    } as unknown as MikroOrmModuleOptions;
}
