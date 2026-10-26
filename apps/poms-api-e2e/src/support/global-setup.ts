import { startManagedApiServer } from './server-harness';

module.exports = async function (): Promise<void> {
    await startManagedApiServer();
};
