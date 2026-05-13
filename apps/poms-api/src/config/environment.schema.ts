import { z } from 'zod';

const optionalString = z.preprocess((value) => {
    if (typeof value === 'string' && value.trim() === '') {
        return undefined;
    }

    return value;
}, z.string().optional());

const rawEnvironmentSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(3333),
    HOST: z.string().default('127.0.0.1'),
    CORS_ORIGIN: z.string().default('http://localhost:4200'),
    JWT_SECRET: z.string().default('poms-dev-secret-change-in-production'),
    AUTH_SESSION_IDLE_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(900),
    AUTH_SESSION_ABSOLUTE_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(28800),
    AUTH_SESSION_LAST_SEEN_THROTTLE_SECONDS: z.coerce.number().int().nonnegative().default(60),
    AUTH_COOKIE_PATH: z.string().default('/api'),
    AUTH_COOKIE_SECURE: z.coerce.boolean().optional(),

    DB_CONNECT: z.coerce.boolean().default(false),
    DATABASE_URL: optionalString,
    DB_HOST: z.string().default('127.0.0.1'),
    DB_PORT: z.coerce.number().int().positive().default(5432),
    DB_DATABASE: optionalString,
    DB_NAME: optionalString,
    DB_USER: z.string().default('postgres'),
    DB_PASSWORD: z.string().default('postgres'),
    DB_SCHEMA: z.string().default('poms'),
    DB_DEBUG: z.coerce.boolean().default(false),
    MIGRATIONS_TABLE_NAME: z.string().default('poms_migrations')
});

export const environmentSchema = rawEnvironmentSchema.transform((env) => ({
    ...env,
    DB_DATABASE: env.DB_DATABASE ?? env.DB_NAME ?? 'poms'
}));

export type EnvironmentVariables = z.output<typeof environmentSchema>;
