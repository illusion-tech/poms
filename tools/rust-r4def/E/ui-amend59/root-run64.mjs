// ROOT EXECUTION ONLY. Author checks syntax and public source; never runs this.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createControlledAmendment59, OPERATIONS59 } from './flow64.mjs';

const args = Object.fromEntries(process.argv.slice(2).map(arg => { const m = /^--([A-Za-z]+)=(.+)$/.exec(arg); assert(m, 'Only explicit --key=value options accepted'); return [m[1], m[2]]; }));
for (const key of Object.keys(args)) assert(['buildEdition', 'runEdition', 'sourceEdition', 'sourcePlatform', 'runtimeEdition', 'port', 'expectedBuildManifest', 'browserPin', 'baselineRun'].includes(key));
assert(/^\d+$/.test(args.buildEdition ?? ''), 'Explicit actual buildEdition is required; no admin-build44 fallback');
const edition = args.runEdition ?? '59', sourceEdition = args.sourceEdition ?? '48', runtimeEdition = args.runtimeEdition ?? '31', sourcePlatform = args.sourcePlatform ?? 'windows';
for (const value of [edition, sourceEdition, runtimeEdition]) assert(/^\d+$/.test(value)); assert(['windows', 'linux'].includes(sourcePlatform));
const linux = process.platform === 'linux', platform = linux ? 'linux' : 'windows'; assert(linux || process.platform === 'win32');
const win = linux ? '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms' : 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const root = linux ? '/home/wangzishi/projects/poms-rust-r4def' : win;
const sourcePrivate = linux ? '/home/wangzishi/.local/share/poms-r4def/private' : '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4def/private';
const privateBase = linux ? sourcePrivate : win + '/tmp/rust-r4def/private';
const ownedPrivate = privateBase + `/ui-amend-${platform}${edition}`, out = win + `/tmp/rust-r4def/root/ui-amend-${platform}${edition}`;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const pin = file => { const bytes = fs.readFileSync(file); return { file, bytes: bytes.length, rawBytesSha256: hash(bytes) }; };
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
assert(!fs.existsSync(out) && !fs.existsSync(ownedPrivate), 'Fresh candidate run only; never overwrite actual receipts');
fs.mkdirSync(out, { recursive: true }); fs.mkdirSync(ownedPrivate, { recursive: true, mode: 0o700 });
let server, browser, suite, failure = null, complete = false, stage = 'admission';
const network = [], errors = [], screenshots = [], observations = [];
let inputIdentity, sourcePins, runtimePublic, closed;
try {
    const parent = read(sourcePrivate + '/../identity.json'); assert.equal(parent.namespace, 'poms-r4def'); assert.equal(parent.base, '756d813c9578090fcf8e56821acce01b46b40420'); assert.equal(parent.port, 25433); assert.equal(parent.container, 'poms-r4def-pg15');
    const continuationFile = win + `/tmp/rust-r4def/root/api32/continuation${sourceEdition}-result.json`, priorFile = win + `/tmp/rust-r4def/root/ui-${sourcePlatform}${sourceEdition}/receipt45.json`;
    const input = read(continuationFile), prior = read(priorFile); assert.equal(input.completed, true); assert.equal(prior.complete, true); assert.equal(prior.failure, null); assert.equal(prior.platform, sourcePlatform === 'windows' ? 'win32' : 'linux');
    assert.equal(prior.projectId, input.context.project.id); assert.equal(prior.otherProjectId, input.context.otherProject.id);
    const initial = prior.observations.find(o => o.handoverId && o.projectId === prior.projectId); assert(initial?.handoverId && initial.version === 1);
    inputIdentity = { projectId: prior.projectId, otherProjectId: prior.otherProjectId, contractId: input.context.contract.id, otherContractId: input.context.secondContract.id, originalHandoverId: initial.handoverId, expectedHandoverVersion: 1, expectedContractSnapshotVersion: 1, sourceEdition, sourcePlatform, instanceId: parent.marker };
    let baselineFile;
    if (args.baselineRun) {
        assert(/^(linux|windows)\d+$/.test(args.baselineRun)); baselineFile = win + `/tmp/rust-r4def/root/ui-amend-${args.baselineRun}/receipt59.json`; const baseline = read(baselineFile);
        assert.equal(baseline.kind, 'real-D-controlled-amendment-and-rebaseline-browser59'); assert.equal(baseline.complete, true); assert.equal(baseline.failure, null); assert.equal(baseline.inputIdentity.projectId, inputIdentity.projectId); assert.equal(baseline.inputIdentity.contractId, inputIdentity.contractId); assert.equal(baseline.inputIdentity.instanceId, parent.marker);
        const final = baseline.flow.observations.find(o => o.stage === 'writer-final-R5-blocked'), activation = baseline.flow.observations.find(o => o.stage === 'writer-activate'); assert(final?.handoverId && final.confirmedCount === 3 && final.R5AdmissionAllowed === false && activation?.snapshotVersion);
        inputIdentity.originalHandoverId = final.handoverId; inputIdentity.expectedHandoverVersion = final.version; inputIdentity.expectedContractSnapshotVersion = activation.snapshotVersion; inputIdentity.baselineRun = args.baselineRun;
    }
    const runtime = read(sourcePrivate + `/rust-api${runtimeEdition}-process.json`); assert(Number.isSafeInteger(runtime.pid) && runtime.pid > 0); assert(/^[0-9a-f]{64}$/.test(runtime.binarySha256)); runtimePublic = { pid: runtime.pid, binarySha256: runtime.binarySha256, startedAt: runtime.startedAt, runtimeEdition };
    const actors = read(sourcePrivate + '/actors33.json').actors; for (const key of ['writer', 'approver', 'full', 'personA']) assert(actors[key]?.id && actors[key].username && actors[key].password);
    const specFile = win + '/libs/shared/api-spec/openapi.json', spec = read(specFile), index = new Map(Object.entries(spec.paths).flatMap(([template, methods]) => Object.entries(methods).filter(([, o]) => o.operationId).map(([method, o]) => [o.operationId, { method: method.toUpperCase(), template, statuses: Object.keys(o.responses) }])));
    for (const [id, [method, template, status]] of Object.entries(OPERATIONS59)) { const actual = index.get(id); assert(actual && actual.method === method && actual.template === template && actual.statuses.includes(String(status)), 'Actual current schema route/status mismatch:' + id); }
    const serverFile = win + '/tools/rust-r4def/ui-server45.mjs'; sourcePins = [pin(continuationFile), pin(priorFile), ...(baselineFile ? [pin(baselineFile)] : []), pin(specFile), pin(serverFile), pin(win + '/apps/poms-admin/src/app/features/project/project-handover-actions.ts'), pin(win + '/apps/poms-admin/src/app/features/project/project-contract-handover.ts')];
    const { startUiServer } = await import(pathToFileURL(serverFile).href), require = createRequire(root + '/package.json'), { chromium, expect } = require('@playwright/test');
    const browserEnv = { ...process.env }; let executable;
    if (linux) {
        const file = args.browserPin ?? win + '/tmp/rust-r4abc/root/ui-assets30/linux-browser-pin30.json', browserPin = read(file); executable = browserPin.executable; assert.equal(hash(fs.readFileSync(executable)), browserPin.rawBytesSha256); browserEnv.LD_LIBRARY_PATH = browserPin.libraryPath;
        const fontRoot = ownedPrivate + '/fonts'; fs.mkdirSync(fontRoot + '/cache', { recursive: true, mode: 0o700 });
        const source = fs.readFileSync(browserPin.fontconfigFile, 'utf8'), config = source.replaceAll('/home/wangzishi/.local/share/poms-r4abc/browser-fonts/cache', path.resolve(fontRoot + '/cache')); assert(!config.includes('/poms-r4abc/browser-fonts/cache')); fs.writeFileSync(fontRoot + '/fonts.conf', config, { flag: 'wx', mode: 0o600 }); browserEnv.FONTCONFIG_FILE = fontRoot + '/fonts.conf'; browserEnv.FONTCONFIG_PATH = fontRoot;
    } else {
        assert(!args.browserPin, 'Windows candidate uses the existing pinned real Chromium executable'); executable = 'E:/projects/worktrees/poms-r2ef-foundation-audit/poms/tmp/rust-r2ef/windows-browser-cache/chromium-1243/chrome-win64/chrome.exe'; assert.equal(hash(fs.readFileSync(executable)), '9b07943f834485b43c9d54caea2951c78715f9f07070a80ab6658465ebd3e711');
    }
    const port = Number(args.port ?? '44451'); assert.equal(port, 44451, 'Use the actual current Rust CORS origin; do not silently invent another allowed origin');
    server = await startUiServer({ directory: win + `/tmp/rust-r4def/root/admin-build${args.buildEdition}/output/browser`, backendPort: 31341, privateDirectory: ownedPrivate + '/http-originals', port });
    if (args.expectedBuildManifest) { assert(/^[0-9a-f]{64}$/.test(args.expectedBuildManifest)); assert.equal(server.build.manifestSha256, args.expectedBuildManifest, 'Explicit current build pin mismatch'); }
    browser = await chromium.launch({ executablePath: executable, headless: true, env: browserEnv, args: linux ? ['--no-sandbox'] : [] });
    async function shot(name, page) { assert(/^[a-zA-Z0-9-]+$/.test(name)); const file = out + '/' + name + '.png'; assert(!fs.existsSync(file)); await page.screenshot({ path: file, fullPage: true }); screenshots.push(pin(file)); }
    function registerPage(page, actor) {
        page.on('pageerror', error => { errors.push({ actor, name: error.name }); fs.writeFileSync(ownedPrivate + '/pageerror-' + errors.length + '.log', error.stack ?? String(error), { flag: 'wx', mode: 0o600 }); });
        page.on('response', response => { const u = new URL(response.url()); if (u.origin === server.origin && u.pathname.startsWith('/api/')) network.push({ actor, method: response.request().method(), path: u.pathname, status: response.status() }); });
    }
    suite = createControlledAmendment59({ browser, expect, origin: server.origin, actors, ...inputIdentity, tag: `${platform}${edition}`, shot, observe(value) { observations.push(value); }, stageChanged(value) { stage = value; }, registerPage });
    stage = 'DOM-main-chain'; const flow = await suite.run(); assert.equal(flow.complete, true); assert.deepEqual(errors, []); assert(!network.some(n => ['POST', 'PATCH', 'DELETE'].includes(n.method) && n.path.includes('/receipt-records')), 'This UI run must not replay any receipts'); complete = true; stage = 'complete';
} catch (error) {
    failure = { stage, name: error.name }; fs.writeFileSync(ownedPrivate + '/failure-original.log', error.stack ?? String(error), { flag: 'wx', mode: 0o600 }); if (suite) await suite.failureScreenshot().catch(() => undefined); process.exitCode = 1;
} finally {
    if (suite) await suite.closeContexts().catch(error => { complete = false; errors.push({ stage: 'close-contexts', name: error.name }); });
    if (browser) await browser.close().catch(error => { complete = false; errors.push({ stage: 'close-browser', name: error.name }); });
    if (server) { try { closed = await server.close(); assert.equal(closed.serverClosed, true); assert.equal(closed.pending, 0); assert.equal(closed.allRawExchangesRetained, true); assert.equal(closed.failures, 0); } catch (error) { complete = false; errors.push({ stage: 'close-proxy', name: error.name }); } }
    const receipt = { kind: 'real-D-controlled-amendment-and-rebaseline-browser59', platform: process.platform, buildEdition: args.buildEdition, runEdition: edition, inputIdentity, sourcePins, apiRuntime: runtimePublic, stage, complete, failure, flow: suite?.manifest(), network, observations, errors, screenshots, build: server?.build, exchanges: server?.exchanges, closed, rawCredentialsAndHTTPOriginalsOnlyInNewPrivate: true, businessResponsesMocked: 0, DOMStateInjectionUsed: false, directBusinessAPIClientUsed: false, SQLUsed: false, existingReceiptHistoryPreservation: 'Not independently certified by this browser-only flow; use Root actual source/API preservation evidence', optionalLateAttachmentFailure: 'not-run; see README Root-only follow-up', G3Certified: false, G4Certified: false };
    const file = out + '/receipt59.json'; fs.writeFileSync(file, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ receipt: pin(file), complete, stage, failure, actualFlowStages: receipt.flow?.stages, networkCount: network.length, screenshotCount: screenshots.length, businessResponsesMocked: 0, closed })); if (!complete) process.exitCode = 1;
}
