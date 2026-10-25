export const syntheticEnvironment = {
    NODE_ENV: 'test',
    AUTH_COOKIE_SECURE: false as boolean | undefined,
    AUTH_SESSION_IDLE_TIMEOUT_SECONDS: 900,
    AUTH_SESSION_ABSOLUTE_TIMEOUT_SECONDS: 28800,
    AUTH_SESSION_LAST_SEEN_THROTTLE_SECONDS: 60
};

export const loaderEvidence = { calls: 0, kind: 'synthetic-environment-module-replacement' };

export function loadValidatedEnv() {
    loaderEvidence.calls += 1;
    return syntheticEnvironment;
}
