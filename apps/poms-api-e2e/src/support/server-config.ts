// eslint-disable-next-line @nx/enforce-module-boundaries -- E1: E2E-only shared owned-process test tool; no production boundary change.
import { resolveApiPlan } from '../../../../tools/e2e/api-server.cjs';

// Planning validates effective managed env or the explicit external origin.
// It never starts a process or prepares data.
export const E2E_API_PLAN = resolveApiPlan();
export const E2E_API_HOST = E2E_API_PLAN.target.host;
export const E2E_API_PORT = E2E_API_PLAN.target.port;
export const E2E_API_BASE_URL = E2E_API_PLAN.target.apiBaseUrl;
