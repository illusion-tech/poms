// Root prepares a new-batch real HTTP/PG adapter; definitions remain separate.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { pin } from './source-guard.mjs';
assert(JSON.parse(fs.readFileSync('docs/design/rust-r3m/g1-gate-authority01.json')).G2Authorized);
const source = 'tools/rust-r3hijk/acceptance-context01.mjs', target = 'tools/rust-r3m/acceptance-context01.mjs';
assert(!fs.existsSync(target));
let text = fs.readFileSync(source, 'utf8').replaceAll('r3hijk', 'r3m').replaceAll('R3HIJK', 'R3CO').replaceAll('HIJK', 'R3CO').replaceAll('hijk_', 'r3m_').replaceAll('hijk-', 'r3m-');
for (const [oldPort, newPort] of [['22433', '23433'], ['12400', '13400'], ['12410', '13410'], ['12500', '13500'], ['12600', '13600']]) text = text.replaceAll(oldPort, newPort);
function replaceOnce(before, after) { assert.equal(text.split(before).length, 2, 'Source derivation anchor changed: ' + before.slice(0, 70)); text = text.replace(before, after); }
replaceOnce("'tmp/rust-r3m/root/g0-current28-catalog02.json')).groups.flatMap(g=>g.operations)", "'docs/design/rust-r3-operation-slices.json')).operations");
replaceOnce("['lead','project','lead_score_snapshot'", "['customer','customer_alias','customer_contact','todo_item','sales_follow_up_record','project_technical_cost_package','project_technical_cost_item','project_bid_commercial_process','project_pricing_margin_review','lead','project','lead_score_snapshot'");
replaceOnce("['lead','lead_score_override','opportunity_stakeholder'", "['customer','customer_contact','project','lead','lead_score_override','opportunity_stakeholder'");
replaceOnce('ctx.ownedIds.add(a.userId);ctx.ownedIds.add(a.orgId);return a;', 'ctx.ownedIds.add(a.userId);ctx.ownedIds.add(a.orgId);ctx.ownedIds.add(a.roleId);return a;');
replaceOnce("write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\\n',{flag:'wx',mode:0o600})", `write=(file,value)=>{
 const raw=Buffer.from(JSON.stringify(value,null,2)+'\\n');
 if(file.startsWith(priv+'/')){fs.writeFileSync(file,raw,{flag:'wx',mode:0o600});return;}
 assert(file.startsWith(out+'/'),'Public write outside current phase');
 const original=directory+'/structured-original-'+file.slice(file.lastIndexOf('/')+1);
 fs.writeFileSync(original,raw,{flag:'wx',mode:0o600});
 const sensitive=new Set(['password','password_hash','passwordHash','token_hash','tokenHash','accessToken','refreshToken','csrfToken','jwtSecret']);let redactedFields=0;
 const clean=JSON.parse(JSON.stringify(value,(key,v)=>{if(sensitive.has(key)&&v!==null&&v!==undefined){redactedFields++;return '[redacted-in-public-derivative]';}return v;}));
 clean.publicDerivation={kind:'declared-structured-public-derivative',privateOriginal:pin(original),redactedFields,rawAuthAndSQLOnlyPrivate:true};
 fs.writeFileSync(file,JSON.stringify(clean,null,2)+'\\n',{flag:'wx',mode:0o600});
}`);
replaceOnce("const capture=spawnSync('podman',['--cgroup-manager=cgroupfs','logs',identity.container]", "const capture=spawnSync('podman',['--cgroup-manager=cgroupfs','logs','--since',captureSince,identity.container]");
replaceOnce("const db=await connect();", "const db=await connect();const captureSince=new Date().toISOString();");
// Each run verifies the complete immutable candidate, not merely a port or label.
text = text.replace("import{pin,guardNative,base,sha}", "import{pin,guardNative,guardCandidate,base,sha}");
replaceOnce("assert(/^\\d{2}$/.test(phase));guardNative();", "assert(/^\\d{2}$/.test(phase));guardCandidate();guardNative();");
replaceOnce('guardNative();assert.deepEqual(sources.map(p=>pin(p.file)),sources);', 'guardCandidate();guardNative();assert.deepEqual(sources.map(p=>pin(p.file)),sources);');
fs.writeFileSync(target, text, { flag: 'wx' });
const fixtures = [];
for (const key of ['a', 'b']) {
  const from = `docs/design/archive/slices/rust-r3hijk/originals/${key}-input/native-fixture-draft01.mjs`, to = `tmp/rust-r3m/${key}-input/native-fixture-draft01.mjs`;
  fs.mkdirSync(`tmp/rust-r3m/${key}-input`, { recursive: true });
  fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL);
  fixtures.push({ canonical: pin(from), currentNamespaceExactCopy: pin(to) });
}
fs.writeFileSync('tmp/rust-r3m/root/context-derivation01.json', JSON.stringify({ kind: 'R3-closeout-real-adapter-derivation', original: pin(source), derived: pin(target), fixtures, changes: ['New namespace/ports/current58 inventory', 'Expanded only G1-owned denial/row-barrier table allowlists', 'Each public case/report is a declared derivative with a private original/hash and sensitive-field redaction', 'SQL capture uses current phase since timestamp; raw streams remain private', 'Complete candidate source guard at phase entry and finish'], actualExecutionPerformed: false, previousPrivateRead: false }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ derived: target, fixtures: fixtures.length, actualExecutionPerformed: false }));
