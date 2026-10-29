// Root invokes runKUi in-process. Importing this module never launches a
// browser/server, reads fixture credentials, or performs DB/fixture cleanup.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const sha = (b) => createHash('sha256').update(b).digest('hex');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA = /^[0-9a-f]{64}$/;
const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit++) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    return value >>> 0;
});
function crc32(bytes) {
    let value = 0xffffffff;
    for (const byte of bytes) value = crcTable[(value ^ byte) & 255] ^ (value >>> 8);
    return (value ^ 0xffffffff) >>> 0;
}
function filesUnder(directory) {
    assert(fs.lstatSync(directory).isDirectory() && !fs.lstatSync(directory).isSymbolicLink());
    return fs.readdirSync(directory).sort().flatMap((name) => {
        const file = path.join(directory, name), stat = fs.lstatSync(file); assert(!stat.isSymbolicLink());
        return stat.isDirectory() ? filesUnder(file) : (assert(stat.isFile()), [file]);
    });
}
function fileIdentity(file) {
    const bytes = fs.readFileSync(file);
    return { file, bytes: bytes.length, sha256: sha(bytes) };
}
function cancellationError() {
    const error = new Error('Root aborted the owned K UI attempt'); error.name = 'AbortError'; return error;
}

// Original K template literal labels, and PrimeNG's actual native child. This
// avoids assuming that icon pseudo-content is absent from the accessible name.
export function originalKButton(section, label) {
    assert(['刷新扫描', '创建下载包', '下载包'].includes(label), 'Only original K literal button labels');
    return section.locator(`p-button[label="${label}"] > button`);
}

// Read-only, section-scoped diagnostic. No HTML serialization, form values,
// cookies, storage or page-wide text is collected.
export function readKButtonDom(scope) {
    const text = (value) => String(value ?? '').slice(0, 512);
    const attrs = (node) => Object.fromEntries(['role', 'type', 'label', 'aria-label', 'aria-labelledby', 'aria-hidden', 'disabled', 'inert']
        .map((name) => [name, node.getAttribute(name)]).filter(([, value]) => value !== null));
    const style = (node, pseudo) => {
        const actual = node.ownerDocument.defaultView.getComputedStyle(node, pseudo);
        return { display: actual.display, visibility: actual.visibility, ...(pseudo ? { content: text(actual.content) } : {}) };
    };
    return [...scope.querySelectorAll('button, [role="button"]')].slice(0, 32).map((button) => {
        const label = button.querySelector('.p-button-label'), icon = button.querySelector('.p-button-icon'), host = button.closest('p-button');
        const ancestors = []; let current = button;
        while (current && scope.contains(current) && ancestors.length < 12) {
            ancestors.push({ tag: current.tagName.toLowerCase(), attrs: attrs(current), style: style(current) });
            if (current === scope) break; current = current.parentElement;
        }
        return { tag: button.tagName.toLowerCase(), attrs: attrs(button), text: text(button.textContent),
            labelText: label ? text(label.textContent) : null,
            labelCodePoints: label ? [...text(label.textContent)].map((character) => character.codePointAt(0).toString(16)) : [],
            host: host ? { tag: 'p-button', attrs: attrs(host) } : null,
            icon: icon ? { attrs: attrs(icon), before: style(icon, '::before'), after: style(icon, '::after') } : null,
            ancestors };
    });
}

