import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import ts from 'typescript';

test('actual secret format guard never includes a rejected value in stderr', () => {
    const source = readFileSync(new URL('./database-environment.mjs', import.meta.url), 'utf8');
    const ast = ts.createSourceFile('database-environment.mjs', source, ts.ScriptTarget.Latest, true);
    const functions = ast.statements.filter((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'validateAppSecret');
    assert.equal(functions.length, 1);
    const implementation = functions[0].getText(ast);
    const secret = 'synthetic-NONHEX-password-DO-NOT-LOG';
    const child = spawnSync(process.execPath, ['--input-type=module'], {
        input: `${implementation}\nvalidateAppSecret(process.env.R1C_SYNTHETIC_SECRET);`,
        env: { R1C_SYNTHETIC_SECRET: secret },
        encoding: 'utf8'
    });
    assert.equal(child.status, 1);
    assert(child.stderr.includes('R1C secret format mismatch'));
    assert(!child.stdout.includes(secret) && !child.stderr.includes(secret));
});
