export const loaderEvidence = { calls: 0 };
export function loadValidatedEnv() {
    loaderEvidence.calls += 1;
    return { NODE_ENV: 'test', AUTH_COOKIE_SECURE: false, AUTH_COOKIE_PATH: '/api', AUTH_SESSION_IDLE_TIMEOUT_SECONDS: 900, AUTH_SESSION_ABSOLUTE_TIMEOUT_SECONDS: 28800, AUTH_SESSION_LAST_SEEN_THROTTLE_SECONDS: 60 };
}
