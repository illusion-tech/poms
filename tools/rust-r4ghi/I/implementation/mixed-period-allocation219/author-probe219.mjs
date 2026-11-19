// Only fixed217/216 FS data. No live state, API, process, DB connection or SQL.
import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{fileURLToPath}from'node:url';import{sha219,rows219,currentBatch219}from'./facts219.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url)),linux='/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business13/main01/tool119-inputs217/fixed-inputs217.json';
const local=f=>process.platform!=='win32'?f:f.startsWith('/mnt/e/')?'E:/'+f.slice(7):'//wsl.localhost/Debian'+f;
const read=pin=>{const b=fs.readFileSync(local(pin.file));assert.equal(sha219(b),pin.rawBytesSha256);return JSON.parse(b);};
const original=fs.readFileSync(local(linux)),fixed=JSON.parse(original);assert.equal(fixed.kind,'actual-fixed-source13-inputs-for-future-reviewed-tool119-217');
const state=read(fixed.entryState),snapshot=read(fixed.beforeSnapshot);assert.equal(state.epoch,'g2-business13');assert.equal(snapshot.epoch,state.epoch);assert.equal(snapshot.marker,state.marker);
const readRows=meta=>{const b=fs.readFileSync(local(meta.file));assert.equal(sha219(b),meta.rawBytesSha256);return b.toString().split('\n').filter(Boolean).map(s=>{const r=JSON.parse(s);assert.equal(sha219(r.raw),r.sha256);return r;});};
const ctx={database:'poms_r4ghi_rust',state},rows=rows219(ctx,snapshot,readRows),basis=state.fixtures.sharedSourceFollowup58.tax.allocation.basisId;
const batch=currentBatch219(rows,basis),result={kind:'author-fixed217-216-only-allocation219-case-feasibility',fixedInputs:{file:linux,rawBytesSha256:sha219(original)},entryState:fixed.entryState,beforeSnapshot:fixed.beforeSnapshot,
  historicalActualTaxBatch:{sourceCount:batch.slots.length,projectCount:batch.results.length,wholeOriginalWeightsTwoToOne:true,currencyCNY:true,measurementExcludingTax:true,threeLayersKnownAndEvenCents:true,wholeSourceNetTaxGrossRelationshipConserved:true},
  futureCurrentBasisRefsOrTaxSuccessOrPeriodSuccessInvented:false,periodPositiveOrMixedAcceptanceCertified:false,sourceEpoch:'g2-business13',SQLOrHTTPExecuted:false,liveStateReadOrWritten:false,RootApplied:false,G3Certified:false,G4Certified:false};
const raw=JSON.stringify(result,null,2)+'\n',file=dir+'/fixed-case219.json';fs.writeFileSync(file,raw,{flag:'wx'});console.log(JSON.stringify({artifact:{file,rawBytesSha256:sha219(raw)},fixedCaseMatchesBoundedWitness:true,actualEffectsExecuted:false,liveStateReadOrWritten:false}));
