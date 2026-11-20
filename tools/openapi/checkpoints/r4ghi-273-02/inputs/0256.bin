import { existsSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { config } from 'dotenv';
import { ZodError } from 'zod';
import { type EnvironmentVariables, environmentSchema } from './environment.schema';

let cachedEnv: EnvironmentVariables | undefined;

export const ENV_PATH_VARIABLE_NAME = 'POMS_ENV_FILE';

export interface EnvPathResolution {
    path: string | undefined;
    explicit: boolean;
    missingExplicitPath: string | undefined;
}

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
    return resolveEnvPathWithMetadata({ cwd, env }).path;
}

export function resolveEnvPathWithMetadata({
    cwd = process.cwd(),
    env = process.env
}: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
} = {}): EnvPathResolution {
    const explicitPath = normalizeCandidatePath(cwd, env[ENV_PATH_VARIABLE_NAME]);

    if (explicitPath) {
        const explicitPathExists = existsSync(explicitPath);
        return {
            path: explicitPathExists ? explicitPath : undefined,
            explicit: true,
            missingExplicitPath: explicitPathExists ? undefined : explicitPath
        };
    }

    const candidates = [resolve(cwd, '.env'), resolve(cwd, 'apps/poms-api/.env')];

    return {
        path: candidates.find((candidate) => existsSync(candidate)),
        explicit: false,
        missingExplicitPath: undefined
    };
}

export function loadValidatedEnv(): EnvironmentVariables {
    if (cachedEnv) {
        return cachedEnv;
    }

    const envPath = resolveEnvPathWithMetadata();

    if (envPath.missingExplicitPath) {
        console.error(`Explicit ${ENV_PATH_VARIABLE_NAME} file does not exist: ${envPath.missingExplicitPath}`);
        process.exit(11);
    }

    if (envPath.path) {
        config({ path: envPath.path, override: envPath.explicit });
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
