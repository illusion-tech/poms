import { E2E_API_HOST, E2E_API_PORT } from './server-config';
import { startManagedApiServer } from './server-harness';

/* eslint-disable */
var __TEARDOWN_MESSAGE__: string;

module.exports = async function () {
    await startManagedApiServer();
    globalThis.__TEARDOWN_MESSAGE__ = `\nTearing down managed e2e server on ${E2E_API_HOST}:${E2E_API_PORT}...\n`;
};
