import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const workspaceKey = createHash('sha1').update(process.cwd()).digest('hex').slice(0, 12);
const artifactDir = join(tmpdir(), `poms-api-e2e-${workspaceKey}`);

export const E2E_API_HOST = process.env.HOST ?? '127.0.0.1';
export const E2E_API_PORT = process.env.PORT ? Number(process.env.PORT) : 3344;
export const E2E_API_BASE_URL = `http://${E2E_API_HOST}:${E2E_API_PORT}/api`;
export const E2E_SERVER_ARTIFACT_DIR = artifactDir;
export const E2E_SERVER_ENTRY = join(process.cwd(), 'dist', 'apps', 'poms-api', 'main.js');
export const E2E_SERVER_LOG_PATH = join(artifactDir, 'server.log');
export const E2E_SERVER_STATE_PATH = join(artifactDir, 'server-state.json');
