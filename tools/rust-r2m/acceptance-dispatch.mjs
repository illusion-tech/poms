// One fixed routing decision before transport. There is no response fallback.
import assert from 'node:assert/strict';

const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function compileRoute(template) {
    assert(typeof template === 'string' && template.startsWith('/api') && !/[?#\\\0]/.test(template), 'Relative API route template required');
    const names = [];
    let offset = 0, source = '';
    for (const match of template.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/g)) {
        source += escape(template.slice(offset, match.index));
        source += '([^/]+?)'; names.push(match[1]); offset = match.index + match[0].length;
    }
    source += escape(template.slice(offset));
    assert(!/[{}]/.test(template.replace(/\{[A-Za-z][A-Za-z0-9]*\}/g, '')), 'Malformed route template');
    return { template, names, pattern: new RegExp('^' + source + '$') };
}

export function requestPath(value) {
    assert(typeof value === 'string' && value.startsWith('/api') && !value.startsWith('//') && !/[#\\\0\r\n]/.test(value), 'Relative API request path required');
    assert(!value.startsWith('/api/../') && !value.includes('/./') && !value.includes('/../'), 'Dot path refused');
    // Never decode or URL-normalize here: malformed percent/UTF8 is an actual
    // Native/Rust request input. The transport must send these literal bytes.
    return value.split('?', 1)[0];
}

export function createDispatch({ surface, nativeOnly = [] }) {
    assert(Array.isArray(surface) && surface.length === 115, 'Exactly the frozen migrated115 required');
    const seen = new Set();
    const build = (rows, kind) => rows.map((row) => {
        assert(METHODS.has(row.method), 'Uppercase method required');
        const key = row.method + ' ' + row.path;
        assert(!seen.has(key), 'Duplicate dispatch route'); seen.add(key);
        const compiled = compileRoute(row.path);
        return { ...compiled, method: row.method, operationId: row.operationId ?? null, kind };
    });
    const migrated = build(surface, 'migrated'), original = build(nativeOnly, 'native-only');
    for (const row of original) assert(!migrated.some((item) => item.method === row.method && item.template === row.template), 'Native override of migrated route refused');
    const resolve = ({ method, path, backend, purpose = 'business' }) => {
        assert(METHODS.has(method) && ['nest', 'rust'].includes(backend), 'Invalid method/backend');
        const pathname = requestPath(path);
        const matches = migrated.filter((row) => row.method === method && row.pattern.test(pathname));
        // Literal command patterns take precedence over an item parameter that
        // can also consume a colon. Source-specific dispatch remains backend's.
        const selected = matches.sort((a, b) => b.template.replace(/\{[^}]+\}/g, '').length - a.template.replace(/\{[^}]+\}/g, '').length)[0];
        if (selected) return Object.freeze({ executionBackend: backend, kind: 'migrated', routeTemplate: selected.template, operationId: selected.operationId, fallbackAllowed: false });
        const native = original.filter((row) => row.method === method && row.pattern.test(pathname));
        assert(native.length <= 1, 'Ambiguous Native route');
        if (native.length) {
            assert(['producer', 'read-model', 'ui-read-model'].includes(purpose), 'Native-only route requires named producer/read-model purpose');
            return Object.freeze({ executionBackend: 'nest', kind: 'native-only', routeTemplate: native[0].template, operationId: native[0].operationId, fallbackAllowed: false });
        }
        // Deliberate unknown-method/path probes remain on the candidate. They
        // cannot introduce an alternate Native business route.
        assert(['surface-negative', 'uri-order'].includes(purpose), 'Unfrozen request route refused');
        return Object.freeze({ executionBackend: backend, kind: 'negative-probe', routeTemplate: null, operationId: null, fallbackAllowed: false });
    };
    return Object.freeze({ resolve, migrated: Object.freeze(migrated.map(({ template: path, method, operationId }) => Object.freeze({ path, method, operationId }))), nativeOnly: Object.freeze(original.map(({ template: path, method }) => Object.freeze({ path, method }))) });
}