// Independent ZIP32/store reader; no extraction using archive-supplied paths.
// It verifies actual downloaded bytes, local/central agreement and CRC32.
function storedZip(bytes) {
    const eocd = bytes.length - 22;
    assert(eocd >= 0 && bytes.readUInt32LE(eocd) === 0x06054b50, 'Expected original ZIP32 EOCD');
    assert.equal(bytes.readUInt16LE(eocd + 4), 0); assert.equal(bytes.readUInt16LE(eocd + 6), 0);
    const count = bytes.readUInt16LE(eocd + 10), centralSize = bytes.readUInt32LE(eocd + 12), centralOffset = bytes.readUInt32LE(eocd + 16);
    assert.equal(bytes.readUInt16LE(eocd + 8), count); assert.equal(bytes.readUInt16LE(eocd + 20), 0);
    assert(count > 1 && centralOffset + centralSize === eocd);
    const entries = []; let cursor = centralOffset, localEnd = 0;
    for (let index = 0; index < count; index++) {
        assert(cursor + 46 <= eocd && bytes.readUInt32LE(cursor) === 0x02014b50, 'Invalid central header');
        assert.equal(bytes.readUInt16LE(cursor + 8), 0x0800); assert.equal(bytes.readUInt16LE(cursor + 10), 0);
        const crc = bytes.readUInt32LE(cursor + 16), size = bytes.readUInt32LE(cursor + 20), plainSize = bytes.readUInt32LE(cursor + 24);
        const nameLength = bytes.readUInt16LE(cursor + 28), extraLength = bytes.readUInt16LE(cursor + 30), commentLength = bytes.readUInt16LE(cursor + 32), offset = bytes.readUInt32LE(cursor + 42);
        assert.equal(size, plainSize); assert.equal(extraLength, 0); assert.equal(commentLength, 0);
        assert.equal(offset, localEnd, 'Unexpected gap/order in original local entries');
        const nameBytes = bytes.subarray(cursor + 46, cursor + 46 + nameLength);
        assert.equal(nameBytes.length, nameLength);
        const name = new TextDecoder('utf-8', { fatal: true }).decode(nameBytes);
        assert(offset + 30 <= centralOffset && bytes.readUInt32LE(offset) === 0x04034b50, 'Invalid local header');
        assert.equal(bytes.readUInt16LE(offset + 6), 0x0800); assert.equal(bytes.readUInt16LE(offset + 8), 0);
        assert.equal(bytes.readUInt32LE(offset + 14), crc); assert.equal(bytes.readUInt32LE(offset + 18), size); assert.equal(bytes.readUInt32LE(offset + 22), size);
        assert.equal(bytes.readUInt16LE(offset + 26), nameLength); assert.equal(bytes.readUInt16LE(offset + 28), 0);
        assert.deepEqual(bytes.subarray(offset + 30, offset + 30 + nameLength), nameBytes);
        localEnd = offset + 30 + nameLength + size; assert(localEnd <= centralOffset);
        const data = bytes.subarray(offset + 30 + nameLength, localEnd); assert.equal(crc32(data), crc);
        entries.push({ name, data, bytes: data.length, sha256: sha(data), crc32: crc });
        cursor += 46 + nameLength + extraLength + commentLength;
    }
    assert.equal(cursor, eocd); assert.equal(localEnd, centralOffset);
    assert.equal(new Set(entries.map((entry) => entry.name)).size, entries.length, 'Duplicate ZIP entry name');
    assert.equal(entries[0].name, 'manifest.json');
    return { entries, manifest: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(entries[0].data)) };
}

/**
 * Root must provide actual owned IDs/names and hashes of real uploaded bytes.
 * The fixture should fit the original first 8-row table page.
 *
 * runKUi({backend,tag,origin,handoverId,adminCredentials:{username,password},
 *   viewerCredentials:{username,password},expectedAttachmentNames,
 *   selectedAttachmentNames?,expectedAttachmentSha256:{[displayName]:sha256},
 *   expectedExcludedNames?,expectedProjectId?,viewerExpectedLoadStatus?:200|403,
 *   buildTag?:'ui01',buildDirectory?,browserExecutable?,
 *   onBeforeStep?,onAfterStep?,onPackageCreated?})
 *
 * Before/after hooks receive only role/step/owned-ID observations, never creds.
 * Root registers intents/begins a PG case before each step and drains/adopts
 * after the UI/store is stable. It owns fixture/proxy/backend lifecycle.
 */
