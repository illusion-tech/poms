// Promote the exact independently frozen SQL; no SQL is executed here.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const authority = JSON.parse(fs.readFileSync('docs/design/rust-r4def/g1-gate-authority07.json', 'utf8'));
assert(authority.G1Certified && authority.G2Authorized);
const manifest = JSON.parse(fs.readFileSync(authority.inputManifest.file, 'utf8'));
const input = manifest.outputs.find(p => p.file.endsWith('/schema06.sql'));
const bytes = fs.readFileSync(input.file);
assert.equal(createHash('sha256').update(bytes).digest('hex'), input.rawBytesSha256);
const file = 'apps/poms-api/src/migrations/Migration20261104060000_rust_r4def_execution_cost.ts';
assert(!fs.existsSync(file));
fs.writeFileSync(file, `import { Migration } from '@mikro-orm/migrations';\n\n/** SQL-first R4 DEF input ${authority.inputManifest.rawBytesSha256}. */\nexport class Migration20261104060000 extends Migration {\n    override async up(): Promise<void> {\n        this.addSql(${JSON.stringify(bytes.toString('utf8'))});\n    }\n}\n`, { flag: 'wx' });
console.log(JSON.stringify({ migration: file, sourceSqlSha256: input.rawBytesSha256, sqlExecuted: false }));
