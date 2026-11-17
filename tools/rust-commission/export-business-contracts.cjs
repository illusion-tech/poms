// Current business contracts come from actual TypeScript. The old R0/S5/273
// manifests and witnesses remain historical inputs; no acceptance runner runs.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { pathToFileURL } = require('node:url');
const { z } = require('zod');
const root = path.resolve(__dirname, '../..');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, file);
const shared = require(path.join(root, 'libs/shared/contracts/src/index.ts'));
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const json = value => JSON.stringify(value, null, 2) + '\n';
const symbol = wire => wire.split(/[^a-zA-Z0-9]+/).map(part => part[0].toUpperCase() + part.slice(1)).join('');
const overlays = 'tools/rust-commission/business-contract-values.json';
const variants = values => values.map(wire => ({ name: symbol(wire), wire }));
const schemaFile = 'libs/shared/contracts/src/lib/commission-low-down-payment.ts';

async function outputs() {
  const base = read('tools/rust-r1b/shared-manifest.json');
  const permission = base.enums.find(e => e.name === 'PermissionKey');
  if (!permission.values.every(value => shared.PERMISSION_KEYS.includes(value))) throw new Error('Existing permissions cannot disappear during the business extension');
  const currentPermission = { ...permission, values: [...shared.PERMISSION_KEYS], variants: variants(shared.PERMISSION_KEYS) };
  const decision = { name: 'CommissionLowDownPaymentDecision', sourceSymbol: 'COMMISSION_LOW_DOWN_PAYMENT_DECISIONS', origin: 'shared-array', source: { path: schemaFile, line: 3, column: 14 }, aliases: [], values: [...shared.COMMISSION_LOW_DOWN_PAYMENT_DECISIONS], variants: variants(shared.COMMISSION_LOW_DOWN_PAYMENT_DECISIONS), occurrenceIds: [] };
  const declarations = base.declarations.filter(d => ['PERMISSION_KEYS', 'PermissionsMeta'].includes(d.name)).map(d => ({ ...d, value: shared[d.name] }));
  const enumOccurrences = base.enumOccurrences.filter(item => item.family === 'PermissionKey').map(item => ({ ...item, values: [...shared.PERMISSION_KEYS], openApiValues: item.openApiValues === null ? null : [...shared.PERMISSION_KEYS] }));
  const overlay = { source: ['libs/shared/contracts/src/lib/shared-contracts.ts', schemaFile], enums: [currentPermission, decision], declarations, enumOccurrences, coverage: { permissionKeys: shared.PERMISSION_KEYS.length, generatedEnumFamilies: base.enums.length + 1 } };
  const manifest = structuredClone(base);
  for (const group of ['enums', 'declarations', 'enumOccurrences']) for (const entry of overlay[group]) {
    const key = group === 'enumOccurrences' ? 'id' : 'name';
    const index = manifest[group].findIndex(item => item[key] === entry[key]);
    if (index < 0) manifest[group].push(entry); else manifest[group][index] = entry;
  }
  manifest.coverage.permissionKeys = shared.PERMISSION_KEYS.length;
  manifest.coverage.generatedEnumFamilies = manifest.enums.length;
  const renderer = await import(pathToFileURL(path.join(root, 'tools/rust-r1b/export-shared.mjs')));
  let rust = renderer.renderRust(manifest);
  const original = 'pub fn manifest() -> serde_json::Result<serde_json::Value> {\n    serde_json::from_str(MANIFEST_JSON)\n}';
  if (!rust.includes(original)) throw new Error('Shared renderer entry changed');
  rust = rust.replace(original, `#[rustfmt::skip]
pub fn manifest() -> serde_json::Result<serde_json::Value> {
    let mut value: serde_json::Value = serde_json::from_str(MANIFEST_JSON)?;
    let delta: serde_json::Value = serde_json::from_str(include_str!("../../../../${overlays}"))?;
    for group in ["enums", "declarations", "enumOccurrences"] {
        let error = || <serde_json::Error as serde::de::Error>::custom("Invalid generated business contracts");
        let target = value.get_mut(group).and_then(serde_json::Value::as_array_mut).ok_or_else(error)?;
        for entry in delta.get(group).and_then(serde_json::Value::as_array).ok_or_else(error)? {
            let key = if group == "enumOccurrences" { "id" } else { "name" };
            if let Some(old) = target.iter_mut().find(|old| old[key] == entry[key]) { *old = entry.clone(); }
            else { target.push(entry.clone()); }
        }
    }
    value["coverage"]["permissionKeys"] = delta["coverage"]["permissionKeys"].clone();
    value["coverage"]["generatedEnumFamilies"] = delta["coverage"]["generatedEnumFamilies"].clone();
    value["authority"]["currentBusinessSources"] = delta["source"].clone();
    Ok(value)
}`);
  rust = '// @generated current business delta by tools/rust-commission/export-business-contracts.cjs.\n' + rust;
  const authority = read('tools/rust-r2b/roles-authority.json');
  const template = authority.permissions[0];
  const permissions = shared.PERMISSION_KEYS.map(key => ({ ...template, key, name: key, ...shared.PermissionsMeta[key] }));
  const golden = read('tools/rust-r2b/roles-golden.json');
  const addedPermissions = shared.PERMISSION_KEYS.filter(key => !permission.values.includes(key));
  golden.cases.push({ name: 'AssignRolePermissionsRequest:current-business-permissions', schema: 'AssignRolePermissionsRequest', inputRaw: JSON.stringify({ permissionKeys: addedPermissions }), expected: {} });
  for (const sample of golden.cases) {
    const schema = shared[sample.schema + 'Schema'];
    if (!schema) throw new Error('Missing current schema: ' + sample.schema);
    try {
      const parsed = schema.safeParse(sample.inputRaw === null ? undefined : JSON.parse(sample.inputRaw));
      sample.expected = parsed.success ? { success: true, dataRaw: JSON.stringify(parsed.data) } : { success: false, errors: parsed.error.issues };
    } catch (error) {
      if (!sample.expected.internalError) throw error;
    }
  }
  golden.oracle = 'Actual current TypeScript/Zod schemas; historical cases retained';
  golden.source = 'libs/shared/contracts/src/lib/shared-contracts.ts';
  delete golden.sourceHead;
  const auditAuthority = read('tools/rust-r2ef/f-authority.json');
  auditAuthority.permissionKeys = [...shared.PERMISSION_KEYS];
  for (const name of Object.keys(auditAuthority.schemaKeys)) {
    const schema = shared[name + 'Schema'];
    if (!schema?.shape) throw new Error('Missing current audit object schema: ' + name);
    auditAuthority.schemaKeys[name] = Object.keys(schema.shape);
  }
  auditAuthority.source = 'libs/shared/contracts/src/lib/shared-contracts.ts';
  delete auditAuthority.sourceHead;
  const auditGolden = read('tools/rust-r2ef/f-golden.json');
  const deniedExample = auditGolden.cases.find(sample => sample.schema === 'RecordRouteDeniedSecurityEventRequest' && sample.expected.success);
  if (!deniedExample) throw new Error('Missing original valid route-denied sample');
  auditGolden.cases.push({ name: 'current-business-permission', schema: 'RecordRouteDeniedSecurityEventRequest', inputRaw: JSON.stringify({ ...JSON.parse(deniedExample.inputRaw), requiredPermissions: addedPermissions }), expected: {} });
  for (const sample of auditGolden.cases) {
    const schema = shared[sample.schema + 'Schema'];
    if (!schema) throw new Error('Missing current audit schema: ' + sample.schema);
    try {
      const parsed = schema.safeParse(sample.inputRaw === null ? undefined : JSON.parse(sample.inputRaw));
      sample.expected = parsed.success ? { success: true, dataRaw: JSON.stringify(parsed.data) } : { success: false, errors: parsed.error.issues };
    } catch (error) { if (!sample.expected.schemaException) throw error; }
  }
  auditGolden.source = 'libs/shared/contracts/src/lib/shared-contracts.ts';
  delete auditGolden.sourceHead;
  function changedCases(current, originalFile) {
    const original = read(originalFile);
    const key = sample => JSON.stringify([sample.schema, sample.name, sample.inputRaw]);
    const old = new Map(original.cases.map(sample => [key(sample), sample]));
    return { source: current.source, base: originalFile, cases: current.cases.filter(sample => JSON.stringify(old.get(key(sample))?.expected) !== JSON.stringify(sample.expected)) };
  }
  const spec = read('libs/shared/api-spec/openapi.json');
  function updatePermissionEnums(value) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value.enum) && JSON.stringify(value.enum) === JSON.stringify(permission.values)) value.enum = [...shared.PERMISSION_KEYS];
    for (const child of Object.values(value)) updatePermissionEnums(child);
  }
  updatePermissionEnums(spec);
  function oas(schema) {
    if (Array.isArray(schema)) return schema.map(oas);
    if (!schema || typeof schema !== 'object') return schema;
    const result = Object.fromEntries(Object.entries(schema).filter(([key]) => key !== '$schema').map(([key, value]) => [key, oas(value)]));
    if (Object.hasOwn(result, 'const')) { result.enum = [result.const]; delete result.const; }
    if (typeof result.$ref === 'string') result.$ref = result.$ref.replace(/^#\/(?:definitions|\$defs)\//, '#/components/schemas/');
    if (Array.isArray(result.type) && result.type.includes('null')) {
      const types = result.type.filter(type => type !== 'null');
      if (types.length !== 1) throw new Error('Unsupported current nullable schema');
      result.type = types[0]; result.nullable = true;
    }
    for (const suffix of ['Minimum', 'Maximum']) {
      const key = 'exclusive' + suffix;
      if (typeof result[key] === 'number') { result[suffix.toLowerCase()] = result[key]; result[key] = true; }
    }
    return result;
  }
  const currentNames = ['CommissionLowDownPaymentDecision', 'ApproveCommissionLowDownPaymentReleaseRequest', 'CommissionLowDownPaymentReleaseSummary', 'CommissionLowDownPaymentContractContext', 'CommissionLowDownPaymentContext', 'CommissionLowDownPaymentReleaseListView'];
  for (const name of currentNames) {
    const emitted = z.toJSONSchema(shared[name + 'Schema'], { target: 'draft-7', io: name.startsWith('Approve') ? 'input' : 'output' });
    const definitions = emitted.definitions ?? emitted.$defs;
    if (!definitions?.[name]) throw new Error('Missing actual named TypeScript schema: ' + name);
    for (const [definitionName, value] of Object.entries(definitions)) {
      if (currentNames.includes(definitionName) || !spec.components.schemas[definitionName]) spec.components.schemas[definitionName] = oas(value);
    }
  }
  const route = '/api/projects/{projectId}/commission-low-down-payment-releases';
  const reference = { $ref: '#/components/schemas/CommissionLowDownPaymentReleaseSummary' };
  spec.paths[route] = Object.fromEntries([
    ['get', { operationId: 'CommissionController_listLowDownPaymentReleases', summary: '查询低首付款批准条件和管理层批准记录', tags: ['Commission'], parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], security: [{ pomsSession: [] }], responses: { 200: { description: '', content: { 'application/json': { schema: { $ref: '#/components/schemas/CommissionLowDownPaymentReleaseListView' } } } } } }],
    ['post', { operationId: 'CommissionController_approveLowDownPaymentRelease', summary: '管理层确认低首付款特例或解除', tags: ['Commission'], parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], security: [{ pomsSession: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ApproveCommissionLowDownPaymentReleaseRequest' } } } }, responses: { 201: { description: '', content: { 'application/json': { schema: reference } } } } }],
  ]);
  return new Map([
    [overlays, json(overlay)],
    ['apps/poms-api-rust/src/shared/generated.rs', rust],
    ['apps/poms-api-rust/tests/shared_generated.rs', renderer.renderRustTests(manifest)],
    ['tools/rust-commission/permissions-current.json', json(permissions)],
    ['tools/rust-commission/roles-current-golden.json', json(changedCases(golden, 'tools/rust-r2b/roles-golden.json'))],
    ['tools/rust-commission/audit-current-authority.json', json(auditAuthority)],
    ['tools/rust-commission/audit-current-golden.json', json(changedCases(auditGolden, 'tools/rust-r2ef/f-golden.json'))],
    ['libs/shared/api-spec/openapi.json', json(spec)],
  ]);
}

(async () => {
  const mode = process.argv[2];
  if (!['--write', '--check'].includes(mode) || process.argv.length !== 3) throw new Error('Usage: export-business-contracts.cjs --write|--check');
  const result = await outputs();
  for (const [file, text] of result) {
    const target = path.join(root, file);
    if (mode === '--write') fs.writeFileSync(target, text, 'utf8');
    else if (fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') !== text.replace(/\r\n/g, '\n')) throw new Error('Stale business contract output: ' + file);
  }
  process.stdout.write(JSON.stringify({ mode, outputs: result.size, permissions: shared.PERMISSION_KEYS.length }) + '\n');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
