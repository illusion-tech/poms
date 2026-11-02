import fs from'node:fs';import assert from'node:assert/strict';import{createHash}from'node:crypto';
assert.equal(process.cwd().replaceAll('\\','/'),'E:/projects/worktrees/poms-r3cdefg-next16/poms');
const out='tmp/rust-r3cdefg/c-review/g3-numeric-parent-identity01.json';assert(!fs.existsSync(out));
const sha=b=>createHash('sha256').update(b).digest('hex'),pin=file=>{const b=fs.readFileSync(file);return{file,bytes:b.length,rawBytesSha256:sha(b)}},read=f=>JSON.parse(fs.readFileSync(f));
const base='docs/design/rust-r3cdefg/evidence/',seed=read('tmp/rust-r3cdefg/c-review/g3-semantic-deep-compare01.json'),maps=[new Map,new Map];
for(const p of seed.identityPairs){maps[0].set(p.native.toLowerCase(),p.logical);maps[1].set(p.rust.toLowerCase(),p.logical)}
let ordinal=0;function bind(a,b){if(a===b)return;const x=maps[0].get(a.toLowerCase()),y=maps[1].get(b.toLowerCase());if(x||y){assert(x&&y&&x===y);return}const k='numeric-producer.'+ordinal++;maps[0].set(a.toLowerCase(),k);maps[1].set(b.toLowerCase(),k)}
const cov=['native','rust'].map(s=>read(base+'actual/'+s+'/coverage1124/report01.json'));
function discover(a,b){if(Array.isArray(a)&&Array.isArray(b)){assert.equal(a.length,b.length);for(let i=0;i<a.length;i++)discover(a[i],b[i]);return}if(a&&b&&typeof a==='object'&&typeof b==='object'){if(typeof a.id==='string'&&typeof b.id==='string')bind(a.id,b.id);for(const k of Object.keys(a))if(Object.hasOwn(b,k))discover(a[k],b[k])}}
for(let i=0;i<1124;i++)discover(cov[0].events[i].response.body,cov[1].events[i].response.body);
const ownedFiles=['parity01-nest','parity04-rust'].map(t=>base+'original/owned-observation-before-terminal-'+t+'.json'),owned=ownedFiles.map(read),of=['native','rust'].map(s=>base+'actual/'+s+'/observer45/exact-numeric-and-side-effects01.json'),obs=of.map(read);
const raw=owned.map(o=>o.rawBusinessRows.find(t=>t.table==='project_technical_cost_item').rawJSONRows.map(r=>JSON.parse(r)));
const values=obs.map(o=>o.exactNumericText.find(t=>t.table==='project_technical_cost_item').rows);
const exactTuple=r=>JSON.stringify(Object.fromEntries(Object.keys(r).filter(k=>k!=='id').sort().map(k=>[k,r[k]])));
const relationships=[];
for(const a of values[0]){
 const ar=raw[0].find(r=>r.id===a.id);assert(ar);const parent=maps[0].get(ar.package_id.toLowerCase());assert(parent,'known actual C producer parent');
 const matches=values[1].flatMap(b=>{const br=raw[1].find(r=>r.id===b.id);assert(br);return maps[1].get(br.package_id.toLowerCase())===parent&&br.sort_order===ar.sort_order?[{b,br}]:[]});
 assert.equal(matches.length,1);const{b,br}=matches[0];assert.equal(exactTuple(a),exactTuple(b));
 relationships.push({logicalParent:parent,native:{itemId:a.id,parentId:ar.package_id,sortOrder:ar.sort_order,numericText:a},rust:{itemId:b.id,parentId:br.package_id,sortOrder:br.sort_order,numericText:b},exactNumericValuesAndParentIdentityMatch:true});
}
assert.equal(relationships.length,8);
const result={kind:'C-independent-current-numeric-item-parent-link-reconciliation',createdAt:new Date().toISOString(),inputs:[...ownedFiles,...of].map(pin),itemRows:8,relationships,limitation:'Raw JSON parsed only to join IDs/sortOrder; every quantity/unitPrice/money value is separately compared using the explicit numeric::text row. This strengthens the earlier anonymous tuple-only observer check without rewriting it.',independentProductExecution:false,G3Certified:false,G4Certified:false};
fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file:pin(out),linkedRows:8}));
