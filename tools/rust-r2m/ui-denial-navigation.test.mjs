// Source/layout and controlled page protocol only. No browser, HTTP or DB.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {returnToOriginalDashboardForLogout} from './acceptance-ui-browser.mjs';
const require=createRequire(import.meta.url),ts=require('typescript');
const origin='http://127.0.0.1:10080';

test('the original guarded users route denies into the separate auth layout; only the dashboard layout contains TopBar',()=>{
    const authGuard=()=>{},permissionGuard=()=>{},exports={};
    const source=fs.readFileSync('apps/poms-admin/src/app.routes.ts','utf8');
    const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    vm.runInNewContext(output,{exports,require(specifier){assert(['./app/core/auth/auth.guard','./app/core/auth/permission.guard'].includes(specifier));return{authGuard,permissionGuard}}});
    const application=exports.appRoutes.find(route=>route.path===''),authentication=exports.appRoutes.find(route=>route.path==='auth');
    const users=application.children.find(route=>route.path==='platform/users');
    assert.strictEqual(users.canActivate[0],permissionGuard);
    assert.equal(users.data.requiredPermissions[0],'platform:users:manage');
    assert(application.children.some(route=>route.path==='dashboard'));
    assert(authentication.children.some(route=>route.path==='access'));
    const guard=fs.readFileSync('apps/poms-admin/src/app/core/auth/permission.guard.ts','utf8');
    assert(guard.includes("router.createUrlTree(['/auth/access']"));
    assert(fs.readFileSync('apps/poms-admin/src/app/layout/components/app.layout.ts','utf8').includes('<div app-topbar>'));
    assert(!fs.readFileSync('apps/poms-admin/src/app/layout/components/app.authlayout.ts','utf8').includes('app-topbar'));
});

test('after denial, a real dashboard navigation completes and its actual profile control becomes visible before logout can continue',async()=>{
    const events=[];let location=origin+'/auth/access?returnUrl=%2Fplatform%2Fusers',bridgeReady=false;
    const locator={kind:'original-topbar-profile-control'};
    const page={async goto(url){assert.equal(url,origin+'/dashboard');events.push('navigation');location=url},async waitForURL(predicate){assert(predicate(new URL(location)));events.push('dashboard-route')},async waitForFunction(predicate){assert(predicate.toString().includes('__pomsR2MAcceptance'));bridgeReady=true;events.push('bridge-ready')},locator(selector){assert.equal(selector,'.profile-item > .right-sidebar-button');return locator}};
    const expect=actual=>({async toBeVisible(){assert.strictEqual(actual,locator);assert.equal(new URL(location).pathname,'/dashboard');assert.equal(bridgeReady,true);events.push('visible-original-topbar')}});
    await returnToOriginalDashboardForLogout(page,origin,expect);
    assert.deepEqual(events,['navigation','dashboard-route','bridge-ready','visible-original-topbar']);
});

test('navigation failure preserves its original error and cannot fake a visible TopBar or continue logout',async()=>{
    const error=new Error('controlled original navigation failure');let visibilityChecks=0;
    await assert.rejects(()=>returnToOriginalDashboardForLogout({async goto(){throw error}},origin,()=>{visibilityChecks++}),actual=>actual===error);
    assert.equal(visibilityChecks,0);
    await assert.rejects(()=>returnToOriginalDashboardForLogout({},'http://127.0.0.1:9999',()=>{}));
});
