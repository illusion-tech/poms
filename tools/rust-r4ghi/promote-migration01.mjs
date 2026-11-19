// Root SQL-first promotion. The frozen SQL remains a separate immutable input.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const sha = value => createHash('sha256').update(value).digest('hex');
const frozen = 'tools/rust-r4ghi/joint-g1/effective-v2/migration.sql';
const delta = 'docs/design/rust-r4ghi/g2-corrective01.sql';
const raw = fs.readFileSync(frozen);
assert.equal(sha(raw), 'ee5305d17f692efa97a66ded226ce041d95bb1926667a62f709e0118f11f5c00');
const sql = raw.toString('utf8').trimEnd() + '\n\n-- Root G2 concrete corrective delta; baseline-only is not a risk evaluation.\n' + fs.readFileSync(delta, 'utf8');
const target = 'apps/poms-api/src/migrations/Migration20261107060000_rust_r4ghi_operating_lifecycle.ts';
const source = 'import { Migration } from "@mikro-orm/migrations";\n\n/** SQL-first R4 GHI + minimal R5; frozen input and explicit corrective delta. */\nexport class Migration20261107060000 extends Migration {\n    override async up(): Promise<void> {\n        this.addSql(' + JSON.stringify(sql) + ');\n    }\n}\n';
fs.writeFileSync(target, source, { flag: 'wx' });
const receipt = { kind: 'Root-SQL-first-forward-migration-promotion', capturedAt: new Date().toISOString(), frozen, frozenSHA256: sha(raw), delta, deltaSHA256: sha(fs.readFileSync(delta)), combinedSQLSHA256: sha(Buffer.from(sql)), target, targetSHA256: sha(Buffer.from(source)), migrationCountBefore: 94, migrationCountAfter: 95, plannedTablesAfter: 139, executed: false, productionDeploymentCertified: false };
fs.writeFileSync('docs/design/rust-r4ghi/migration-promotion01.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(receipt));
