import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, lstatSync } from 'node:fs';
import path from 'node:path';
const marker = (value) => (/^\[sanitized:length=\d+:sha256=[0-9a-f]{64}\]$/.test(value) ? value : `[sanitized:length=${value.length}:sha256=${createHash('sha256').update(value).digest('hex')}]`);
export function sanitizeBrowserText(text) {
    return String(text)
        .replace(/R2GH_[0-9a-f-]{36}_synthetic_only/gi, (value) => marker(value))
        .replace(/([?&#](?:state|code|ticket)=)([^&\s"'<>]+)/gi, (_match, key, value) => key + marker(value))
        .replace(/((?:poms_session|poms_csrf)=)([^;\s"'<>]+)/g, (_match, key, value) => key + marker(value))
        .replace(/((?:"|')?(?:ticket|state|csrfToken|accessToken|refreshToken)(?:"|')?\s*:\s*["'])([^"']+)(["'])/g, (_match, key, value, end) => key + marker(value) + end);
}
function sanitizeError(error) {
    for (const key of ['message', 'stack', 'snippet']) if (typeof error?.[key] === 'string') error[key] = sanitizeBrowserText(error[key]);
}
export function sanitizeBrowserArtifacts(directory) {
    const root = path.resolve(directory),
        workspace = path.resolve('tmp/rust-r2gh');
    if (!root.startsWith(workspace + path.sep) || !path.basename(root).startsWith('browser-')) throw new Error('Only owned GH browser artifacts may be sanitized');
    const changes = [];
    const walk = (folder) => {
        for (const entry of readdirSync(folder, { withFileTypes: true })) {
            const file = path.join(folder, entry.name);
            if (lstatSync(file).isSymbolicLink()) throw new Error('Browser artifact symlink is forbidden');
            if (entry.isDirectory()) {
                if (entry.name !== 'inputs') walk(file);
            } else if (/\.(?:md|json|txt|log)$/.test(entry.name)) {
                const bytes = readFileSync(file),
                    before = bytes.toString('utf8'),
                    after = sanitizeBrowserText(before);
                if (before !== after) {
                    writeFileSync(file, after, { mode: 0o600 });
                    changes.push({
                        file: path.relative(process.cwd(), file),
                        originalBytes: bytes.length,
                        originalSha256: createHash('sha256').update(bytes).digest('hex'),
                        sanitizedBytes: Buffer.byteLength(after),
                        sanitizedSha256: createHash('sha256').update(after).digest('hex')
                    });
                }
            }
        }
    };
    walk(root);
    return changes;
}
export default class BrowserSanitizer {
    onStepBegin(test, _result, step) {
        if (step.category === 'pw:api') process.stdout.write(JSON.stringify({ test: test.title, step: sanitizeBrowserText(step.title) }) + '\n');
    }
    onTestEnd(_test, result) {
        for (const error of result.errors ?? []) sanitizeError(error);
    }
    onError(error) {
        sanitizeError(error);
    }
}
