// Public failures never serialize driver input/config, SQL, assertion values or child stderr.
export class FixtureError extends Error { constructor(code) { super(code); this.name = 'FixtureError'; this.code = code; } }
export function publicFixtureError(error, phase = 'fixture') {
    const safePhase = /^[a-z][a-z0-9_.-]{0,39}$/.test(phase) ? phase : 'fixture';
    const category = error instanceof FixtureError ? 'guard' : error?.name === 'AssertionError' ? 'assertion' : /^[0-9A-Z]{5}$/.test(error?.code ?? '') ? 'database' : 'internal';
    return { result: 'failed', phase: safePhase, category, ...(category === 'guard' && /^[a-z][a-z0-9_]{0,79}$/.test(error.code) ? { code: error.code } : {}), ...(category === 'database' ? { sqlState: error.code } : {}) };
}
