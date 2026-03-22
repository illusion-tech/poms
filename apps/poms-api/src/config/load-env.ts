import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { ZodError } from 'zod';
import { type EnvironmentVariables, environmentSchema } from './environment.schema';

let cachedEnv: EnvironmentVariables | undefined;

function resolveEnvPath(): string | undefined {
    const candidates = [resolve(process.cwd(), 'apps/poms-api/.env'), resolve(process.cwd(), '.env')];

    return candidates.find((candidate) => existsSync(candidate));
}

export function loadValidatedEnv(): EnvironmentVariables {
    if (cachedEnv) {
        return cachedEnv;
    }

    const envPath = resolveEnvPath();

    if (envPath) {
        config({ path: envPath });
    } else {
        console.warn('Warning: No .env file found for poms-api. Falling back to process environment variables.');
    }

    try {
        cachedEnv = environmentSchema.parse(process.env);
        return cachedEnv;
    } catch (error) {
        if (error instanceof ZodError) {
            console.error('Invalid environment variables for poms-api:', JSON.stringify(error.format(), null, 2));
        } else {
            console.error('Unexpected environment validation error for poms-api:', error);
        }

        process.exit(11);
    }
}
