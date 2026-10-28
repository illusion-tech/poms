import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { assertSourceGuard, buildArtifacts, operationCount, reachableSchemas } from './export-users.mjs';

const artifacts=buildArtifacts();
const artifact=name=>JSON.parse(artifacts.get('tools/rust-r2d/'+name+'.json'));
test('eleven exact original operations retain full metadata without external identity routes',()=>{
    const original=JSON.parse(readFileSync(new URL('../../libs/shared/api-spec/openapi.json',import.meta.url),'utf8'));
    const spec=artifact('users-openapi');
    assert.equal(Object.keys(spec.paths).length,8);
    assert.equal(operationCount(spec.paths),11);
    for(const [route,value] of Object.entries(spec.paths)) assert.deepEqual(value,original.paths[route]);
    assert(spec.paths['/api/platform/users'].post.responses['200']);
    assert(!spec.paths['/api/platform/users'].post.responses['201']);
    assert(!Object.keys(spec.paths).some(route=>route.includes('external-identities')));
    const reachable=reachableSchemas(spec,Object.keys(spec.paths));
    assert.deepEqual([...reachable].sort(),Object.keys(spec.components.schemas).sort());
    for(const name of reachable) assert.deepEqual(spec.components.schemas[name],original.components.schemas[name]);
});
test('actual schema oracle keeps admin/self/create boundaries, defaults and UUID spelling',()=>{
    const doc=artifact('users-golden');
    const find=(schema,name)=>doc.cases.find(value=>value.schema===schema&&value.name===name);
    assert.equal(Object.keys(doc.schemaKeys).length,6);
    assert.equal(doc.nonWireCases,6);
    assert.equal(doc.cases.length,doc.wireCases+doc.nonWireCases);
    assert.deepEqual(JSON.parse(find('CreatePlatformUserRequest','minimal').expected.dataRaw),{username:' User ',displayName:' Name ',primaryOrgUnitId:null,initialRoleIds:[]});
    assert(!find('AssignUserOrgMembershipsRequest','primaryOrgUnitId:uuid-14').expected.success);
    assert(find('UpdatePlatformUserRequest','unknown-only').expected.success);
    assert(!find('UpdateCurrentUserProfileRequest','unknown-only').expected.success);
    assert.equal(JSON.parse(find('UpdatePlatformUserRequest','displayName:space').expected.dataRaw).displayName,' ');
    assert(!find('UpdateCurrentUserProfileRequest','displayName:space').expected.success);
    assert(find('CreatePlatformUserRequest','displayName:astral-at-limit').expected.success);
    assert(!find('CreatePlatformUserRequest','displayName:astral-above-limit').expected.success);
    assert.equal(JSON.parse(find('CreatePlatformUserRequest','primaryOrgUnitId:uuid-1').expected.dataRaw).primaryOrgUnitId,'A0000000-0000-4000-8000-000000000001');
    assert.equal(JSON.parse(find('UpdatePlatformUserRequest','displayName:lone-high').expected.dataRaw).displayName.charCodeAt(0),0xd800);
    assert.equal(JSON.parse(find('UpdatePlatformUserActivationRequest','expectedVersion:1.00000000000000001').expected.dataRaw).expectedVersion,1);
    assert.deepEqual(find('UpdateCurrentUserProfileRequest','protected:avatarUrl').expected.errors.at(-1).keys,['avatarUrl']);
});
test('source guard detects working, hidden staged and protected-untracked drift in an isolated real Git repository', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'poms-r2d-guard-'));
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
        assert(path.resolve(directory).startsWith(path.resolve(tmpdir()) + path.sep) && path.basename(directory).startsWith('poms-r2d-guard-'));
        rmSync(directory, { recursive: true, force: true });
    }
});

test('single-way export is deterministic and generated files match',()=>{
    assert.deepEqual([...buildArtifacts()],[...artifacts]);
    for(const [file,bytes] of artifacts) assert.equal(readFileSync(new URL('../../'+file,import.meta.url),'utf8'),bytes);
    assert.deepEqual(artifact('users-source').sourceGuard.axes,['working','index','untracked']);
});