export async function runKUi(options) {
    const signal = options?.signal;
    if (signal?.aborted) throw cancellationError();
    const { backend, tag, origin, handoverId, adminCredentials, viewerCredentials,
        expectedAttachmentNames, expectedAttachmentSha256, expectedProjectId,
        selectedAttachmentNames = expectedAttachmentNames, expectedExcludedNames = [],
        viewerExpectedLoadStatus = 200, buildTag = 'ui01', browserExecutable,
        onBeforeStep, onAfterStep, onPackageCreated } = options;
    assert(['nest', 'rust'].includes(backend) && /^[a-z0-9-]{1,35}$/.test(tag)); assert(UUID.test(handoverId));
    const address = new URL(origin); assert.equal(address.protocol, 'http:'); assert.equal(address.hostname, '127.0.0.1');
    assert.equal(address.origin, origin); assert.equal(address.port, '8800');
    assert(['200', '403'].includes(String(viewerExpectedLoadStatus))); assert(/^[a-z0-9-]{1,30}$/.test(buildTag));
    for (const credential of [adminCredentials, viewerCredentials]) assert(credential && typeof credential.username === 'string' && credential.username.length > 0 && typeof credential.password === 'string' && credential.password.length > 0, 'Root credentials required in memory');
    assert(adminCredentials.username !== viewerCredentials.username, 'Distinct Root actors required');
    assert(Array.isArray(expectedAttachmentNames) && expectedAttachmentNames.length > 0 && expectedAttachmentNames.length <= 8);
    assert(expectedAttachmentNames.every((name) => typeof name === 'string' && name.length > 0));
    assert.equal(new Set(expectedAttachmentNames).size, expectedAttachmentNames.length);
    assert(selectedAttachmentNames.length > 0 && selectedAttachmentNames.every((name) => expectedAttachmentNames.includes(name)));
    assert.equal(new Set(selectedAttachmentNames).size, selectedAttachmentNames.length);
    for (const name of selectedAttachmentNames) assert(SHA.test(expectedAttachmentSha256?.[name] ?? ''), 'Actual uploaded payload SHA required for each selection');
    if (expectedProjectId) assert(UUID.test(expectedProjectId));
    const credentialStrings = [adminCredentials.username, adminCredentials.password, viewerCredentials.username, viewerCredentials.password].sort((a, b) => b.length - a.length);
    const redact = (value) => credentialStrings.reduce((text, secret) => text.replaceAll(secret, '[credential]'), String(value));
    const { chromium, expect } = require('@playwright/test');
    const directory = path.join(ROOT, `tmp/rust-r2k/k-ui-${process.platform}-${backend}-${tag}`);
    assert(!fs.existsSync(directory), 'Keep earlier UI attempt evidence'); fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const buildDirectory = path.resolve(options.buildDirectory ?? path.join(ROOT, `dist/tools/rust-r2k-k-ui-host-${buildTag}`));
    assert(!/(?:^|[\\/])(?:private|secrets|ROOT-CHECKPOINT\.md)(?:[\\/]|$)/i.test(buildDirectory));
    const browserDirectory = path.join(buildDirectory, 'browser');
    const buildFiles = filesUnder(buildDirectory).map(fileIdentity);
    const localAssets = new Map(filesUnder(browserDirectory).map((file) => [path.relative(browserDirectory, file).split(path.sep).join('/'), fileIdentity(file)]));
    const sourceNames = [
        ...filesUnder(path.join(ROOT, 'tools/rust-r2k/k-ui-host')).map((file) => path.relative(ROOT, file).split(path.sep).join('/')),
        'tools/rust-r2k/k-ui-source.mjs', 'tools/rust-r2k/k-ui-build.mjs', 'tools/rust-r2k/k-ui-server.mjs', 'tools/rust-r2k/k-ui-browser.mjs',
        'apps/poms-admin/src/app/features/project/project-contract-handover.ts', 'libs/admin/data-access/src/lib/project/project-workspace.store.ts',
        'libs/shared/api-client/api/attachment-handover.service.ts', 'libs/shared/api-client/api/auth.service.ts',
        'libs/admin/data-access/src/lib/poms-api/provide-poms-api-client.ts', 'libs/admin/data-access/src/lib/poms-api/poms-csrf.interceptor.ts',
        'libs/admin/data-access/src/lib/poms-api/poms-csrf-token.store.ts'
    ];
    fs.mkdirSync(path.join(directory, 'inputs'), { mode: 0o700 });
    const sources = sourceNames.map((file, index) => {
        const bytes = fs.readFileSync(path.join(ROOT, file)), snapshot = path.join(directory, 'inputs', String(index).padStart(3, '0') + '-' + path.basename(file));
        fs.writeFileSync(snapshot, bytes, { flag: 'wx', mode: 0o600 }); assert.equal(sha(fs.readFileSync(snapshot)), sha(bytes));
        return { source: file, snapshot: path.relative(ROOT, snapshot).split(path.sep).join('/'), bytes: bytes.length, rawBytesSha256: sha(bytes), normalizedLfSha256: sha(Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'))) };
    });
    const report = { formatVersion: 1, result: 'pending', kind: 'actual-original-K-section-browser', backend, tag, origin, handoverId,
        node: process.version, platform: process.platform, startedAt: new Date().toISOString(), sources, buildFiles,
        scope: 'Original K section and store/HttpClient/CSRF through real UI; no fake responses, direct API substitutes, full R4 page or fixture cleanup',
        steps: [], network: [], staticAssets: [], browserErrors: [], screenshots: [], sectionDiagnostics: [], expectedAttachmentNames, selectedAttachmentNames,
        credentialInputsRecorded: false, fixtureOrBackendCleanupOwner: 'Root', viewerPackageCreationProhibitedClaimed: false };
    let browser, context, page, currentStep = 'setup', currentRole = 'admin', packageSummary, refreshed, activePage;
    const pendingAssets = [], seenAssets = new Set(), closeOperations = new Map();
    const cancelled = () => { if (signal?.aborted) throw cancellationError(); };
    async function bounded(promise, milliseconds) {
        let timer;
        try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Owned browser cleanup deadline')), milliseconds); })]); }
        finally { clearTimeout(timer); }
    }
    function closeOwner(owner, kind) {
        if (!owner) return Promise.resolve();
        if (closeOperations.has(owner)) return closeOperations.get(owner);
        const closing = bounded(Promise.resolve().then(() => owner.close()), 5000).catch(() => {
            (report.closeFailures ??= []).push({ kind, reason: 'owned-close-failed-or-deadline' });
        });
        closeOperations.set(owner, closing); return closing;
    }
    const onAbort = () => {
        report.cancelled = true;
        // Reject Playwright work/bridge callbacks through their own owner close;
        // the parent retains a verified Windows-tree force-stop fallback.
        void closeOwner(context, 'context'); void closeOwner(browser, 'browser');
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    function response(method, pathname) {
        const pending = activePage.waitForResponse((actual) => new URL(actual.url()).origin === origin && new URL(actual.url()).pathname === pathname && actual.request().method() === method, { timeout: 25000 });
        pending.catch(() => {}); return pending;
    }
    async function stable() { if (activePage && !activePage.isClosed()) await activePage.waitForLoadState('networkidle', { timeout: 25000 }); }
    async function step(name, role, details, action) {
        cancelled();
        currentStep = name; currentRole = role;
        const info = { backend, tag, name, role, handoverId, details };
        if (onBeforeStep) await onBeforeStep(structuredClone(info));
        cancelled(); const observed = await action(); await stable(); cancelled();
        if (onAfterStep) await onAfterStep(structuredClone({ ...info, observed }));
        report.steps.push({ name, role, result: 'pass', observed }); return observed;
    }
    async function screenshot(name) {
        const file = path.join(directory, name + '.png'); assert(!fs.existsSync(file));
        await activePage.screenshot({ path: file, fullPage: true, mask: [activePage.locator('#kUsername'), activePage.locator('#kPassword'), activePage.getByTestId('k-ui-user')] });
        report.screenshots.push({ name, file: path.relative(ROOT, file).split(path.sep).join('/'), sha256: sha(fs.readFileSync(file)), credentialFieldsMasked: true });
    }
    async function newPage() {
        cancelled();
        context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
        if (signal?.aborted) { await closeOwner(context, 'context'); throw cancellationError(); }
        page = await context.newPage(); activePage = page; page.setDefaultTimeout(20000);
        page.on('pageerror', (error) => report.browserErrors.push({ role: currentRole, step: currentStep, message: redact(error.message) }));
        page.on('response', (actual) => {
            const url = new URL(actual.url()); if (url.origin !== origin) return;
            if (url.pathname.startsWith('/api/')) { report.network.push({ method: actual.request().method(), path: url.pathname, status: actual.status() }); return; }
            if (!/\.(?:js|css|woff2?|ttf|svg)$/.test(url.pathname) || actual.status() !== 200) return;
            const relative = decodeURIComponent(url.pathname).replace(/^\//, ''), key = relative;
            if (!localAssets.has(relative) || seenAssets.has(key)) return; seenAssets.add(key);
            const promise = (async () => {
                const bytes = await actual.body(); assert.equal(sha(bytes), localAssets.get(relative).sha256, 'Served asset differs from actual build');
                const destination = path.join(directory, 'served-assets', relative);
                assert(destination.startsWith(path.join(directory, 'served-assets') + path.sep)); fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
                fs.writeFileSync(destination, bytes, { flag: 'wx', mode: 0o600 });
                report.staticAssets.push({ path: url.pathname, snapshot: path.relative(ROOT, destination).split(path.sep).join('/'), bytes: bytes.length, sha256: sha(bytes) });
            })(); promise.catch(() => {}); pendingAssets.push(promise);
        });
    }
    const section = () => activePage.locator('app-k-original-section');
    const itemRow = (name) => section().locator('tr').filter({ has: activePage.getByText(name, { exact: true }) });
    async function kButton(label) {
        const button = originalKButton(section(), label);
        await expect(button).toHaveCount(1);
        await expect(button.locator('.p-button-label')).toHaveText(label);
        return button;
    }
    async function sectionDiagnostic(name) {
        try {
            const scope = section();
            const dom = await scope.evaluate(readKButtonDom, undefined, { timeout: 3000 });
            const aria = await scope.ariaSnapshot({ timeout: 3000 });
            const selectors = [];
            for (const label of ['刷新扫描', '创建下载包', '下载包']) {
                selectors.push({ label, roleExactCount: await scope.getByRole('button', { name: label, exact: true }).count(),
                    originalLiteralNativeCount: await originalKButton(scope, label).count() });
            }
            const diagnostic = { formatVersion: 1, kind: 'actual-redacted-original-K-section-DOM-and-ARIA', role: currentRole, step: currentStep,
                scope: 'Only original K section; whitelist button attributes/text/styles and ARIA; no form values, page-wide HTML, credentials or cookies',
                selectors, buttons: dom, ariaSnapshot: aria.slice(0, 32768), ariaSnapshotTruncated: aria.length > 32768 };
            const bytes = Buffer.from(JSON.stringify(diagnostic, (_key, value) => typeof value === 'string' ? redact(value) : value, 2) + '\n');
            const file = path.join(directory, name + '-section-dom.json');
            fs.writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 });
            report.sectionDiagnostics.push({ name, file: path.relative(ROOT, file).split(path.sep).join('/'), bytes: bytes.length, sha256: sha(bytes) });
        } catch (error) {
            (report.sectionDiagnosticFailures ??= []).push({ name, error: error.name, message: redact(error.message) });
        }
    }
    async function login(role, credentials, expectedLoadStatus) {
        await newPage();
        await step(role + '.login-and-initial-checklist', role, { expectedLoadStatus }, async () => {
            const index = await activePage.goto(`${origin}/?backend=${backend}&handoverId=${encodeURIComponent(handoverId)}`);
            assert(index && index.status() === 200); assert.equal(sha(await index.body()), localAssets.get('index.html').sha256);
            await expect(activePage.locator('#kUsername')).toBeVisible();
            await activePage.locator('#kUsername').fill(credentials.username); await activePage.locator('#kPassword').fill(credentials.password);
            const loggedIn = response('POST', '/api/auth/sessions'), checklist = response('GET', `/api/project-handovers/${handoverId}/attachment-checklist`);
            await activePage.getByRole('button', { name: '登录验收账号', exact: true }).click();
            const actualLogin = await loggedIn; assert.equal(actualLogin.status(), 200);
            const session = await actualLogin.json(); assert(session.authenticated === true && session.user?.username === credentials.username, 'Original login must bind the requested actor');
            await expect(activePage.getByTestId('k-ui-user')).toBeVisible();
            const actual = await checklist; assert.equal(actual.status(), expectedLoadStatus); await expect(section()).toBeVisible();
            await expect(section().getByText('正在读取附件移交清单', { exact: true })).toHaveCount(0);
            if (expectedLoadStatus === 200) {
                const body = await actual.json(); assert(Array.isArray(body.items));
                for (const name of expectedAttachmentNames) await expect(section().getByText(name, { exact: true })).toBeVisible();
            } else await expect(section().getByText('你没有权限查看当前工作区。', { exact: true })).toBeVisible();
            await sectionDiagnostic(role + '-loaded'); await screenshot(role + '-loaded');
            return { actualLoginStatus: actualLogin.status(), checklistStatus: actual.status(), requestedActorVerifiedInMemory: true };
        });
    }
    try {
        cancelled();
        let executable = browserExecutable;
        if (!executable && process.platform === 'win32') executable = path.join(ROOT, 'tmp/rust-r2ef/windows-browser-cache/chromium-1243/chrome-win64/chrome.exe');
        if (!executable) executable = chromium.executablePath();
        assert(fs.existsSync(executable) && fs.statSync(executable).isFile(), 'Root must supply an existing browser; no install/download');
        report.browserExecutable = fileIdentity(executable);
        const browserEnv = {};
        for (const key of ['PATH', 'HOME', 'USERPROFILE', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'LANG', 'LC_ALL', 'TZ', 'DISPLAY', 'WAYLAND_DISPLAY', 'XDG_RUNTIME_DIR', 'DBUS_SESSION_BUS_ADDRESS']) {
            if (process.env[key] !== undefined) browserEnv[key] = process.env[key];
        }
        browser = await chromium.launch({ headless: true, executablePath: executable, env: browserEnv });
        if (signal?.aborted) { await closeOwner(browser, 'browser'); throw cancellationError(); }
        report.browserVersion = browser.version();
        await login('admin', adminCredentials, 200);
        await step('admin.refresh', 'admin', {}, async () => {
            const pending = response('POST', `/api/project-handovers/${handoverId}/attachment-checklist:refresh`);
            await (await kButton('刷新扫描')).click();
            const actual = await pending; assert.equal(actual.status(), 200); refreshed = await actual.json();
            assert(Array.isArray(refreshed.items));
            for (const name of expectedAttachmentNames) await expect(itemRow(name)).toHaveCount(1);
            for (const name of expectedExcludedNames) await expect(itemRow(name).locator('input[type=checkbox]')).toBeDisabled();
            await screenshot('admin-refreshed');
            return { status: actual.status(), items: refreshed.items.map((item) => ({ displayName: item.displayName, selectionId: item.selectionId, attachmentId: item.attachmentId, rowVersion: item.rowVersion, status: item.status })) };
        });
        const selectedItems = () => refreshed.items.filter((item) => selectedAttachmentNames.includes(item.displayName));
        await step('admin.select', 'admin', {}, async () => {
            for (const checkbox of await section().locator('input[type=checkbox]').all()) if (await checkbox.isEnabled()) await checkbox.uncheck();
            for (const name of selectedAttachmentNames) { const checkbox = itemRow(name).locator('input[type=checkbox]'); await expect(checkbox).toBeEnabled(); await checkbox.check(); }
            assert.equal(selectedItems().length, selectedAttachmentNames.length);
            assert(selectedItems().every((item) => item.selectionId && Number.isInteger(item.rowVersion)));
            await expect(section().getByText(`已选择 ${selectedAttachmentNames.length} 项`, { exact: true })).toBeVisible();
            return { selections: selectedItems().map((item) => ({ selectionId: item.selectionId, rowVersion: item.rowVersion, attachmentId: item.attachmentId })) };
        });
        await step('admin.create-package', 'admin', { selections: selectedItems().map((item) => ({ selectionId: item.selectionId, attachmentId: item.attachmentId, rowVersion: item.rowVersion })) }, async () => {
            const pending = response('POST', `/api/project-handovers/${handoverId}/attachment-download-packages`);
            await (await kButton('创建下载包')).click();
            const actual = await pending; assert.equal(actual.status(), 200); packageSummary = await actual.json();
            assert(UUID.test(packageSummary.id)); assert.equal(packageSummary.status, 'ready');
            const latestPackageHeading = section().getByText('最近下载包', { exact: true });
            await expect(latestPackageHeading).toHaveCount(1); await expect(latestPackageHeading).toBeVisible();
            // Original package header places this status p-tag beside its title;
            // the fact-grid has a separate metric with the same ready text.
            const latestPackageStatus = latestPackageHeading.locator('..').locator(':scope > p-tag .p-tag-label');
            await expect(latestPackageStatus).toHaveCount(1); await expect(latestPackageStatus).toHaveText('可下载');
            await expect(latestPackageStatus).toBeVisible();
            await expect(await kButton('下载包')).toBeEnabled();
            if (onPackageCreated) await onPackageCreated(structuredClone({ backend, tag, handoverId, summary: packageSummary }));
            await screenshot('admin-package-ready');
            return { status: actual.status(), packageId: packageSummary.id, packageStatus: packageSummary.status, includedCount: packageSummary.manifestSummary.includedCount };
        });
        await step('admin.download-package', 'admin', { packageId: packageSummary.id }, async () => {
            const binary = response('GET', `/api/attachment-download-packages/${packageSummary.id}/download`);
            const status = response('GET', `/api/attachment-download-packages/${packageSummary.id}`);
            const downloaded = activePage.waitForEvent('download', { timeout: 25000 }); downloaded.catch(() => {});
            await (await kButton('下载包')).click();
            assert.equal((await binary).status(), 200); const download = await downloaded;
            assert.equal(await download.failure(), null); const file = path.join(directory, 'download.zip'); assert(!fs.existsSync(file)); await download.saveAs(file);
            const bytes = fs.readFileSync(file), parsed = storedZip(bytes), manifest = parsed.manifest;
            assert.equal(manifest.packageId, packageSummary.id); assert.equal(manifest.handoverId.toLowerCase(), handoverId.toLowerCase());
            if (expectedProjectId) assert.equal(manifest.projectId, expectedProjectId);
            assert.equal(manifest.manifestSummary.includedCount, selectedAttachmentNames.length); assert.equal(manifest.items.length, selectedAttachmentNames.length);
            assert.deepEqual(manifest.items.map((item) => item.displayName).sort(), [...selectedAttachmentNames].sort());
            assert.equal(parsed.entries.length, manifest.items.length + 1);
            for (const item of manifest.items) {
                const entry = parsed.entries.find((candidate) => candidate.name === item.fileName); assert(entry, 'Manifest entry missing from actual ZIP');
                assert.equal(entry.sha256, expectedAttachmentSha256[item.displayName], 'ZIP entry differs from actual uploaded bytes');
                assert.equal(item.attachmentId, selectedItems().find((candidate) => candidate.displayName === item.displayName).attachmentId);
            }
            const actualStatus = await status; assert.equal(actualStatus.status(), 200); const updated = await actualStatus.json(); assert.equal(updated.id, packageSummary.id);
            assert.equal(download.suggestedFilename(), packageSummary.fileName);
            report.download = { file: path.relative(ROOT, file).split(path.sep).join('/'), bytes: bytes.length, sha256: sha(bytes), suggestedFilename: download.suggestedFilename(),
                packageId: manifest.packageId, handoverId: manifest.handoverId,
                entries: parsed.entries.map(({ name, bytes, sha256, crc32 }) => ({ name, bytes, sha256, crc32 })), includedAttachmentIds: manifest.manifestSummary.includedAttachmentIds };
            await screenshot('admin-downloaded'); return { binaryStatus: 200, packageGetStatus: actualStatus.status(), zipBytesVerified: true, packageId: packageSummary.id };
        });
        await step('admin.logout', 'admin', {}, async () => {
            const pending = response('POST', '/api/auth/session:logout'); await activePage.getByRole('button', { name: '退出', exact: true }).click();
            const actual = await pending; assert.equal(actual.status(), 200); await expect(activePage.locator('#kUsername')).toBeVisible();
            return { logoutStatus: actual.status(), originalAuthLogoutPerformed: true };
        });
        await context.clearCookies(); assert.equal((await context.cookies()).length, 0); await context.close(); context = undefined;
        report.adminLoggedOutAndCookiesCleared = true;
        await login('viewer', viewerCredentials, viewerExpectedLoadStatus);
        await step('viewer.refresh-denied', 'viewer', {}, async () => {
            const pending = response('POST', `/api/project-handovers/${handoverId}/attachment-checklist:refresh`);
            await (await kButton('刷新扫描')).click(); const actual = await pending; assert.equal(actual.status(), 403);
            await expect(section().getByText('你没有权限查看当前工作区。', { exact: true })).toBeVisible();
            await screenshot('viewer-refresh-403'); return { refreshStatus: actual.status(), originalStoreErrorFeedbackVisible: true, packageCreationTested: false };
        });
        await Promise.all(pendingAssets);
        const kPaths = new Set(report.network.filter((item) => !item.path.startsWith('/api/auth/')).map((item) => item.method + ' ' + item.path));
        for (const required of [`GET /api/project-handovers/${handoverId}/attachment-checklist`, `POST /api/project-handovers/${handoverId}/attachment-checklist:refresh`,
            `POST /api/project-handovers/${handoverId}/attachment-download-packages`, `GET /api/attachment-download-packages/${packageSummary.id}/download`, `GET /api/attachment-download-packages/${packageSummary.id}`]) assert(kPaths.has(required), 'Missing real K operation in browser traffic');
        for (const item of report.network) assert(item.path.startsWith('/api/auth/') || /^\/api\/attachment-download-packages\//.test(item.path)
            || item.path.startsWith(`/api/project-handovers/${handoverId}/attachment-`), 'Unexpected non-K/R4 API request');
        assert.deepEqual(report.browserErrors, []);
        for (const item of sources) assert.equal(sha(fs.readFileSync(path.join(ROOT, item.source))), item.rawBytesSha256);
        assert.deepEqual(filesUnder(buildDirectory).map(fileIdentity), buildFiles); report.inputsAndBuildUnchanged = true; report.result = 'pass';
    } catch (error) {
        report.result = 'fail'; report.failure = { role: currentRole, step: currentStep, name: error.name, message: redact(error.message) };
        if (!signal?.aborted && activePage && !activePage.isClosed()) {
            await sectionDiagnostic('failure');
            try { await screenshot('failure'); } catch { report.failureScreenshotUnavailable = true; }
        }
    } finally {
        await closeOwner(context, 'context'); await closeOwner(browser, 'browser');
        try { await bounded(Promise.allSettled(pendingAssets), 5000); } catch { report.assetCloseDeadlineExceeded = true; }
        signal?.removeEventListener('abort', onAbort);
        report.browserClosed = !browser || !browser.isConnected();
        if (signal?.aborted) { report.cancelled = true; report.result = 'fail'; }
        if (!report.browserClosed || report.closeFailures?.length || report.assetCloseDeadlineExceeded) report.result = 'fail';
        report.fixtureCleanupPerformed = false; report.serverLifecycleOwnedByRoot = true; report.finishedAt = new Date().toISOString();
        const reportFile = path.join(directory, 'report.json'); fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
        report.reportFile = path.relative(ROOT, reportFile).split(path.sep).join('/'); report.reportRawBytesSha256 = sha(fs.readFileSync(reportFile));
    }
    if (report.result !== 'pass') {
        const error = new Error(`K UI attempt failed at ${currentStep}; public report: ${report.reportFile}`); error.report = report; throw error;
    }
    return report;
}
