// Matches pinned Rust Config::from_sources; no env material is logged/published.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { sha } from './pure.mjs';

export const authKeys = Object.freeze(['AUTH_SESSION_LAST_SEEN_THROTTLE_SECONDS', 'AUTH_SESSION_IDLE_TIMEOUT_SECONDS']);
export function parseEnvFileValues(text, keys = authKeys) {
  // dotenv17.4.2 parse scanner, also the pinned Rust config.rs26-vector oracle.
  const line = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg;
  const result = {}, lines = text.replace(/\r\n?/mg, '\n'); let match;
  while ((match = line.exec(lines)) !== null) {
    // Scan complete multiline syntax, but retain only the explicitly selected
    // nonsecret keys. An AUTH-looking line inside another quoted value is data.
    if (!keys.includes(match[1])) continue;
    let value = (match[2] ?? '').trim(); const quote = value[0];
    value = value.replace(/^(['"`])([\s\S]*)\1$/mg, '$2');
    if (quote === '"') value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
    result[match[1]] = value;
  }
  return result;
}
export function chooseEnvFile(processValues, cwd, exists) {
  const explicit = processValues.POMS_ENV_FILE?.trim();
  if (explicit) {
    const selected = path.resolve(cwd, explicit); assert(exists(selected), 'Actual explicit startup env file is missing');
    return { selected, overrideExisting: true };
  }
  return { selected: [path.join(cwd, '.env'), path.join(cwd, 'apps/poms-api/.env')].find(exists) ?? null, overrideExisting: false };
}
export function mergeAuthSettings(processValues, fileValues, overrideExisting) {
  const values = {}, origins = {};
  for (const key of authKeys) {
    if (Object.hasOwn(processValues, key)) { values[key] = processValues[key]; origins[key] = 'actual-process'; }
    if (Object.hasOwn(fileValues, key) && (overrideExisting || !Object.hasOwn(values, key))) { values[key] = fileValues[key]; origins[key] = 'actual-selected-file'; }
    // Defaults apply only when the selected file AND process have no assignment.
    if (!Object.hasOwn(values, key)) { values[key] = key === authKeys[0] ? '60' : '900'; origins[key] = 'pinned-Rust-default-both-absent'; }
  }
  const integer = (key, min) => {
    const raw = values[key].trim(); let n;
    // Rust js_number uses unsigned u64 parse for0x/0b/0o before f64 conversion.
    if (/^0[xX]/.test(raw)) { assert(/^0[xX][0-9a-fA-F]+$/.test(raw)); n = Number(raw); }
    else if (/^0[bB]/.test(raw)) { assert(/^0[bB][01]+$/.test(raw)); n = Number(raw); }
    else if (/^0[oO]/.test(raw)) { assert(/^0[oO][0-7]+$/.test(raw)); n = Number(raw); }
    else { assert(raw === '' || /^[+-]?(?:(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?|inf(?:inity)?|NaN)$/i.test(raw)); n = raw === '' ? 0 : Number(raw); }
    assert(Number.isSafeInteger(n) && n >= min, 'Actual configured seconds are outside pinned Rust supported range'); return n;
  };
  return { throttleSeconds: integer(authKeys[0], 0), idleSeconds: integer(authKeys[1], 1), origins };
}
function utf8(bytes) { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
export function selectedProcessValues(bytes) {
  const values = {};
  for (const entry of bytes.toString('binary').split('\0')) {
    const at = entry.indexOf('='); if (at < 0) continue;
    const key = entry.slice(0, at); if (![...authKeys, 'POMS_ENV_FILE'].includes(key)) continue;
    assert(!Object.hasOwn(values, key), 'Duplicate selected process environment entries cannot be attributed safely');
    values[key] = utf8(Buffer.from(entry.slice(at + 1), 'binary'));
  }
  return values;
}
function statIdentity(stat) {
  return Object.fromEntries(['dev', 'ino', 'nlink', 'uid', 'gid', 'mode', 'size', 'mtimeNs', 'ctimeNs', 'birthtimeNs'].map(k => [k, String(stat[k])]));
}
export function assertStartupFileIdentity(stat, { startedAt, processUid }) {
  assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1n, 'Startup env must remain a regular single-link file');
  assert.equal(stat.mode & 0o777n, 0o600n, 'Current pinned launcher creates the env with wx/mode0600');
  assert.equal(stat.uid, BigInt(processUid), 'Env must be owned by the actual bound process user');
  const start = Date.parse(startedAt); assert(Number.isSafeInteger(start)); const recordedStartNs = BigInt(start) * 1000000n;
  // Reject changed bytes, replacements and post-start utimes, including resetting
  // mtime to an older value (ctime would still advance).
  assert(stat.mtimeNs <= recordedStartNs && stat.ctimeNs <= recordedStartNs, 'Selected env changed after the recorded process launch');
  if (stat.birthtimeNs > 0n) assert(stat.birthtimeNs <= recordedStartNs);
}
export function loadActualAuthConfig(ctx) {
  assert.equal(process.platform, 'linux');
  const sourcePins = JSON.parse(fs.readFileSync(new URL('./auth-config-sources17a.json', import.meta.url)));
  for (const pin of sourcePins) {
    assert.equal(sha(fs.readFileSync(`${ctx.win}/${pin.file}`)), pin.sha256, 'Auth startup/launch source bytes changed');
    if (pin.file.startsWith('apps/poms-api-rust/src/')) {
      assert.equal(ctx.pins.find(p => p.file === pin.file)?.sha256, pin.sha256);
      assert.equal(sha(fs.readFileSync(`${ctx.mirror}/${pin.file}`)), pin.sha256, 'Actual mirror startup source differs from frozen Root source');
    }
  }
  const binding = ctx.state.apiProcess, record = binding?.record; assert(record?.pid && record.startTime && record.startedAt);
  assert(binding.file.startsWith(ctx.private + '/') && fs.realpathSync(binding.file) === path.resolve(binding.file));
  const recordBytes = fs.readFileSync(binding.file); assert.equal(sha(recordBytes), binding.rawBytesSha256); assert.deepEqual(JSON.parse(recordBytes), record);
  const proc = `/proc/${record.pid}`;
  assert.equal(fs.readFileSync(proc + '/stat', 'utf8').split(' ')[21], record.startTime);
  assert.equal(fs.realpathSync(proc + '/exe'), record.binary); assert.equal(sha(fs.readFileSync(record.binary)), record.binarySha256);
  const cwd = fs.realpathSync(proc + '/cwd'); assert.equal(cwd, ctx.mirror); assert.equal(record.root, ctx.mirror);
  const environment = fs.readFileSync(proc + '/environ'), processValues = selectedProcessValues(environment);
  const selection = chooseEnvFile(processValues, cwd, fs.existsSync);
  let fileValues = {}, fileIdentity = null;
  if (selection.selected) {
    // The actual reviewed launcher writes this exact private edition file with
    // wx before spawn. Never inspect some old checkout's default env file.
    const expected = binding.file.replace(/-process\.json$/, '.env'); assert.notEqual(expected, binding.file);
    assert(selection.overrideExisting && selection.selected === expected && expected.startsWith(ctx.private + '/rust-api') && /^rust-api\d+\.env$/.test(path.basename(expected)), 'Selected env is outside this namespace process edition');
    assert.equal(fs.realpathSync(expected), path.resolve(expected), 'No env path redirection');
    const before = fs.lstatSync(expected, { bigint: true });
    assertStartupFileIdentity(before, { startedAt: record.startedAt, processUid: fs.statSync(proc, { bigint: true }).uid });
    const bytes = fs.readFileSync(expected); const after = fs.lstatSync(expected, { bigint: true }); assert.deepEqual(statIdentity(before), statIdentity(after), 'Env changed while being read');
    fileValues = parseEnvFileValues(utf8(bytes)); fileIdentity = { file: expected, rawBytesSHA256: sha(bytes), stat: statIdentity(after) };
  }
  const settings = mergeAuthSettings(processValues, fileValues, selection.overrideExisting);
  const observation = { kind: 'actual-source-and-process-bound-auth-configuration', processRecord: { file: binding.file, rawBytesSHA256: binding.rawBytesSha256 },
    pid: record.pid, startTime: record.startTime, startedAt: record.startedAt, cwd, initialProcessEnvironmentSHA256: sha(environment),
    selectedFile: fileIdentity, overrideExisting: selection.overrideExisting, selectedNonsecretProcessValues: processValues,
    selectedNonsecretFileValues: fileValues, settings, sourcePins, fullEnvBytesCopiedOrPublished: false };
  const key = `${record.pid}:${record.startTime}`; ctx.state.actualAuthConfigurations ??= {};
  const prior = ctx.state.actualAuthConfigurations[key];
  if (prior) {
    const bytes = fs.readFileSync(prior.file); assert.equal(sha(bytes), prior.rawBytesSha256); assert.deepEqual(JSON.parse(bytes), observation, 'Startup config identity changed during this process run');
  } else {
    ctx.state.actualAuthConfigurations[key] = ctx.artifact(`${ctx.next('actual-auth-config')}.json`, observation,
      { kind: 'actual-source-and-process-bound-auth-configuration', explicitEditionFileVerified: Boolean(fileIdentity), onlyTwoNonsecretKeysRetained: true, fullEnvPublished: false }); ctx.persist();
  }
  return settings;
}
