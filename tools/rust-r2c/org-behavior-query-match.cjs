'use strict';

const { matchesBarrier } = require('./witness-query-core.cjs');

function parts(description) {
    const shape = description.sqlShape.replaceAll('"', '').toLowerCase().replace(/;\s*$/, '').trim();
    // Bound the predicate at RETURNING/ORDER/LIMIT. Searching the entire tail
    // after WHERE incorrectly treats a RETURNING row_version as a CAS predicate.
    const where = /\bwhere\b([\s\S]*?)(?=\breturning\b|\border by\b|\blimit\b|$)/.exec(shape)?.[1] ?? '';
    const returning = /\breturning\b([\s\S]*)$/.exec(shape)?.[1].trim() ?? '';
    return { shape, where, returning };
}

function matchesBehaviorBarrier(kind, phase, description) {
    const { shape, where, returning } = parts(description);
    const versionPredicate = /\b(?:[a-z0-9_]+\.)?row_version\s*=\s*(?:\?number|\$\d+|\d+)\b/.test(where.replaceAll('?number', '0'));
    if (kind === 'before-managed-session-update') {
        return phase === 'before' && description.command === 'UPDATE' && description.relations.includes('auth_session') && versionPredicate && /^(?:[a-z0-9_]+\.)?row_version$/.test(returning) && !/\b(?:coalesce|least)\s*\(/.test(shape);
    }
    if (kind === 'after-org-version-precheck') {
        return phase === 'after' && description.command === 'SELECT' && description.relations.includes('org_unit') && versionPredicate && /^select\s+(?:[a-z0-9_]+\.)?id\s+from\b/.test(shape) && /\border by\s+(?:[a-z0-9_]+\.)?id\s+asc\b/.test(shape) && !/\bfor\s+(?:update|share|no key update|key share)\b/.test(shape);
    }
    return matchesBarrier(kind, phase, description);
}

module.exports = { matchesBehaviorBarrier };
