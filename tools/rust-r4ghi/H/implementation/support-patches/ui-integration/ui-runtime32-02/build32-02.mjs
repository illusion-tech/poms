// Append-only correction to sealed32; no Root writes.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import{createHash}from'node:crypto';import{fileURLToPath}from'node:url';
const o=path.dirname(fileURLToPath(import.meta.url)),source=path.resolve(o,'../ui-runtime32'),file='tools/rust-r4ghi/H/implementation/support-patches/ui-integration/runtime14/browser-cases14.mjs',sha=b=>createHash('sha256').update(b).digest('hex');
const before=fs.readFileSync(`${source}/proposed/${file}`);let text=before.toString();
const old='page.setDefaultTimeout(90_000); const fontBoundary32 = observeFontBoundary32(page);';assert.equal(text.split(old).length-1,1);text=text.replace(old,'page.setDefaultTimeout(90_000);');
const page='  const page = await context.newPage(), requests = [], pageErrors = [], consoleErrors = [], blockedOrigins = [];';assert.equal(text.split(page).length-1,1);text=text.replace(page,page+'\n  const fontBoundary32 = observeFontBoundary32(page);');
const target=`${o}/proposed/${file}`;fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,text,{flag:'wx'});
const products=[{file,beforeSHA256:sha(before),afterSHA256:sha(Buffer.from(text)),candidate:`proposed/${file}`}];fs.writeFileSync(`${o}/products32-02.json`,JSON.stringify(products,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({kind:'append32-02-scope-only',products:1,RootWritten:false}));
