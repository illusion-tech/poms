import { stopManagedApiServer } from './server-harness';

module.exports = async function (): Promise<void> {
    await stopManagedApiServer();
};
