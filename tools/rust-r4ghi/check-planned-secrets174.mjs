import fs from 'node:fs';
import assert from 'node:assert/strict';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms', priv = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private';
const planned = JSON.parse(fs.readFileSync(root + '/tmp/rust-r4ghi/root/implementation-checkpoint172/stage-plan.json')), values = [];
for (const name of ['owner-password', 'jwt-secret', 'native-app-password', 'rust-app-password']) values.push(fs.readFileSync(priv + '/' + name, 'utf8').trim());
for (const file of ['business/g2-business12/main01/state.json', 'retention/epoch10-before-correction53/state-at-retention53.json', 'retention/epoch11-before-noop70/state-at-retention70.json', 'retention/epoch12-before-source13-139/state-at-retention139.json', 'native-reference92/source12-native01/state.json']) {
  const state = JSON.parse(fs.readFileSync(priv + '/' + file)); for (const actor of Object.values(state.actors ?? {})) { if (typeof actor.password === 'string' && actor.password.length >= 8) values.push(actor.password); for (const cookie of Object.values(actor.cookies ?? {})) if (typeof cookie === 'string' && cookie.length >= 8) values.push(cookie, decodeURIComponent(cookie)); }
}
values.push(JSON.parse(fs.readFileSync(priv + '/native-reference92/source12-native01/http-credentials.json')).password);
const needles = [...new Set(values)].filter(value => value.length >= 8).map(value => Buffer.from(value)), matches = [], sensitiveStructuredKeys = [];
for (const entry of planned.files) { const raw = fs.readFileSync(root + '/' + entry.file); if (needles.some(value => raw.includes(value))) matches.push(entry.file);
  if (entry.file.endsWith('.json')) { const parsed = JSON.parse(raw); const found = []; const scan = value => { if (typeof value === 'string' && /"(?:password_hash|passwordHash|poms_session|poms_csrf)"\s*:\s*"[^"\s]{16,}"/.test(value)) found.push('nested-secret-shape'); if (!value || typeof value !== 'object') return; for (const [key, item] of Object.entries(value)) { if (/^(?:password|passwordHash|password_hash|poms_session|poms_csrf|authorization|accessToken|refreshToken)$/i.test(key) && typeof item === 'string' && item.length >= 16) found.push(key); scan(item); } }; scan(parsed); if (found.length) sensitiveStructuredKeys.push({ file: entry.file, shapes: [...new Set(found)] }); }
}
console.log(JSON.stringify({ plannedFiles: planned.files.length, matchedActualSecretsInFiles: matches, sensitiveStructuredKeys, actualSecretValuesPrinted: false })); assert.equal(matches.length, 0); assert.equal(sensitiveStructuredKeys.length, 0);
