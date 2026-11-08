// Only immutable failed UI03 logs. Never print assertion values or cookies.
import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict'; import { createHash } from 'node:crypto'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), root = '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/ui/runtime14/dom14-source12-03', sha = bytes => createHash('sha256').update(bytes).digest('hex');
const files = fs.readdirSync(root + '/http').filter(name => /^error-[0-9]+\.log$/.test(name)).map(name => root + '/http/' + name); files.push(root + '/linux-failure.log');
const errors = [];
for (const file of files) {
  const bytes = fs.readFileSync(file), text = bytes.toString('utf8');
  const frames = text.split(/\r?\n/).filter(line => /^\s+at [^\r\n]+:\d+:\d+\)?\s*$/.test(line)).filter(line => !/(?:cookie|poms_session|csrf|Bearer|password)=/i.test(line)).map(line => line.trim());
  const codes = [...new Set([...text.matchAll(/\b(?:ERR_ASSERTION|ECONNREFUSED|ECONNRESET|EPIPE|ETIMEDOUT|ERR_HTTP_INVALID_HEADER_VALUE|ERR_INVALID_ARG_TYPE|ERR_INVALID_CHAR|ERR_STREAM_PREMATURE_CLOSE|ERR_INVALID_URL)\b/g)].map(match => match[0]))];
  const errorClass = /^([A-Za-z]*Error)(?: \[[A-Z_]+\])?:/m.exec(text)?.[1] ?? null;
  errors.push({ file: file.replace('//wsl.localhost/Debian', ''), rawBytesSha256: sha(bytes), bytes: bytes.length, errorClass, codes, stackFramesOnly: frames });
}
assert(errors.length > 0); const result = { kind: 'H-read-only-actual-UI03-Linux-proxy-error-stack-locations', errors, cookiesAndAssertionValuesEmitted: false, HTTPExecuted: false, SQLExecuted: false, RootWritten: false };
fs.writeFileSync(here + '/diagnostic27.json', JSON.stringify(result, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify(result));
