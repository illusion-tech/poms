import test from 'node:test';
import assert from 'node:assert/strict';
import {browserLaunchArguments} from './ui-runtime-browser.mjs';
test('only the G1 fixed UI10080 is explicitly allowed inside an owned Chromium child',()=>{assert.deepEqual(browserLaunchArguments(),['--explicitly-allowed-ports=10080']);const caller=browserLaunchArguments();caller.push('--disable-web-security');assert.deepEqual(browserLaunchArguments(),['--explicitly-allowed-ports=10080'])});
