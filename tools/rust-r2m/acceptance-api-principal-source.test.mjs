import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {SourceReader} from './acceptance-source.mjs';
import {readonlyPrincipalLoginSources,verifyReadonlyPrincipalLoginSource} from './acceptance-api-principal-source.mjs';
const root=path.resolve(import.meta.dirname,'../..');
test('the exact original real-login call chain creates only a new AuthSession and grants no seed-principal field lease',()=>{
    const reader=new SourceReader({root,pins:readonlyPrincipalLoginSources.map(pin=>({...pin,bytes:fs.readFileSync(path.join(root,pin.file)).length})),sourceEpoch:'pure-principal-source-only'}),value=verifyReadonlyPrincipalLoginSource(reader);assert.equal(value.realLoginRequired,true);assert.equal(value.principalWritesPermitted,false);assert.equal(value.fullSeedRowSnapshotStillRequired,true);assert.equal(value.actualLoginExecuted,false);
});
test('a changed login implementation cannot reuse this readonly-principal source certificate',()=>{
    assert.throws(()=>verifyReadonlyPrincipalLoginSource({read(file){return Buffer.concat([fs.readFileSync(path.join(root,file)),Buffer.from('\n')])},assertUnchanged(){}}));
});
