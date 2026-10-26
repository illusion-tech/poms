import { Agent as HttpAgent } from 'node:http';
import { Agent as HttpsAgent } from 'node:https';

// Jest loads a separate Axios module per suite. Its private socket Symbol must
// not accumulate listeners on sockets borrowed from Node's shared global pool.
// These E2E-only agents close each socket; no listener limit is increased.
export const E2E_HTTP_AGENT = new HttpAgent({ keepAlive: false });
export const E2E_HTTPS_AGENT = new HttpsAgent({ keepAlive: false });
