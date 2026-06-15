import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { ENV_PATH_VARIABLE_NAME, resolveEnvPath, resolveEnvPathWithMetadata } from './load-env';

describe('resolveEnvPath', () => {
    let tempDir: string;

    beforeEach(() => {
        tempDir = mkdtempSync(join(tmpdir(), 'poms-load-env-'));
    });

    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });

    it('prefers an explicit env file override', () => {
        const rootEnvPath = join(tempDir, '.env');
        const overrideEnvPath = join(tempDir, 'config', 'custom.env');

        mkdirSync(join(tempDir, 'config'), { recursive: true });
        writeFileSync(rootEnvPath, 'DB_PASSWORD=root');
        writeFileSync(overrideEnvPath, 'DB_PASSWORD=override');

        expect(
            resolveEnvPath({
                cwd: tempDir,
                env: { [ENV_PATH_VARIABLE_NAME]: overrideEnvPath }
            })
        ).toBe(overrideEnvPath);
    });

    it('resolves a relative explicit env file override from cwd', () => {
        const overrideEnvPath = join(tempDir, 'config', 'custom.env');

        mkdirSync(join(tempDir, 'config'), { recursive: true });
        writeFileSync(overrideEnvPath, 'DB_PASSWORD=override');

        expect(
            resolveEnvPath({
                cwd: tempDir,
                env: { [ENV_PATH_VARIABLE_NAME]: 'config/custom.env' }
            })
        ).toBe(overrideEnvPath);
    });

    it('prefers the workspace root .env over apps/poms-api/.env', () => {
        const rootEnvPath = join(tempDir, '.env');
        const appEnvPath = join(tempDir, 'apps', 'poms-api', '.env');

        mkdirSync(join(tempDir, 'apps', 'poms-api'), { recursive: true });
        writeFileSync(rootEnvPath, 'DB_PASSWORD=root');
        writeFileSync(appEnvPath, 'DB_PASSWORD=app');

        expect(resolveEnvPath({ cwd: tempDir, env: {} })).toBe(rootEnvPath);
    });

    it('falls back to apps/poms-api/.env when the workspace root .env is absent', () => {
        const appEnvPath = join(tempDir, 'apps', 'poms-api', '.env');

        mkdirSync(join(tempDir, 'apps', 'poms-api'), { recursive: true });
        writeFileSync(appEnvPath, 'DB_PASSWORD=app');

        expect(resolveEnvPath({ cwd: tempDir, env: {} })).toBe(appEnvPath);
    });

    it('returns undefined when no candidate env file exists', () => {
        expect(resolveEnvPath({ cwd: tempDir, env: {} })).toBeUndefined();
        expect(
            resolveEnvPath({
                cwd: tempDir,
                env: { [ENV_PATH_VARIABLE_NAME]: resolve(tempDir, 'missing.env') }
            })
        ).toBeUndefined();
    });

    it('records a missing explicit env file without falling back to the root .env', () => {
        const rootEnvPath = join(tempDir, '.env');
        const missingEnvPath = resolve(tempDir, 'missing.env');
        writeFileSync(rootEnvPath, 'DB_PASSWORD=root');

        expect(
            resolveEnvPathWithMetadata({
                cwd: tempDir,
                env: { [ENV_PATH_VARIABLE_NAME]: missingEnvPath }
            })
        ).toEqual({
            path: undefined,
            explicit: true,
            missingExplicitPath: missingEnvPath
        });
    });

    it('overrides existing process env values when an explicit env file is used', () => {
        const overrideEnvPath = join(tempDir, 'config', 'custom.env');
        const originalEnv = process.env;

        mkdirSync(join(tempDir, 'config'), { recursive: true });
        writeFileSync(
            overrideEnvPath,
            [
                'DB_CONNECT=true',
                'DB_HOST=override-host',
                'DB_PORT=5432',
                'DB_DATABASE=override_db',
                'DB_USER=override_user',
                'DB_PASSWORD=override_password',
                'DB_SCHEMA=poms',
                'MIGRATIONS_TABLE_NAME=poms_migrations'
            ].join('\n')
        );

        try {
            jest.isolateModules(() => {
                process.env = {
                    ...originalEnv,
                    [ENV_PATH_VARIABLE_NAME]: overrideEnvPath,
                    DB_HOST: 'preloaded-host',
                    DB_DATABASE: 'preloaded_db',
                    DB_USER: 'preloaded_user',
                    DB_PASSWORD: 'preloaded_password'
                };

                const { loadValidatedEnv } = jest.requireActual<typeof import('./load-env')>('./load-env');
                const env = loadValidatedEnv();

                expect(env.DB_HOST).toBe('override-host');
                expect(env.DB_DATABASE).toBe('override_db');
                expect(env.DB_USER).toBe('override_user');
                expect(env.DB_PASSWORD).toBe('override_password');
            });
        } finally {
            process.env = originalEnv;
        }
    });
});
