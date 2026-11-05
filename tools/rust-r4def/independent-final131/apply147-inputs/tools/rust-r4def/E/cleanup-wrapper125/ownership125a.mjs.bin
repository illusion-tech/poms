// Import-safe incremental ownership pass. The frozen125 result remains intact.
import assert from 'node:assert/strict';
import { normalizeCatalog70, rowFingerprint70 } from '../cleanup70/core70.mjs';
import { buildOwnership125 } from './ownership125.mjs';
import { derive125a } from './rules125a.mjs';
export { normalizeHTTP103, normalizeHTTP125 as normalizeHTTP125a, diagnoseRows103, diagnoseRows125 as diagnoseRows125a, sanitize103 } from './ownership125.mjs';
const stable = v => Array.isArray(v) ? v.map(stable) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, stable(v[k])])) : v;
const key = (table, pk) => table + ':' + JSON.stringify(stable(pk));
export function buildOwnership103(input) {
    const result = buildOwnership125(input), catalog = normalizeCatalog70(input.catalog), allRows = [];
    for (const table of catalog.tables) for (const value of input.liveRows[table]) {
        const raw = typeof value === 'string' ? value : typeof value?.raw === 'string' ? value.raw : JSON.stringify(value), row = JSON.parse(raw);
        const primaryKey = Object.fromEntries(catalog.primaryKeys.get(table).map(c => [c, row[c]]));
        allRows.push({ table, row, raw, primaryKey, key: key(table, primaryKey), rowFingerprint: rowFingerprint70(raw) });
    }
    const claims = new Map(result.ledger.rows.map(r => [key(r.table, r.primaryKey), r]));
    // The extra pass can only consume exact PKs that the real125 pass already
    // classified as new/unclaimed. It cannot claim a baseline or create rows.
    const eligible = new Set(result.unclaimed.map(r => key(r.table, r.primaryKey)));
    for (let changed = true; changed;) {
        changed = false;
        for (const p of derive125a({ allRows, claimMap: claims, receipts: input.HTTPReceipts.filter(r => r.backend === input.backend) })) {
            if (!eligible.has(p.record.key) || claims.has(p.record.key)) continue;
            assert(p.receiptIds.length && p.parents.every(k => claims.has(k)));
            claims.set(p.record.key, { table: p.record.table, primaryKey: p.record.primaryKey, rowFingerprint: p.record.rowFingerprint,
                beforeAbsent: true, producerKind: p.producerKind, receiptIds: p.receiptIds, reason: p.reason, derivedFrom: p.parents });
            changed = true;
        }
    }
    result.ledger.rows = [...claims.values()];
    result.unclaimed = result.unclaimed.filter(r => !claims.has(key(r.table, r.primaryKey)));
    result.counts = { ...result.counts, claimed: claims.size, unclaimed: result.unclaimed.length };
    return result;
}
export { buildOwnership103 as buildOwnership125a };
