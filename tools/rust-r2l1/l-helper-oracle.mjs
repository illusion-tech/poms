// Finite pure original-source oracle. No service construction, ORM, PG,
// filesystem fixture or network operation is performed.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const { BadRequestException, ConflictException } = require('@nestjs/common');
const root = fileURLToPath(new URL('../../', import.meta.url));
const approvalPath = 'apps/poms-api/src/app/features/approval/approval.service.ts';
const confirmationPath = 'apps/poms-api/src/app/features/approval/confirmation.service.ts';
const hash = (value) => createHash('sha256').update(value).digest('hex');
const sources = [approvalPath, confirmationPath].map((path) => {
    const bytes = readFileSync(root + path);
    return { path, rawBytesSha256: hash(bytes), lfSha256: hash(bytes.toString('utf8').replaceAll('\r\n', '\n')) };
});
const approvalText = readFileSync(root + approvalPath, 'utf8');
const confirmationText = readFileSync(root + confirmationPath, 'utf8');
const parse = (path, text) => ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
const approval = parse(approvalPath, approvalText);
const confirmation = parse(confirmationPath, confirmationText);
function method(file, className, name) {
    const declaration = file.statements.find((node) => ts.isClassDeclaration(node) && node.name?.text === className);
    const result = declaration?.members.find((node) => ts.isMethodDeclaration(node) && node.name?.getText(file) === name);
    if (!result) throw new Error(`Original method is missing: ${className}.${name}`);
    return result;
}
const names = ['mapNodeName', 'mapPayoutStageName', 'mapAdjustmentTypeName'];
const functions = names.map((name) => {
    const declaration = approval.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
    if (!declaration) throw new Error(`Original function is missing: ${name}`);
    return declaration.getText(approval);
});
const constantNames = ['CONTRACT_REVIEW_NODE_KEY', 'COMMISSION_PAYOUT_NODE_KEY', 'COMMISSION_ADJUSTMENT_NODE_KEY'];
const constants = constantNames.map((name) => {
    const statement = approval.statements.find((node) => ts.isVariableStatement(node) && node.declarationList.declarations.some((item) => item.name.getText(approval) === name));
    if (!statement) throw new Error(`Original constant is missing: ${name}`);
    return statement.getText(approval);
});
const reject = method(approval, 'ApprovalService', 'rejectRecord');
const commentStatement = reject.body.statements.find((node) => ts.isVariableStatement(node) && node.declarationList.declarations.some((item) => item.name.getText(approval) === 'comment'));
if (!commentStatement) throw new Error('Original rejection comment expression is missing');
const originalCode = [
    ...constants,
    ...functions,
    `class OriginalChecks { ${method(confirmation, 'ConfirmationService', 'assertExpectedVersion').getText(confirmation)} ${method(confirmation, 'ConfirmationService', 'assertParticipantInput').getText(confirmation)} }`,
    `function originalReason(input) { ${commentStatement.getText(approval)} return comment; }`,
    'module.exports = { OriginalChecks, mapNodeName, mapPayoutStageName, mapAdjustmentTypeName, originalReason };'
].join('\n');
const compiled = ts.transpileModule(originalCode, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const module = { exports: {} };
new Function('module', 'BadRequestException', 'ConflictException', compiled)(module, BadRequestException, ConflictException);
const original = module.exports;
const checks = new original.OriginalChecks();
const cases = [];
for (const [label, expected] of [['undefined', undefined], ['null', null], ['one', 1], ['fraction', 1.5], ['zero', 0], ['exponent', 1e21], ['nan', NaN], ['infinity', Infinity]]) {
    let error = null;
    try { checks.assertExpectedVersion(1, expected, 'confirmation-record'); }
    catch (failure) { error = { status: failure.getStatus(), message: failure.message }; }
    cases.push({ helper: 'expectedVersion', label, actual: 1, expectedKind: label, expected: error });
}
for (const participants of [[], ['a'], ['a', 'b'], ['abc', 'ABC'], ['\ud800', '\ud800']]) {
    let error = null;
    try { checks.assertParticipantInput(participants.map((participantId) => ({ participantId }))); }
    catch (failure) { error = { status: failure.getStatus(), message: failure.message }; }
    cases.push({ helper: 'participants', input: participants, expected: error });
}
for (const [helper, values] of [
    ['mapNodeName', ['contract-review', 'commission-payout-approval', 'commission-adjustment-approval', 'unknown', '\ud800']],
    ['mapPayoutStageName', ['first', 'second', 'final', 'retention', '', '\ud800']],
    ['mapAdjustmentTypeName', ['suspend-payout', 'reverse-payout', 'clawback', 'supplement', 'recalculate', '', '\ud800']]
]) {
    for (const input of values) cases.push({ helper, input, expected: original[helper](input) });
}
for (const [label, comment] of [['undefined', undefined], ['null', null], ['empty', ''], ['space', ' '], ['raw', '\udfff']]) {
    cases.push({ helper: 'reason', label, reason: '\ud800', ...(comment === undefined ? {} : { comment }), expected: original.originalReason({ reason: '\ud800', ...(comment === undefined ? {} : { comment }) }) });
}
const output = {
    formatVersion: 1,
    kind: 'pure-original-source-helper-oracle',
    originalServiceOrmPgNetworkExecuted: false,
    sources,
    extractedOriginalCodeSha256: hash(originalCode),
    cases
};
const target = fileURLToPath(new URL('./l-helper-golden.json', import.meta.url));
const serialized = JSON.stringify(output, null, 2) + '\n';
if (process.argv.includes('--check')) {
    if (readFileSync(target, 'utf8') !== serialized) throw new Error('Original helper golden differs');
} else {
    writeFileSync(target, serialized, 'utf8');
}
process.stdout.write(`${JSON.stringify({ kind: output.kind, result: 'Pass', cases: cases.length, originalServiceOrmPgNetworkExecuted: false })}\n`);
