import { spawn, spawnSync } from 'node:child_process';
import { closeSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { Socket } from 'node:net';
import { killPort, waitForPortOpen } from '@nx/node/utils';
import {
    E2E_API_HOST,
    E2E_API_PORT,
    E2E_SERVER_ARTIFACT_DIR,
    E2E_SERVER_ENTRY,
    E2E_SERVER_LOG_PATH,
    E2E_SERVER_STATE_PATH
} from './server-config';

interface ServerState {
    host: string;
    logPath: string;
    pid: number;
    port: number;
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isPortOpen(port: number, host: string): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = new Socket();

        socket.once('connect', () => {
            socket.destroy();
            resolve(true);
        });
        socket.once('error', () => {
            socket.destroy();
            resolve(false);
        });
        socket.setTimeout(1_000, () => {
            socket.destroy();
            resolve(false);
        });

        socket.connect(port, host);
    });
}

function readServerState(): ServerState | null {
    try {
        return JSON.parse(readFileSync(E2E_SERVER_STATE_PATH, 'utf8')) as ServerState;
    } catch {
        return null;
    }
}

async function waitForPortClosed(port: number, host: string, timeoutMs = 15_000): Promise<void> {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        if (!(await isPortOpen(port, host))) {
            return;
        }

        await delay(250);
    }

    throw new Error(`Timed out waiting for ${host}:${port} to close.`);
}

export async function stopManagedApiServer(): Promise<void> {
    const state = readServerState();

    if (state?.pid) {
        if (process.platform === 'win32') {
            spawnSync('taskkill', ['/PID', String(state.pid), '/T', '/F'], {
                stdio: 'ignore',
                windowsHide: true
            });
        } else {
            try {
                process.kill(-state.pid, 'SIGTERM');
            } catch {
                try {
                    process.kill(state.pid, 'SIGTERM');
                } catch {
                    // ignore stale pid files
                }
            }
        }
    }

    if (state && (await isPortOpen(E2E_API_PORT, E2E_API_HOST))) {
        await killPort(E2E_API_PORT);
        await waitForPortClosed(E2E_API_PORT, E2E_API_HOST);
    }

    rmSync(E2E_SERVER_STATE_PATH, { force: true });
}

export async function startManagedApiServer(): Promise<void> {
    await stopManagedApiServer();

    if (await isPortOpen(E2E_API_PORT, E2E_API_HOST)) {
        throw new Error(
            `Port ${E2E_API_PORT} is already in use before e2e startup. Stop the existing process or set PORT explicitly.`
        );
    }

    mkdirSync(E2E_SERVER_ARTIFACT_DIR, { recursive: true });
    rmSync(E2E_SERVER_LOG_PATH, { force: true });

    const buildLogFd = openSync(E2E_SERVER_LOG_PATH, 'a');
    const buildResult = spawnSync(process.execPath, [require.resolve('nx/bin/nx.js'), 'run', 'poms-api:build', '--skip-nx-cache'], {
        cwd: process.cwd(),
        env: process.env,
        stdio: ['ignore', buildLogFd, buildLogFd],
        windowsHide: true
    });
    closeSync(buildLogFd);

    if (buildResult.status !== 0) {
        throw new Error(`Managed e2e API build failed. See ${E2E_SERVER_LOG_PATH}.`);
    }

    const logFd = openSync(E2E_SERVER_LOG_PATH, 'a');
    const child = spawn(process.execPath, [E2E_SERVER_ENTRY], {
        cwd: process.cwd(),
        detached: true,
        env: {
            ...process.env,
            HOST: E2E_API_HOST,
            PORT: String(E2E_API_PORT)
        },
        stdio: ['ignore', logFd, logFd],
        windowsHide: true
    });
    closeSync(logFd);

    if (!child.pid) {
        throw new Error(`Failed to start managed e2e API server. See ${E2E_SERVER_LOG_PATH}.`);
    }

    writeFileSync(
        E2E_SERVER_STATE_PATH,
        JSON.stringify({
            host: E2E_API_HOST,
            logPath: E2E_SERVER_LOG_PATH,
            pid: child.pid,
            port: E2E_API_PORT
        })
    );

    const exitBeforeReady = new Promise<never>((_, reject) => {
        child.once('exit', (code) => {
            reject(
                new Error(
                    `Managed e2e API server exited before becoming ready (code: ${code ?? 'unknown'}). See ${E2E_SERVER_LOG_PATH}.`
                )
            );
        });
    });

    child.unref();

    await Promise.race([
        waitForPortOpen(E2E_API_PORT, { host: E2E_API_HOST }),
        exitBeforeReady
    ]);
}
