// Fixed Windows test-input allowance only; the Linux/default25s path is exact.
import assert from'node:assert/strict';
export function windowsUiTransportProfile(arrangement){
    assert(arrangement?.kind==='Root-R2M-UI-runtime-arrangement'&&arrangement.browserPlatform==='win32'&&typeof arrangement.sourceCapId==='string');
    assert(['windows-managed-nest','windows-external-rust'].includes(arrangement.mode));
    const evidence=arrangement.mode==='windows-managed-nest'?arrangement.actualNativeOwnerEvidenceSha256:arrangement.actualExternalRustOwnerEvidenceSha256;
    assert(/^[0-9a-f]{64}$/.test(evidence??''));
    return Object.freeze({kind:'R2M-attested-Windows-UI-fixed-75s-transport-input',sourceCapId:arrangement.sourceCapId,browserPlatform:'win32',runtimeOwnerEvidenceSha256:evidence,transportTimeoutMs:75000,expectTimeoutMs:75000});
}
export function uiTransportTimeout(profile,sourceCapId){
    if(profile===undefined||profile===null)return 25000;
    assert.deepEqual(Object.keys(profile).sort(),['kind','sourceCapId','browserPlatform','runtimeOwnerEvidenceSha256','transportTimeoutMs','expectTimeoutMs'].sort());
    assert(profile.kind==='R2M-attested-Windows-UI-fixed-75s-transport-input'&&profile.sourceCapId===sourceCapId&&profile.browserPlatform==='win32'&&/^[0-9a-f]{64}$/.test(profile.runtimeOwnerEvidenceSha256??''));
    assert(profile.transportTimeoutMs===75000&&profile.expectTimeoutMs===75000);return 75000;
}
