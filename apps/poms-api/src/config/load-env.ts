import { existsSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { config } from 'dotenv';
import { ZodError } from 'zod';
import { type EnvironmentVariables, environmentSchema } from './environment.schema';

let cachedEnv: EnvironmentVariables | undefined;

export const ENV_PATH_VARIABLE_NAME = 'POMS_ENV_FILE';

function normalizeCandidatePath(cwd: string, candidate: string | undefined): string | undefined {
    const trimmedCandidate = candidate?.trim();
    if (!trimmedCandidate) {
        return undefined;
    }

    return isAbsolute(trimmedCandidate) ? trimmedCandidate : resolve(cwd, trimmedCandidate);
}

export function resolveEnvPath({
    cwd = process.cwd(),
    env = process.env
}: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
} = {}): string | undefined {
    const candidates = [
        normalizeCandidatePath(cwd, env[ENV_PATH_VARIABLE_NAME]),
        resolve(cwd, '.env'),
        resolve(cwd, 'apps/poms-api/.env')
    ].filter((candidate): candidate is string => candidate !== undefined);

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
