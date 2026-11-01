// Source evidence for the two frozen readonly decision principals. This grants
// no write/lease and never reads credentials or a private environment.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript'),sha=raw=>createHash('sha256').update(raw).digest('hex');
export const readonlyPrincipalLoginSources=Object.freeze([
    {file:'apps/poms-api/src/app/core/auth/auth.controller.ts',rawBytesSha256:'503ef7836a9141bf11e50ef22a07d0a26e593466d6ee4edbb9e32c40fc8f46e9'},
    {file:'apps/poms-api/src/app/core/auth/auth-session.service.ts',rawBytesSha256:'d7b3d4f9115a542244dd33b859ce9b08ece45c10908ce3a469c01919418dad89'},
    {file:'apps/poms-api/src/app/core/auth/auth-session.repository.ts',rawBytesSha256:'9757f1eedc9640875b4328a04f8129149f1c9191eefebae8f35ac7cb2a890622'},
    {file:'apps/poms-api/src/app/features/platform/platform.service.ts',rawBytesSha256:'b46095aedad3405cd3f5e80cb18d6d1102a7bcf1bfe8af7a28da66fc3688f0db'}
]);
function method(ast,name){const found=[];const visit=node=>{if(ts.isMethodDeclaration(node)&&node.name?.getText(ast)===name)found.push(node);ts.forEachChild(node,visit)};visit(ast);assert.equal(found.length,1,'One locked original login/profile method required');return found[0].getText(ast)}
export function verifyReadonlyPrincipalLoginSource(reader){
    const texts=[];for(const pin of readonlyPrincipalLoginSources){const raw=reader.read(pin.file);assert.equal(sha(raw),pin.rawBytesSha256,'Original readonly-principal login source changed');texts.push(raw.toString('utf8'))}const ast=texts.map((source,index)=>ts.createSourceFile(readonlyPrincipalLoginSources[index].file,source,ts.ScriptTarget.Latest,true));
    assert(method(ast[0],'createPasswordAuthSession').includes('this.platformService.verifyCredentials('));assert(method(ast[0],'#createSessionResponse').includes('this.authSessionService.createSession(userId,'));const session=method(ast[1],'createSession');assert(session.includes('this.authSessionRepository.createSession({')&&session.includes('this.authSessionRepository.saveAll([session])'));assert(!session.includes('this.platformService.'));assert(method(ast[2],'saveAll').includes('persist(entities).flush()'));
    for(const name of['verifyCredentials','resolveActiveAuthUser','getSanitizedUserProfile']){const body=method(ast[3],name);assert(!/\b(?:saveAll|nativeUpdate|nativeDelete|persist|flush)\s*\(/.test(body),'Original login user/profile lookup must be read only');assert(!/\.lastLoginAt\s*=/.test(body))}
    reader.assertUnchanged();return{kind:'R2M-original-readonly-principal-login-source',sources:readonlyPrincipalLoginSources,realLoginRequired:true,principalWritesPermitted:false,lastLoginAtWriteObservedInSource:false,ownedAuthSessionCreationSeparate:true,fullSeedRowSnapshotStillRequired:true,actualLoginExecuted:false};
}
