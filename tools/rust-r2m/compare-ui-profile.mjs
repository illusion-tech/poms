// Finite source predicates. Counts, epochs and exact files belong to case input.
import assert from 'node:assert/strict';
export const functionalHeaders=Object.freeze(['content-type','content-length','content-disposition','x-request-id']);
export const journeySteps=Object.freeze({
    UI1:Object.freeze([
        ['anonymous-deep-link','actual-ui'],['login-restore','actual-ui'],
        ['expired-session','angular-fixed-bridge'],['relogin-and-topbar-logout','actual-ui']
    ]),
    UI2:Object.freeze([
        ['setting-write','actual-ui'],['wrong-csrf-preserves-auth','angular-fixed-bridge'],
        ['viewer-route-and-backend-denial','actual-ui-and-angular-fixed-bridge']
    ])
});
export function uiProfile(profile){
    const journeys=profile.journeys??[profile.journey];assert(Array.isArray(journeys)&&journeys.length>0&&new Set(journeys).size===journeys.length&&journeys.every(j=>Object.hasOwn(journeySteps,j)),'Only the explicitly implemented UI1/UI2 journeys may be compared');assert.equal(journeys[0],'UI1');if(journeys.includes('UI2'))assert.deepEqual(journeys,['UI1','UI2']);
    assert(['original-cache-input','controlled-uncached'].includes(profile.cacheMode));assert.deepEqual(profile.functionalHeaders,functionalHeaders,'Only the already frozen functional header scope');assert.equal(profile.cacheEquivalenceCertified,false);assert(profile.expectedHttpCount&&['nest','rust'].every(b=>Number.isSafeInteger(profile.expectedHttpCount[b])&&profile.expectedHttpCount[b]>0&&profile.expectedHttpCount[b]<=256));
    assert(profile.expectedTableCounts&&Object.values(profile.expectedTableCounts).every(n=>Number.isSafeInteger(n)&&n>=0&&n<512));if(journeys.includes('UI2'))assert.equal(profile.settingValue,51);else assert(!Object.hasOwn(profile.expectedTableCounts,'audit_log'));
    return{...profile,journeys,steps:journeys.flatMap(journey=>journeySteps[journey].map(([id,kind])=>({journey,id,kind}))),expectedOwned:Object.values(profile.expectedTableCounts).reduce((a,b)=>a+b,0)};
}
export function assertObservedJourneys(report,profile){
    const selected=uiProfile(profile);assert.deepEqual(report.selection,selected.journeys);assert.deepEqual(report.observation.selection,selected.journeys);assert.deepEqual(report.observation.journeys.map(j=>j.id),selected.journeys);
    const actual=report.observation.journeys.flatMap(j=>{assert.equal(j.result,'observed');return j.steps.map(s=>({journey:j.id,...s}))});assert.equal(actual.length,selected.steps.length);
    for(const[at,step]of actual.entries()){assert.equal(step.journey,selected.steps[at].journey);assert.equal(step.id,selected.steps[at].id);assert.equal(step.kind,selected.steps[at].kind);assert.equal(step.result,'observed');assert(/^[0-9a-f]{64}$/.test(step.evidenceSha256));}
    return{selected,actual};
}
