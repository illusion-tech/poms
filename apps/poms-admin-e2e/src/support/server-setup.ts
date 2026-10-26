// eslint-disable-next-line @nx/enforce-module-boundaries -- R1D E1: this E2E entry reuses the single owned-process test tool; root tools is not a production library.
import { startBrowserServers } from '../../../../tools/e2e/admin-launcher.cjs';

export default async function setup(): Promise<() => Promise<void>> {
    // Config/workers never adopt PID files. This closure retains the exact
    // opaque handles created by this setup invocation in the same process.
    const servers = await startBrowserServers();
    return async () => servers.stop();
}
