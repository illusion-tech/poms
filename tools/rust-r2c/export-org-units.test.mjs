import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { assertSourceGuard, buildArtifacts, operationCount, reachableSchemas } from './export-org-units.mjs';

const artifacts = buildArtifacts();
const artifact = (name) => JSON.parse(artifacts.get(`tools/rust-r2c/${name}.json`));
test('eight original operations preserve complete metadata and recursive tree schema', () => {
    const original = JSON.parse(readFileSync(new URL('../../libs/shared/api-spec/openapi.json', import.meta.url), 'utf8'));
    const spec = artifact('org-units-openapi');
    assert.equal(Object.keys(spec.paths).length, 6);
    assert.equal(operationCount(spec.paths), 8);
    for (const [route, value] of Object.entries(spec.paths)) assert.deepEqual(value, original.paths[route]);
    assert(spec.paths['/api/platform/org-units'].post.responses['200']);
    assert(!spec.paths['/api/platform/org-units'].post.responses['201']);
    const reachable = reachableSchemas(spec, Object.keys(spec.paths));
    assert(reachable.has('OrgUnitTreeNode'));
    for (const name of reachable) assert.deepEqual(spec.components.schemas[name], original.components.schemas[name]);
    assert.deepEqual([...reachable].sort(), Object.keys(spec.components.schemas).sort());
});
test('actual source cases retain code-point limits, uppercase UUID, strip and JSON number rounding', () => {
    const golden = artifact('org-units-golden');
    const find = (schema, name) => golden.cases.find((value) => value.schema === schema && value.name === name);
    assert(find('CreateOrgUnitRequest', 'name:astral-at-limit').expected.success);
    assert(!find('CreateOrgUnitRequest', 'name:astral-above-limit').expected.success);
    assert.equal(JSON.parse(find('CreateOrgUnitRequest', 'parentId:"A0000000-0000-4000-8000-000000000001"').expected.dataRaw).parentId, 'A0000000-0000-4000-8000-000000000001');
    assert(!find('MoveOrgUnitRequest', 'reason-only').expected.success);
    assert(find('MoveOrgUnitRequest', 'null-parent').expected.success);
    assert.equal(JSON.parse(find('UpdateOrgUnitRequest', 'displayOrder:1.00000000000000001').expected.dataRaw).displayOrder, 1);
    assert.deepEqual(JSON.parse(find('CreateOrgUnitRequest', 'strip').expected.dataRaw), { name: 'Name', code: 'Code' });
    assert.equal(JSON.parse(find('CreateOrgUnitRequest', 'name:lone-high').expected.dataRaw).name.charCodeAt(0), 0xd800);
    assert.equal(golden.cases.length, golden.wireCases + golden.nonWireCases);
    assert.equal(golden.nonWireCases, 3);
});
test('source guard detects working, hidden staged and protected-untracked drift in an isolated real Git repository', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'poms-r2c-guard-'));
    const git = (args) => execFileSync('git', args, { cwd: directory, windowsHide: true, stdio: 'pipe', encoding: 'utf8' }).trim();
    try {
        git(['init', '--quiet']);
        writeFileSync(path.join(directory, 'package.json'), '{}\n');
        git(['add', 'package.json']);
        git(['-c', 'user.name=POMS source guard test', '-c', 'user.email=guard@example.invalid', 'commit', '--quiet', '-m', 'fixture']);
        const reference = git(['rev-parse', 'HEAD']);
        assert.doesNotThrow(() => assertSourceGuard(directory, reference));
        writeFileSync(path.join(directory, 'package.json'), '{"modified":true}\n');
        assert.throws(() => assertSourceGuard(directory, reference));
        git(['add', 'package.json']);
        writeFileSync(path.join(directory, 'package.json'), '{}\n');
        assert.equal(git(['diff', reference, '--', 'package.json']), '');
        assert.throws(() => assertSourceGuard(directory, reference), 'staged drift remains visible when working bytes equal HEAD');
        git(['restore', '--staged', 'package.json']);
        mkdirSync(path.join(directory, 'apps/poms-api/src'), { recursive: true });
        writeFileSync(path.join(directory, 'apps/poms-api/src/unknown.ts'), 'export {};\n');
        assert.throws(() => assertSourceGuard(directory, reference));
    } finally {
        assert(path.resolve(directory).startsWith(path.resolve(tmpdir()) + path.sep) && path.basename(directory).startsWith('poms-r2c-guard-'));
        rmSync(directory, { recursive: true, force: true });
    }
});
test('single-way generation is deterministic and matches checked-in artifacts', () => {
    assert.deepEqual([...buildArtifacts()], [...artifacts]);
    for (const [name, text] of artifacts) assert.equal(readFileSync(new URL(`../../${name}`, import.meta.url), 'utf8'), text);
    assert.deepEqual(artifact('org-units-source').sourceGuard.axes, ['working', 'index', 'untracked']);
});
