// Original eight legacy spec files/assertions and original server ownership.
// Only the exact browser executable/environment and new-private report paths
// differ. A headless-shell pin avoids editing an original test/config file.
import assert from 'node:assert/strict';
import path from 'node:path';
import {defineConfig} from '@playwright/test';
import originalModule from '../../apps/poms-admin-e2e/playwright.config.ts';
import {publicJson,qaRoot,root} from './audit-qa-common.mjs';
import {browserChildEnvironment,verifyBrowserPin,browserLaunchArguments} from './ui-runtime-browser.mjs';
import {unwrapOriginalLegacyConfiguration} from './audit-qa-config-shape.mjs';
const original=unwrapOriginalLegacyConfiguration(originalModule);
assert.equal(process.env.POMS_E2E_MODE,'external');assert.equal(process.env.POMS_ADMIN_E2E_SUITE,'legacy');assert.equal(process.env.POMS_API_BASE_URL,'http://127.0.0.1:10070');assert.equal(process.env.POMS_ADMIN_PORT_SEED,'5680');
assert(/^[a-z0-9-]{1,24}$/.test(process.env.POMS_QA_TAG??''));const browser=publicJson(process.env.POMS_QA_BROWSER_PIN);verifyBrowserPin(browser);
const target=qaRoot+'/legacy-'+process.env.POMS_QA_TAG;
export default defineConfig({...original,testDir:path.join(root,'apps/poms-admin-e2e/src'),globalSetup:path.join(root,'apps/poms-admin-e2e/src/support/server-setup.ts'),outputDir:target+'-results',reporter:[['list'],['json',{outputFile:target+'-report.json'}]],use:{...original.use,launchOptions:{...(original.use?.launchOptions??{}),executablePath:browser.executable,env:browserChildEnvironment(process.env,browser),args:browserLaunchArguments()}}});
