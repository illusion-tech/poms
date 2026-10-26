import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildArtifacts } from './export-roles.mjs';

const artifacts = buildArtifacts();
const artifact = (name) => JSON.parse(artifacts.get(`tools/rust-r2b/${name}.json`));

test('all eight original operations and six paths retain complete original metadata', () => {
    const original = JSON.parse(readFileSync(new URL('../../libs/shared/api-spec/openapi.json', import.meta.url), 'utf8'));
    const subset = artifact('roles-openapi');
    assert.equal(Object.keys(subset.paths).length, 6);
    let count = 0;
    for (const [path, methods] of Object.entries(subset.paths)) {
        assert.deepEqual(methods, original.paths[path]);
        count += Object.keys(methods).length;
        assert(!Object.hasOwn(methods, 'delete'));
    }
    assert.equal(count, 8);
    assert(subset.paths['/api/platform/roles'].post.responses['200']);
    assert(!subset.paths['/api/platform/roles'].post.responses['201']);
});

test('original service dictionary and minima remain separate from bootstrap defaults', () => {
    const authority = artifact('roles-authority');
    assert.equal(authority.permissions.length, 37);
    assert.deepEqual(Object.keys(authority.minimumPermissions), ['platform-admin', 'project-viewer']);
    assert.equal(authority.minimumPermissions['platform-admin'].length, 37);
    assert.equal(authority.minimumPermissions['project-viewer'].length, 6);
    assert(!authority.minimumPermissions['project-viewer'].includes('customer:read'));
    assert(authority.permissions.every((entry) => entry.name === entry.key && entry.deprecatedBy === null && entry.status === 'active'));
});

test('actual source oracle preserves Zod code points, strip and UTF16 values', () => {
    const cases = artifact('roles-golden').cases;
    const find = (suffix) => cases.find((entry) => entry.name === suffix);
    assert.equal(find('CreateRoleRequest:roleKey-astral-64').expected.success, true);
    assert.equal(find('CreateRoleRequest:roleKey-astral-65').expected.success, false);
    assert.equal(JSON.parse(find('CreateRoleRequest:roleKey-surrogate').expected.dataRaw).roleKey.charCodeAt(0), 0xd800);
    assert.deepEqual(JSON.parse(find('CreateRoleRequest:strip').expected.dataRaw), { roleKey: 'key', name: 'Name' });
    assert.equal(find('UpdateRoleRequest:strip-only').expected.errors[0].message, 'At least one field is required for update');
    assert.equal(find('UpdateRoleRequest:number-2147483648').expected.success, true);
});

test('generation is deterministic and binds all three original-source guard axes', () => {
    assert.deepEqual([...buildArtifacts()], [...artifacts]);
    const source = artifact('roles-source');
    assert.deepEqual(source.sourceGuard.axes, ['working', 'index', 'untracked']);
    assert(source.sources.some((entry) => entry.path.endsWith('platform.service.ts')));
    assert(source.sources.some((entry) => entry.path.endsWith('shared-contracts.ts')));
    for (const [path, value] of artifacts) assert.equal(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8'), value);
});
