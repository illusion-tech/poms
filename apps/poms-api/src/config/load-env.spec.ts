import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { ENV_PATH_VARIABLE_NAME, resolveEnvPath } from './load-env';

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
});
