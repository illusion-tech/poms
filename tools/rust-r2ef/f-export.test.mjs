import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { ROOT, buildArtifacts } from './f-export.mjs';

test('F generated inputs exactly regenerate from original authority', async () => {
    for (const [path, text] of await buildArtifacts()) assert.equal(readFileSync(resolve(ROOT, path), 'utf8'), text, path);
});

test('F corpus covers four schemas, coerce, timestamps and body stripping', () => {
    const corpus = JSON.parse(readFileSync(resolve(ROOT, 'tools/rust-r2ef/f-golden.json'), 'utf8'));
    assert.equal(corpus.schemas.length, 4);
    for (const schema of corpus.schemas) assert(corpus.cases.some(entry => entry.schema === schema && entry.name === 'unknown-strip' && entry.expected.success));
    assert(corpus.cases.some(entry => entry.name === 'limit:hex' && entry.expected.success));
    assert(corpus.cases.some(entry => entry.name === 'reverse-range' && entry.expected.success));
    assert(corpus.cases.some(entry => entry.name === 'duplicate-permissions' && entry.expected.success));
});
