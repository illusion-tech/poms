// Executes only exact pure schemas from Native build50's PUBLIC source map.
// Never load/require main.js, bootstrap Nest, connect ORM, inspect env or private.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const own = path.dirname(fileURLToPath(import.meta.url));
const root = process.platform === 'win32' ? 'E:/projects/worktrees/poms-r3hijk-next28/poms' : '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const dependencyRoot = process.platform === 'win32' ? root : '/home/wangzishi/projects/poms-rust-r4def';
const require = createRequire(path.join(dependencyRoot, 'package.json')), ts = require('typescript');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const mapFile = path.join(root, 'dist/apps/poms-api/main.js.map'), map = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
function source(suffix) { const matches = map.sources.map((file, index) => ({ file, text: map.sourcesContent[index] })).filter(v => v.file.endsWith(suffix)); if (matches.length !== 1) throw Error('Unique build50 source required:' + suffix); return matches[0]; }
const frozen = source('/src/app/core/rust-r4def-frozen-native-reference.ts'), shared = source('/libs/shared/contracts/src/lib/shared-contracts.ts');
function evaluatePure(input) {
  const javascript = ts.transpileModule(input.text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const context = vm.createContext({ module, exports: module.exports, require(name) { if (name !== 'zod' && name !== '@nestjs/common') throw Error('Forbidden pure-check import:' + name); return require(name); } });
  vm.runInContext(javascript, context, { filename: input.file, timeout: 20000 }); return module.exports;
}
const old = evaluatePure(frozen), currentDTO = evaluatePure(shared);
const invoice = { invoiceType: 'input', invoiceNumber: 'R4DEF53-PURE-SCHEMA-ONLY', invoiceAmount: '106.00', invoiceDate: '2026-11-04' };
const dtoParsed = currentDTO.CreateInvoiceRecordRequestSchema.parse(invoice);
const parsed = old.parseFrozenNativeReference(old.CreateInvoiceRecordRequestSchema, dtoParsed);
const patched = old.parseFrozenNativeReference(old.UpdateInvoiceRecordRequestSchema, { status: 'verified', expectedVersion: 1 });
let extraCurrencyStatus = null;
try { old.parseFrozenNativeReference(old.CreateInvoiceRecordRequestSchema, { ...invoice, currencyCode: 'CNY' }); } catch (error) { extraCurrencyStatus = error.getStatus?.() ?? null; }
const expense = { expenseCategory: 'legacy-probe', expenseDescription: 'PURE SCHEMA ONLY: not a persisted producer', expenseDate: '2026-11-04', currency: 'CNY', amountIncludingTax: '10.123', taxAmount: null, amountExcludingTax: null, sourceType: 'manual' };
const beforeExpense = old.CreateExpenseRecordRequestSchema.safeParse(expense), currentExpense = currentDTO.CreateExpenseRecordRequestSchema.safeParse(expense);
if (Object.hasOwn(parsed, 'currencyCode') || Object.hasOwn(dtoParsed, 'currencyCode') || patched.status !== 'verified' || extraCurrencyStatus !== 501 || !beforeExpense.success || !currentExpense.success) throw Error('Frozen/current schema route differs from expected pure evidence');
const { DecimalType } = require('@mikro-orm/core'); const decimal = new DecimalType();
const dbValue = decimal.convertToDatabaseValue('10.123', null);
if (dbValue !== '10.123') throw Error('Installed ORM decimal database conversion changed');
const output = {
  kind: 'Native-build50-exact-pure-schema-check53', createdAt: new Date().toISOString(),
  buildMap: { file: 'dist/apps/poms-api/main.js.map', bytes: fs.statSync(mapFile).size, rawBytesSha256: sha(fs.readFileSync(mapFile)) },
  sourcePins: [frozen, shared].map(v => ({ file: v.file, bytes: Buffer.byteLength(v.text), rawBytesSha256: sha(v.text) })),
  results: { currentInvoiceDtoWithoutCurrencyAccepted: true, currentDtoDidNotAddUndefinedCurrencyKey: true, frozenNativeInvoiceWithoutCurrencyAccepted: true, frozenNativeVerifiedPatchAccepted: true, frozenNewCurrencyKeyRejected501: true, frozenExpense10_123StringAccepted: true, currentExpenseDto10_123StringAccepted: true, actualMikroOrmDecimalConvertToDatabaseValue: dbValue },
  limitations: { actualHTTPExecuted: false, databaseConnected: false, NativeMainImported: false, privateRead: false, persistedNULLInvoiceProven: false, actualProbe93StoredSubcentProven: false, migration94RollbackExecuted: false, precisionRoute: 'Syntax/service/ORM path supports a probe; exact10.1230 still must be proven by real API+read-only PG on fresh93 before any migration attempt' },
};
fs.writeFileSync(path.join(own, 'pure-schema-check53.json'), JSON.stringify(output, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(output));
