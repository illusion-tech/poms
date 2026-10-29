// Pure metadata mapping from the actual original alpha03 report. No ORM/PG.
import fs from 'node:fs';
const input = process.argv.slice(2).find((value) => !value.startsWith('--')) ?? 'tmp/rust-r2l1/native-calibration-alpha03.json';
const report = JSON.parse(fs.readFileSync(input, 'utf8'));
if (report.result !== 'observed' && report.result !== 'Pass' && report.result !== 'pass') throw new Error('Actual Native report must be successful');
const names = { approval_record: 'Approval', todo_item: 'Todo', confirmation_record: 'Confirmation', confirmation_participant: 'Participant', approval_summary_package_definition: 'Definition', approval_summary_snapshot: 'Snapshot', approval_summary_field_projection: 'Projection' };
if (report.metadata.length !== 7 || report.metadata.some((meta) => !Object.hasOwn(names, meta.tableName))) throw new Error('Seven original metadata tables required');
let code = `// Mechanically mapped from original seven-schema Native alpha03 metadata.
// Original entity/DDL remains authority; no schema is created here.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub enum Table { Approval, Todo, Confirmation, Participant, Definition, Snapshot, Projection }
#[derive(Clone, Copy, Debug)]
pub struct Column { pub property: &'static str, pub sql: &'static str, pub cast: &'static str, pub nullable: bool, pub version: bool, pub default: Option<&'static str>, pub default_raw: bool }
impl Table {
pub fn name(self) -> &'static str { match self {`;
for (const meta of report.metadata) code += `Self::${names[meta.tableName]} => ${JSON.stringify(meta.tableName)},`;
code += `} }
pub fn class_name(self) -> &'static str { match self {`;
for (const meta of report.metadata) code += `Self::${names[meta.tableName]} => ${JSON.stringify(meta.tableName === 'confirmation_record' ? 'ConfirmationRecord' : meta.className)},`;
code += `} }
pub fn columns(self) -> &'static [Column] { match self {
`;
for (const meta of report.metadata) {
    code += `Self::${names[meta.tableName]} => &[
`;
    for (const property of meta.properties) {
        const type = property.columnTypes[0];
        const cast = type.startsWith('varchar') || type === 'text' ? 'text' : type === 'int' ? 'integer' : type;
        const defaultValue = property.default === undefined ? 'None' : `Some(${JSON.stringify(String(property.default))})`;
        code += `Column {property:${JSON.stringify(property.name)},sql:${JSON.stringify(property.fieldNames[0])},cast:${JSON.stringify(cast)},nullable:${!!property.nullable},version:${!!property.version},default:${defaultValue},default_raw:${property.defaultRaw !== undefined}},
`;
    }
    code += `],
`;
}
code += `} }
}
`;
const target = 'apps/poms-api-rust/src/approval_common/schema.rs';
if (process.argv.includes('--check')) {
    // Root cargo fmt may format the candidate; mapping checks use whitespace-free source.
    const normalize = (text) => text.replaceAll(/,\s*(?=[}\]])/g, '').replaceAll(/\s/g, '');
    if (normalize(fs.readFileSync(target, 'utf8')) !== normalize(code)) throw new Error('Original metadata mapping differs');
} else fs.writeFileSync(target, code, 'utf8');
process.stdout.write(`${JSON.stringify({ kind: 'pure-actual-metadata-export', tables: 7, columns: report.metadata.reduce((sum, meta) => sum + meta.properties.length, 0), ormPgExecuted: false })}\n`);
