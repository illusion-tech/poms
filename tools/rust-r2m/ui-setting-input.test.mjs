// Controlled original input event model only, not a browser or product test.
import test from 'node:test';
import assert from 'node:assert/strict';
import {editOriginalSettingInput} from './acceptance-ui-browser.mjs';
test('typing alone keeps the save action disabled until a real Tab commits the original input model',async()=>{
    const events=[];let draft=50,typed='50';const save={kind:'actual-save-locator'},field={async fill(text){typed=text;events.push('fill');assert.equal(draft,50)},async press(key){assert.equal(key,'Tab');events.push('Tab');draft=Number(typed)}};
    const page={locator(selector){if(selector==='#attachmentMaxUploadSize')return field;assert.equal(selector,'p-button[label="保存"] > button');return save}},expect=locator=>({async toBeEnabled(){assert.strictEqual(locator,save);events.push('enabled');assert.notEqual(draft,50)}});
    const actual=await editOriginalSettingInput(page,51,expect);assert.strictEqual(actual,save);assert.deepEqual(events,['fill','Tab','enabled']);assert.equal(draft,51);
});
