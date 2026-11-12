import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const s=fs.readFileSync(new URL('./Native06.candidate.mjs',import.meta.url),'utf8');
test('H14 original15 registry facts bind the same already-verified original process as B0',()=>{
  const start=s.indexOf('function originalCode15_121('),end=s.indexOf('\n}',start),body=s.slice(start,end);
  const statement=/const facts=(\{parent:parent14,apiRecord:process,[^\n]+\});/.exec(body);assert(statement);
  const originalProcess={kind:'actual-source15-owned-API-process119',historical:true},parent={dataOnly:true};
  const facts=vm.compileFunction('return ('+statement[1]+')',['parent14','process','source','compile','helper','helperComposition'])(parent,originalProcess,[],[],[],{});
  assert.equal(facts.apiRecord,originalProcess);assert.equal(facts.parent,parent);
  assert(body.indexOf('const process=json121(p.consumer.apiProcess)')<body.indexOf(statement[0]));
  assert(body.includes('bootstrapBody15(bootstrapPlan,b0.candidateInput,b0.bootstrapOnlyG2,process)'));
  assert(body.includes('registryBody15(p,base.approvedCodePlan15,facts)'));
  assert(body.includes('admittedBody15(p,base.codeAdmission15,b0)'));
  assert(body.includes('return {plan:p,registry:reg,candidate:b1,process,source,compile,helper}'));
});
