import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { repairModelText } from './repair-generated-models.mjs';
const ts = createRequire(import.meta.url)('typescript');
const document = (schemas) => ({ components: { schemas } });
const nullSchema = { type: 'object', nullable: true, enum: [null] };
const repair = (text, schema, targets) => repairModelText(text, document(schema), 'model/test.ts', targets);

test('a null-only enum is narrowed to null and rejects the original numeric counterexample', () => {
    const result = repair('export interface Test { hidden: TestHiddenEnum | null; }\nexport enum TestHiddenEnum {}', { Test: { type: 'object', properties: { hidden: nullSchema }, required: ['hidden'] } });
    assert.match(result.text, /type TestHiddenEnum = null/);
    const source = result.text + '\nconst invalid: Test["hidden"] = 0;\nconst valid: null = ({} as Test).hidden;';
    const host = ts.createCompilerHost({ noLib: true, strict: true });
    host.getSourceFile = (file) => file === 'case.ts' ? ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true) : undefined;
    const program = ts.createProgram(['case.ts'], { noLib: true, strict: true, noEmit: true }, host);
    const errors = program.getSemanticDiagnostics().filter((error) => error.code === 2322);
    assert.equal(errors.length, 1);
    assert.match(ts.flattenDiagnosticMessageText(errors[0].messageText, '\n'), /0.*null/);
});

test('boolean enums become exact literal types with equivalent named values', () => {
    const result = repair('export interface Test { unchanged: TestUnchangedEnum; }\nexport enum TestUnchangedEnum { True = true }', { Test: { properties: { unchanged: { enum: [true] } }, required: ['unchanged'] } });
    assert.match(result.text, /type TestUnchangedEnum = true/);
    assert.match(result.text, /const TestUnchangedEnum = \{ True: true \} as const/);
    const direct = repair('export interface Test { authenticated: boolean; }', { Test: { properties: { authenticated: { type: 'boolean', enum: [false] } } } });
    assert.match(direct.text, /authenticated: false/);
});

test('referenced alternatives stay a union of the actual imported model types', () => {
    const result = repair("import { Source } from './source';\nimport { Manual } from './manual';\nexport interface Test { kind: TestKindEnum; fakeMergedField: string; }\nexport enum TestKindEnum { Manual = 'manual' }", { Test: { anyOf: [{ $ref: '#/components/schemas/Source' }, { $ref: '#/components/schemas/Manual' }] }, Source: {}, Manual: {} });
    assert.match(result.text, /type Test = Source \| Manual/);
    assert.doesNotMatch(result.text, /fakeMergedField|enum TestKindEnum/);
});

test('collapsed nullable model is restored with a checked model-file import', () => {
    const schema = { Test: { anyOf: [{ $ref: '#/components/schemas/Actual' }, nullSchema] }, Actual: {} };
    const result = repair('export interface Test { wrongMergedField: string; }', schema, new Map([['Actual', 'model/actual.ts']]));
    assert.match(result.text, /import \{ Actual \} from '.\/actual'/);
    assert.match(result.text, /type Test = Actual \| null/);
    assert.throws(() => repair('export interface Test {}', schema), /Missing exact generated union target/);
});

test('conditional requirements do not become unconditional requirements', () => {
    const result = repair('export interface Test { weight: number; zeroWeightReason: string | null; always: string; }', { Test: { properties: { weight: { type: 'number' }, zeroWeightReason: {}, always: {} }, required: ['weight'], allOf: [{ required: ['always'] }, { oneOf: [{ required: ['zeroWeightReason'] }, {}] }] } });
    assert.match(result.text, /zeroWeightReason\?: string \| null/);
    assert.match(result.text, /always: string/);
});

test('unbound empty enums and mismatched literal values fail before synchronization', () => {
    assert.throws(() => repair('export enum Wrong {}', {}), /Unbound empty/);
    assert.throws(() => repair('export interface Test { unchanged: TestFlag; } export enum TestFlag { False = false }', { Test: { properties: { unchanged: { enum: [true] } } } }), /values differ/);
    assert.throws(() => repair('export interface Test { hidden: TestHidden | null; } export enum TestHidden { Number = 1 }', { Test: { properties: { hidden: nullSchema } } }), /Nonempty enum/);
});

test('ordinary nominal enums and a plain interface remain byte-identical', () => {
    const source = "export interface Test { kind: Kind; name: string; }\nexport enum Kind { First = 'first' }";
    assert.equal(repair(source, { Test: { properties: { kind: { type: 'string', enum: ['first'] }, name: { type: 'string' } } } }).text, source);
});
