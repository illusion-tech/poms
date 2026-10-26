import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// eslint-disable-next-line @nx/enforce-module-boundaries -- E1: E2E-only shared owned-process test tool; no production boundary change.
import { resolveApiPlan, startApiServer, type ApiServer } from '../../../../tools/e2e/api-server.cjs';

type HarnessGlobal = typeof globalThis & { __POMS_API_E2E_SERVER__?: ApiServer };

export async function startManagedApiServer(): Promise<void> {
    const state = globalThis as HarnessGlobal;
    if (state.__POMS_API_E2E_SERVER__) throw new Error('API E2E server already belongs to this run');
    const plan = resolveApiPlan();
    const logPath = plan.target.managed ? join(mkdtempSync(join(tmpdir(), 'poms-api-e2e-')), 'server.log') : undefined;
    const server = await startApiServer({ logPath });
    // Jest globalSetup/globalTeardown run in the same parent process. Keep the
    // closure and opaque handle, never reconstruct ownership from a PID file.
    state.__POMS_API_E2E_SERVER__ = server;
}

export async function stopManagedApiServer(): Promise<void> {
    const state = globalThis as HarnessGlobal;
    const server = state.__POMS_API_E2E_SERVER__;
    if (!server) return;
    await server.stop();
    delete state.__POMS_API_E2E_SERVER__;
}
