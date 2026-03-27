import { waitForPortOpen } from '@nx/node/utils';

/* eslint-disable */
var __TEARDOWN_MESSAGE__: string;

module.exports = async function () {
    const host = process.env.HOST ?? 'localhost';
    const port = process.env.PORT ? Number(process.env.PORT) : 3333;
    await waitForPortOpen(port, { host });
    globalThis.__TEARDOWN_MESSAGE__ = `\nTearing down e2e server on ${host}:${port}...\n`;
};
