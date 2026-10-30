// Pure finite acceptance plan. It contains no fetch, SDK, PG or fixture calls.
import assert from 'node:assert/strict';
export const lookupSensitiveFields = Object.freeze([
    ['amount_tax_inclusive', 'amountTaxInclusiveProjection'], ['amount_tax_exclusive', 'amountTaxExclusiveProjection'],
    ['tax_rate', 'taxRateProjection'], ['down_payment_rate', 'downPaymentRateProjection'],
    ['retention_rate', 'retentionRateProjection'], ['payment_terms', 'paymentTermsProjection']
].map(Object.freeze));
export function lookupNumbers(runId) {
    assert(/^[0-9a-f-]{36}$/.test(runId)); const suffix = runId.slice(0, 8);
    const value = { projectNo: ' Ωé/ A&=#+P-' + suffix + ' ', contractNo: ' Ωé/ A&=#+C-' + suffix + ' ' };
    for (const number of Object.values(value)) assert([...number].length <= 64);
    return value;
}
export function lookupRoute(variant, resource, number) {
    assert(['legacy', 'current'].includes(variant)); assert(['project', 'contract'].includes(resource));
    const plural = resource === 'project' ? 'projects' : 'contracts', key = resource === 'project' ? 'projectNo' : 'contractNo';
    return variant === 'current' ? '/api/' + plural + ':lookup?' + key + '=' + encodeURIComponent(number) : '/api/' + plural + '/' + (resource === 'project' ? 'code' : 'no') + '/' + encodeURIComponent(number);
}
export function lookupHttpPlan({ variant, numbers, projectId, contractId }) {
    const cases = [];
    for (const resource of ['project', 'contract']) {
        const number = numbers[resource + 'No'], plural = resource === 'project' ? 'projects' : 'contracts', key = resource + 'No';
        const route = lookupRoute(variant, resource, number), missing = lookupRoute(variant, resource, 'missing-' + number.trim());
        const add = (name, path, status, actor = 'admin', extra = {}) => cases.push({ name: resource + '.' + name, resource, path, status, actor, ...extra });
        add('full-success', route, 200, 'admin', { compare: true }); add('reader-success', route, 200, 'reader', { compare: true });
        add('not-found', missing, 404, 'admin', { compare: true }); add('anonymous', route, 401, 'anonymous', { compare: true });
        add('permission-denied', route, 403, 'denied', { compare: true });
        add('uuid-predicate', lookupRoute(variant, resource, resource === 'project' ? projectId : contractId), 404, 'admin', { compare: true });
        add('item-uuid', '/api/' + plural + '/' + (resource === 'project' ? projectId : contractId), 200, 'admin', { compare: true, item: true });
        add('transport-nul-observed', lookupRoute(variant, resource, '\0'), undefined, 'admin', { observationOnly: true, boundary: 'Record the real transport/PG outcome; no fabricated lookup success or newly imposed business validator' });
        if (variant === 'legacy') { add('new-route-absent', lookupRoute('current', resource, number), 404); continue; }
        add('old-route-removed', lookupRoute('legacy', resource, number), 404);
        const prefix = '/api/' + plural + ':lookup', encoded = encodeURIComponent(number), q = (value) => prefix + '?' + key + '=' + value;
        for (const [name, path, status] of [
            ['missing-query', prefix, 400], ['empty', q(''), 400], ['space-only', q('%20'), 404],
            ['duplicate-same', q(encoded) + '&' + key + '=' + encoded, 400], ['duplicate-different', q(encoded) + '&' + key + '=other', 400],
            ['bracket-only-array', prefix + '?' + key + '[]=' + encoded, 400], ['bracket-only-object', prefix + '?' + key + '[x]=' + encoded, 400],
            ['scalar-plus-bracket', q(encoded) + '&' + key + '[]=ignored', 200], ['unknown-strip', q(encoded) + '&unknown=ignored&unknown[]=other', 200],
            ['not-trimmed', q(encodeURIComponent(number.trim())), 404], ['not-casefolded', q(encodeURIComponent(number.toLowerCase())), 404],
            ['not-nfc-normalized', q(encodeURIComponent(number.normalize('NFD'))), 404],
            ['encoded-key', prefix + '?%' + key.charCodeAt(0).toString(16) + key.slice(1) + '=' + encoded, 200],
            ['lowercase-slash-escape', q(encoded.replaceAll('%2F', '%2f')), 200], ['plus-is-space', q(encoded.replaceAll('%2B', '+')), 404],
            ['percent-decoded-once', q(encoded.replaceAll('%2F', '%252F')), 404], ['no-max64-validation', q('x'.repeat(65)), 404],
            ['numeric-string', q('123'), 404], ['boolean-string', q('true'), 404], ['malformed-percent-literal', q('%ZZ'), 404],
            ['incomplete-utf8-query', q('%E0%A4'), 404]
        ]) add('query.' + name, path, status, status === 200 ? 'reader' : 'admin');
    }
    return cases;
}
export function publicLookupEvidence(value, secrets = new Set()) {
    const shaMarker = (text) => '[redacted:' + String(text).length + '-chars]';
    const visit = (entry, key = '') => {
        if (entry == null) return entry;
        if (/(?:password|token|cookie|authorization|secret)/i.test(key)) return { redacted: true, bytes: Buffer.byteLength(typeof entry === 'string' ? entry : JSON.stringify(entry)) };
        if (typeof entry === 'bigint') return { kind: 'bigint', decimal: entry.toString() };
        if (Object.prototype.toString.call(entry) === '[object Date]') return entry.toISOString();
        if (Array.isArray(entry)) return entry.map((item) => visit(item));
        if (typeof entry === 'object') return Object.fromEntries(Object.entries(entry).map(([name, item]) => [name, visit(item, name)]));
        if (typeof entry === 'string') { let text = entry; for (const secret of secrets) if (typeof secret === 'string' && secret.length >= 8) text = text.replaceAll(secret, shaMarker(secret)); return text; }
        return entry;
    };
    return visit(value);
}
