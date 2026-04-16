import { stopManagedApiServer } from './server-harness';
/* eslint-disable */

module.exports = async function () {
    await stopManagedApiServer();
    console.log(globalThis.__TEARDOWN_MESSAGE__);
};
