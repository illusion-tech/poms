// Candidate materialization only; reads Root, writes this proposal, invokes no runtime.
import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict'; import { createHash } from 'node:crypto'; import { fileURLToPath } from 'node:url';
const R = 'E:/projects/worktrees/poms-r3hijk-next28/poms', O = path.dirname(fileURLToPath(import.meta.url));
const sha = b => createHash('sha256').update(b).digest('hex');
function once(text, needle, value) { assert.equal(text.split(needle).length - 1, 1, `Expected one exact edit: ${needle.slice(0, 70)}`); return text.replace(needle, value); }
function rxOnce(text, re, value) { assert.equal([...text.matchAll(new RegExp(re.source, 'g'))].length, 1); return text.replace(re, value); }
const products = [], rootInputs = [];
function candidate(file, text) {
  const before = fs.readFileSync(`${R}/${file}`), target = `${O}/proposed/${file}`; fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text, { flag: 'wx' }); products.push({ file, beforeSHA256: sha(before), candidate: `proposed/${file}`, afterSHA256: sha(Buffer.from(text)) });
}
const workers = [
  ['tools/rust-r4ghi/H/implementation/support-patches/ui-integration/runtime14/browser-cases14.mjs', 'blockedOrigins', true],
  ['tools/rust-r4ghi/business/ui-creator-readback-browser29.mjs', 'blocked', false],
  ...['role', 'expense', 'gh'].map(key => [`tools/rust-r4ghi/business/ui-${key}18-browser.mjs`, 'blocked', false]),
  ['tools/rust-r4ghi/business/ui-lifecycle18-browser.mjs', 'blockedOrigins', false]
];
for (const [file, blocked, common] of workers) {
  let text = fs.readFileSync(`${R}/${file}`, 'utf8');
  const imported = common ? '../../../../../business/ui-font-boundary32.mjs' : './ui-font-boundary32.mjs';
  text = `import { observeFontBoundary32 } from '${imported}';\n` + text;
  text = rxOnce(text, /page\.setDefaultTimeout\((?:90_000|90000)\);/, '$& const fontBoundary32 = observeFontBoundary32(page);');
  text = rxOnce(text, /assert\.equal\(consoleErrors\.length,\s*0(?:,\s*'[^']*')?\);/, `fontBoundary32.assertExpected({ consoleErrors, blocked: ${blocked} });`);
  text = rxOnce(text, new RegExp(`assert\\.equal\\(${blocked}\\.length,\\s*0(?:,\\s*'[^']*')?\\);`), '');
  const write = common ? "privateWrite('font-boundary32.json', jsonBytes(fontBoundary32.snapshot()));" : "save('font-boundary32.json', fontBoundary32.snapshot());";
  text = rxOnce(text, /finally\s*\{/, `$& ${write}`);
  if (file.endsWith('/ui-role18-browser.mjs')) {
    text = once(text, "assert(actor);await component().locator(`select[name=\"duty-${i}\"]`).selectOption(`${actor.id}:${row.roleType}`);await component().locator(`textarea[name=\"responsibility-${i}\"]`).fill(row.responsibilitySummary);await component().locator(`input[name=\"weight-${i}\"]`).fill(row.weight);await component().locator(`input[name=\"zero-reason-${i}\"]`).fill(row.zeroWeightReason??'');",
      "assert(actor);const field=component().getByRole('group',{name:`角色 ${i+1}`,exact:true});await field.getByLabel('真实职责承担人',{exact:true}).selectOption(`${actor.id}:${row.roleType}`);await field.getByLabel('责任说明',{exact:true}).fill(row.responsibilitySummary);await field.getByLabel('权重（0–1，最多六位有效小数）',{exact:true}).fill(row.weight);await field.getByLabel('零权重原因（权重为 0 时必填）',{exact:true}).fill(row.zeroWeightReason??'');");
  }
  candidate(file, text);
}
const actionFile = 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/runtime14/browser-actions14.mjs';
let actions = fs.readFileSync(`${R}/${actionFile}`, 'utf8');
actions = once(actions, 'article.locator(`textarea[name="closure-summary-${task.conditionId}"]`)', "article.getByLabel('本人闭合说明', { exact: true })");
actions = once(actions, 'article.locator(`input[name="reuse-evidence-${task.conditionId}"]`)', "article.getByLabel('同时提交本条件原有证据', { exact: true })");
candidate(actionFile, actions);
const newFile = 'tools/rust-r4ghi/business/ui-font-boundary32.mjs'; assert(!fs.existsSync(`${R}/${newFile}`));
products.push({ file: newFile, beforeSHA256: null, mustBeAbsent: true, candidate: `proposed/${newFile}`, afterSHA256: sha(fs.readFileSync(`${O}/proposed/${newFile}`)) });

// Static audit of every actual named selector in all four18 workers.
const componentFiles = {
  role: 'apps/poms-admin/src/app/features/commission/project-role-assignment-authoring.ts',
  expense: 'apps/poms-admin/src/app/features/project/project-expense-cost-authoring.ts',
  ghAuthor: 'apps/poms-admin/src/app/features/project/project-operating-authoring.ts',
  ghReview: 'apps/poms-admin/src/app/features/project/project-operating-review.ts',
  lifecycle: 'apps/poms-admin/src/app/features/project/project-lifecycle-authoring.ts'
};
const components = Object.fromEntries(Object.entries(componentFiles).map(([key, file]) => { const b = fs.readFileSync(`${R}/${file}`); rootInputs.push({ file, rawBytesSha256: sha(b) }); return [key, b.toString()]; }));
for (const label of ['真实职责承担人', '责任说明', '权重（0–1，最多六位有效小数）', '零权重原因（权重为 0 时必填）']) assert(components.role.includes(label));
for (const name of ['duty', 'responsibility', 'weight', 'zero-reason']) assert(components.role.includes(`[name]="'${name}-' + i"`));
for (const label of ['本人闭合说明', '同时提交本条件原有证据']) assert(components.lifecycle.includes(label));
const lifecycleBrowser = fs.readFileSync(`${R}/tools/rust-r4ghi/business/ui-lifecycle18-browser.mjs`, 'utf8');
const staticNames = [...lifecycleBrowser.matchAll(/(?:textarea|input|select)\[name="([^"]+)"\]/g)].map(v => v[1]);
for (const name of staticNames) assert(components.lifecycle.includes(`name="${name}"`), 'Retained lifecycle name selector must be a real static native attribute');
for (const key of ['expense', 'gh']) {
  const b = fs.readFileSync(`${R}/tools/rust-r4ghi/business/ui-${key}18-browser.mjs`, 'utf8'); assert(!/(?:textarea|input|select)\[name=/.test(b));
}
const index = fs.readFileSync(`${R}/apps/poms-admin/src/index.html`); rootInputs.push({ file: 'apps/poms-admin/src/index.html', rawBytesSha256: sha(index) });
assert(index.toString().includes('https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&family=Roboto+Flex:opsz,wght@8..144,100..1000&display=swap'));
fs.writeFileSync(`${O}/products32.json`, `${JSON.stringify(products, null, 2)}\n`, { flag: 'wx' });
fs.writeFileSync(`${O}/selector-audit32.json`, `${JSON.stringify({ kind: 'FS-only-real-template-selector-audit', rootInputs,
  OwnActualDOMHasNoDynamicNameAttribute: true, changedOwn: ['closure-summary-*', 'reuse-evidence-*'], changedRole: ['duty-*', 'responsibility-*', 'weight-*', 'zero-reason-*'],
  roleFieldsetLegendAndAllLabelsPresent: true, retainedRoleStaticName: ['freeze-comment'],
  expenseAndGHAlreadyUseRealLabelsNoNamedSelectorChange: true, lifecycleRetainedStaticNativeNames: staticNames,
  productsChanged: products.length, actualBrowserExecuted: false, RootWritten: false }, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ kind: 'UI32-tool-candidates-only', products: products.length, dynamicSelectorsCorrected: 6, businessRoutesOrProducerPolicyChanged: false }));
