// Root copies only a new current-batch UI actor into its owned Windows private path.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { pin } from './source-guard.mjs';
const root = '/home/wangzishi/projects/poms-rust-r3hijk';
const win = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const [label] = process.argv.slice(2);
assert.equal(process.cwd(), root);
assert(/^windows-(native|rust)\d{2}$/.test(label));
const relative = 'tmp/rust-r3hijk/ui-input-' + label + '.json';
const input = JSON.parse(fs.readFileSync(relative));
assert(input.completed && input.label === label);
const source = '/home/wangzishi/.local/share/poms-r3hijk/private/acceptance-' + input.backend + '-' + input.runId + '/ui-' + label + '-input.json';
const target = '/mnt/c/Users/ynh2/AppData/Local/poms-r3hijk/private/ui-' + label + '-input.json';
assert(!fs.existsSync(target) && !fs.existsSync(win + '/' + relative));
fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
fs.copyFileSync(relative, win + '/' + relative, fs.constants.COPYFILE_EXCL);
console.log(JSON.stringify({ label, publicInput: pin(relative), currentBatchPrivateInputCopied: true, credentialValuesPublished: false }));
