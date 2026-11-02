// Root seals submitted G1 bytes. Independent review remains separate.
import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict'; import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'../..'),formal='docs/design/rust-r3hijk',tmp='tmp/rust-r3hijk';
const read=p=>fs.readFileSync(path.join(root,p)),json=p=>JSON.parse(read(p));
const pin=p=>{const b=read(p);return{file:p,bytes:b.length,rawBytesSha256:createHash('sha256').update(b).digest('hex')}};
const walk=p=>fs.readdirSync(path.join(root,p),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p+'/'+e.name):[p+'/'+e.name]).sort();
const write=(p,v)=>fs.writeFileSync(path.join(root,p),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const previous=formal+'/g1-input-manifest01.json';for(const p of json(previous).entries)assert.deepEqual(pin(p.file),p);
const d=json(formal+'/native-decisions01.json');
d.kind='R3HIJK-original-Native-G1-decisions02';d.supersedes=pin(formal+'/native-decisions01.json');
d.correctedToolNoise.SQL='Old authority01 marked27 and authority02 marked29 RETURNING-row_version occurrences as WHERE CAS. authority03 limits predicates to real WHERE before RETURNING; original sources remain unchanged.';
d.H.push('Actual single-eligible link conversion flush order: copy audit_log INSERT → attachment_link INSERT → project INSERT → auth_session UPDATE → lead CAS UPDATE → snapshot INSERT → COMMIT. Deny copy audit rolls back before project/link flush; independent counter already incremented.');
d.H.push('Actual two-eligible link conversion order: first attachment_link INSERT → project INSERT → auth_session UPDATE → lead CAS UPDATE → copy audit_log INSERT → second attachment_link INSERT → snapshot INSERT → COMMIT. Preserve query-induced autoflush scheduling, not a generic all-links-at-end transaction.');
write(formal+'/native-decisions02.json',d);
for(const p of walk(tmp+'/c-review')){const target=formal+'/originals/c-review/'+p.split('/').at(-1);if(fs.existsSync(path.join(root,target)))assert(read(p).equals(read(target)));else fs.copyFileSync(path.join(root,p),path.join(root,target));}
const baseline='docs/design/rust-r3hijk-next28-baseline.md';let text=read(baseline).toString('utf8');
text=text.replaceAll('rust-r3hijk/g1-input-manifest01.json','rust-r3hijk/g1-input-manifest02.json').replaceAll('rust-r3hijk/native-decisions01.json','rust-r3hijk/native-decisions02.json');
text=text.replace('Pending。只有C对本包','本包提交时为Pending；签署后的当前Gate以独立C原件、线上冻结回执和交付状态为准，不改写本包原字节。只有C对本包');
fs.writeFileSync(path.join(root,baseline),text);
const entries=[...walk(formal),baseline,'docs/design/rust-r3hijk-scope-and-dependencies.md',...walk('tools/rust-r3hijk'),'tools/rust-r3ab/inventory.mjs'].filter(p=>!p.endsWith('/g1-input-manifest02.json')).map(pin);
write(formal+'/g1-input-manifest02.json',{kind:'R3HIJK-joint-G1-input-manifest02',base:d.base,previousManifest:pin(previous),entries,scopedChildren:[93,94,95,96],actualNativeCaseGroups:54,actualNativeHTTP:193,sourceAdmission:{native:1373,rustBase:206},activeDecisions:pin(formal+'/native-decisions02.json'),G1Certified:false,G3Certified:false,G4Certified:false,notGateSignature:true});
console.log(JSON.stringify({entries:entries.length,activeManifest:pin(formal+'/g1-input-manifest02.json'),G1Certified:false}));
