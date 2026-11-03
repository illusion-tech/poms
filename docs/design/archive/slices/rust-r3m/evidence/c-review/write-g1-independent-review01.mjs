// Independent C: static input/contract/source review; never imports author cases or Root executors.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const F='docs/design/rust-r3m',C='tmp/rust-r3m/c-review';
const base='5041275d7ad82af4becbb4462e7213ffe465bc7a';
const hash=b=>createHash('sha256').update(b).digest('hex');
const raw=f=>fs.readFileSync(f),J=f=>JSON.parse(raw(f));
const pin=f=>{const b=raw(f);return{file:f,bytes:b.length,rawBytesSha256:hash(b)};};
const normalize=p=>({file:p.file||p.path,bytes:p.bytes,rawBytesSha256:p.rawBytesSha256||p.sha256});
const verify=(p,f=p.file||p.path)=>{const q=pin(f),n=normalize(p);assert.equal(q.bytes,n.bytes,f);assert.equal(q.rawBytesSha256,n.rawBytesSha256,f);return q;};
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:16000000,windowsHide:true}).trim();
assert.equal(git('rev-parse','HEAD'),base);assert.equal(git('branch','--show-current'),'codex/poms-r3-closeout');
const manifestFile=F+'/g1-input-manifest01.json';
verify({file:manifestFile,bytes:359370,rawBytesSha256:'7c41d08b0021ba0c7937948bd61ef990f4b4a7cac7bf4276d736a363a69b749e'});
const m=J(manifestFile);assert.equal(m.base,base);assert.equal(m.batchIssue,97);assert.deepEqual(m.childIssues,[98,99,100]);assert.equal(m.stageIssue,85);assert.equal(m.overallIssue,57);
assert(!m.G1Certified&&!m.G3Certified&&!m.G4Certified&&!m.stageIntegrationComplete);
const dimensions={protectedFiles:1373,rustFiles:239,controls:11,originals:75,E1Inputs:5};
const inputPins=[];let inputBytes=0;
for(const [group,count]of Object.entries(dimensions)){
  assert.equal(m[group].length,count);assert.equal(new Set(m[group].map(p=>p.file)).size,count);
  for(const p of m[group]){verify(p);inputPins.push({group,...normalize(p)});inputBytes+=p.bytes;
    if(p.logicalOriginal)assert(raw(p.file).equals(raw(p.logicalOriginal)),p.logicalOriginal);
    if(p.canonical){verify(p.canonical);assert(raw(p.file).equals(raw(p.canonical.file)));}
  }
}
assert.equal(inputPins.length,1703);
const original=logical=>{const p=m.originals.find(p=>p.logicalOriginal===logical);assert(p,logical);return p.file;};
const aFile=original('tmp/rust-r3m/input-a/g1-input01.json'),a=J(aFile);
const aPinsFile=original('tmp/rust-r3m/input-a/input-pins01.json'),aPins=J(aPinsFile);
const aCasesFile=original('tmp/rust-r3m/input-a/lead-stage-cases01.mjs'),aCases=fs.readFileSync(aCasesFile,'utf8');
const bFile=original('tmp/rust-r3m/input-b/g1-input01.json'),b=J(bFile);
const bMD=original('tmp/rust-r3m/input-b/g1-input01.md');assert(bMD.endsWith('.md.bin'));
const dFile=original('tmp/rust-r3m/input-d/g1-input01.json'),d=J(dFile);
for(const arr of [aPins.sources,aPins.additionalInputs,aPins.evidence,b.evidenceFingerprints])for(const p of arr)verify(p);
assert.equal(aPins.sources.length,38);assert.equal(aPins.additionalInputs.length,28);assert.equal(aPins.evidence.length,7);
assert.equal(b.sourceFingerprints.length,88);assert.equal(b.evidenceFingerprints.length,24);

const suppFiles=[1,2,3].map(n=>F+'/g1-root-supplement0'+n+'.json');const supplements=suppFiles.map(J);
assert.deepEqual(supplements[0].manifest,pin(manifestFile));assert.equal(supplements[0].equation,'14 + 38 + Root 6 = 58');
verify(supplements[1].retainsSupplement01);assert.equal(supplements[1].entries.length,3);
const historicalMetadata=[];
for(const p of b.sourceFingerprints){
  const s=supplements[1].entries.find(s=>s.originalAuditSource.path===p.path);
  if(s){assert.deepEqual(s.originalAuditSource,p);assert.equal(s.verifiedOriginalGitCommit,base);
    const old=execFileSync('git',['show',base+':'+p.path],{maxBuffer:16000000,windowsHide:true});
    assert.equal(old.length,p.bytes);assert.equal(hash(old),p.sha256);verify(s.currentAuthority);
    historicalMetadata.push({originalAuditPin:normalize(p),immutableSourceCommit:base,currentAuthority:s.currentAuthority,oldEqualsCurrent:false});
  }else verify(p);
}
assert.equal(historicalMetadata.length,3);
const baselineFile='docs/design/rust-r3-closeout-baseline.md',baseline=fs.readFileSync(baselineFile,'utf8');
const dOldBaseline=d.formalInputs.find(p=>p.file===baselineFile);assert(dOldBaseline);
const inverse=baseline.replaceAll('project_technical_cost','project_costs').replaceAll('project_bid_commercial','project_bids').replaceAll('project_pricing_margin','project_pricing');
assert.equal(Buffer.byteLength(inverse),dOldBaseline.bytes);assert.equal(hash(Buffer.from(inverse)),dOldBaseline.rawBytesSha256);
for(const p of d.formalInputs)if(p.file!==baselineFile)verify(p);
assert.equal(d.formalInputs.length,39);assert.equal(pin(baselineFile).bytes-dOldBaseline.bytes,26);
assert.deepEqual(m.authorInputReconciliation[0].originalPin,dOldBaseline);assert.deepEqual(m.authorInputReconciliation[0].authoritativeCurrentPin,pin(baselineFile));

const invFile='docs/design/rust-r3-operation-slices.json',inv=J(invFile);assert.equal(inv.operations.length,58);
assert.equal(new Set(inv.operations.map(x=>x.operationId)).size,58);assert(inv.operations.every(x=>x.rustDelivered&&x.G4Certified&&x.canonical.status==='aligned'));
const aRows=inv.operations.filter(x=>x.issue===93),rootRows=inv.operations.filter(x=>x.issue===87);
const aIds=new Set(aRows.map(x=>x.operationId)),rootIds=new Set(rootRows.map(x=>x.operationId));
const bRows=inv.operations.filter(x=>!aIds.has(x.operationId)&&!rootIds.has(x.operationId));
assert.equal(aRows.length,14);assert.equal(bRows.length,38);assert.equal(rootRows.length,6);
assert.deepEqual([...a.operationIds].sort(),[...aIds].sort());assert.equal(a.matrix.length,12);assert.equal(a.stagePlan.length,12);assert.equal(b.acceptanceMatrix.length,32);
assert.equal(d.routeRows.length,58);
for(const r of d.routeRows){const p=inv.operations.find(x=>x.operationId===r.operationId);assert(p);assert.equal(p.method,r.method);assert.equal(p.path,r.path);assert.deepEqual(p.permissions,r.permissions);assert.equal(p.issue,r.issue);assert(r.freshSuccessfulReceiptRequired&&r.freshGuardRequired);}
const pathShape=p=>p.replace(/\{[^}]+\}/g,'{}');
const badB=[];
for(const c of b.acceptanceMatrix)for(const req of c.requests||[])if(req.path){
  const found=inv.operations.find(r=>r.method===req.method&&pathShape(r.path)===pathShape(req.path));if(!found)badB.push({caseId:c.id,request:req});
}
assert.equal(badB.length,1);assert.equal(badB[0].caseId,'B-UI-DATE');assert.equal(badB[0].request.path,'/api/leads/{leadId}:convert');
const conversion=inv.operations.find(x=>x.operationId==='LeadController_convertToProject');
const supp3Text=fs.readFileSync(suppFiles[2],'utf8');assert(supp3Text.includes(conversion.path));assert(supp3Text.includes(conversion.operationId));assert(supp3Text.includes('POST'));
const aRequestPatterns=[...aCases.matchAll(/request\('([^']+)', '([^']+)', (`[^`]+`|'[^']+')/g)].map(x=>({operationId:x[1],method:x[2],pattern:x[3]}));
assert(aRequestPatterns.length>=12);
for(const r of aRequestPatterns){const p=inv.operations.find(p=>p.operationId===r.operationId);assert(p,r.operationId);assert.equal(p.method,r.method);const shape=r.pattern.slice(1,-1).replace(/\$\{[^}]+\}/g,'{}');assert.equal(shape,pathShape(p.path));}
assert(!/^\s*import\s/m.test(aCases));assert(!/\b(?:fetch|execFileSync|spawnSync|readFileSync|writeFileSync)\s*\(/.test(aCases));
const dCases=d.caseDefinitions.flatMap(p=>{verify(p);return J(original(p.file)).cases;});assert.equal(dCases.length,18);assert.equal(new Set(dCases.map(c=>c.id)).size,18);

const currentDelta=git('diff','--name-only',base,'--','apps','libs','tools/rust-r3hijk/openapi.json');assert.equal(currentDelta,'');
const protectedSet=new Set(m.protectedFiles.map(p=>p.file));
assert.deepEqual(m.protectedAllowedG2Deltas,['apps/poms-admin/src/app/features/lead/lead-list.ts','apps/poms-admin/src/app/features/lead/lead-list.spec.ts']);assert(m.protectedAllowedG2Deltas.every(f=>protectedSet.has(f)));
assert.equal(m.protectedFiles.filter(p=>p.file.startsWith('libs/shared/api-client/')).length,579);
assert.equal(m.protectedFiles.filter(p=>p.file.startsWith('apps/poms-api/src/migrations/')&&p.file.endsWith('.ts')).length,92);
const spec=J('libs/shared/api-spec/openapi.json'),http=new Set(['get','post','put','patch','delete','head','options','trace']);
const surface=o=>({paths:Object.keys(o.paths).length,operations:Object.values(o.paths).reduce((n,p)=>n+Object.keys(p).filter(k=>http.has(k)).length,0),schemas:Object.keys(o.components.schemas).length});
assert.deepEqual(surface(spec),{paths:237,operations:291,schemas:585});
const priorSliceOutput='tools/rust-r3hijk/openapi.json';assert.deepEqual(surface(J(priorSliceOutput)),{paths:22,operations:28,schemas:585});
const oldProduct=J('docs/design/archive/slices/rust-r3hijk/g3-input-manifest03.json').productInputs.find(p=>p.file===priorSliceOutput);verify(oldProduct);
const priorRustOutput='docs/design/archive/slices/rust-r3hijk/evidence/final-integrity04/rust-openapi-original.json';assert.deepEqual(surface(J(priorRustOutput)),{paths:138,operations:173,schemas:585});
const priorIntegrityFile='docs/design/archive/slices/rust-r3hijk/evidence/final-integrity04/report01.json';assert(J(priorIntegrityFile).allChecksPassed);
const protectedGroups={admin:m.protectedFiles.filter(p=>p.file.startsWith('apps/poms-admin/')).length,nest:m.protectedFiles.filter(p=>p.file.startsWith('apps/poms-api/')).length,client:579,APIContracts:m.protectedFiles.filter(p=>p.file.startsWith('libs/api/contracts/')).length};
assert.deepEqual(protectedGroups,{admin:335,nest:420,client:579,APIContracts:26});
const decision=a.legacyBusinessDecision;assert(decision.decisionQuote.includes('审批事务内先补算系统评分并留快照'));assert(decision.decisionQuote.includes('任一必要写入失败整体回滚'));assert.equal(decision.G2AuthorizedByThisInput,false);
assert(a.findings.some(x=>x.id==='A-P2-01'));for(const id of ['P2-B01','P2-B02','P2-B03','P2-B04'])assert(b.knownFindings.some(x=>x.id===id));
const score=fs.readFileSync('apps/poms-api-rust/src/leads/service.rs','utf8');assert(score.includes('let facts = store::collect_facts(connection, lead.id).await?;'));assert(score.includes('system_score: lead.score'));
const cs=fs.readFileSync('apps/poms-api-rust/src/customers/store.rs','utf8'),cc=fs.readFileSync('apps/poms-api-rust/src/customer_contacts/store.rs','utf8');assert(cs.includes('customer managed version conflict'));assert(cc.includes('customer-contact managed version conflict'));
const customer=fs.readFileSync('apps/poms-api-rust/src/customers/service.rs','utf8');assert(customer.includes('customer.updated_by = Some(operator.id.to_string())'));assert(customer.includes('.and_then(|id| self.orgs.get(id))'));
assert(fs.readFileSync('apps/poms-admin/src/app/features/lead/lead-list.ts','utf8').includes('plannedSignAt: form.plannedSignAt ? this.toIsoDate(form.plannedSignAt) : null'));
assert.equal(d.ignored.length,54);assert.equal(d.ignored.filter(x=>x.class==='controlled-DB-PG15-opt-in').length,53);assert.equal(d.ignored.filter(x=>x.class==='explicit-child-fixture-invoked-by-parent').length,1);
for(const x of d.ignored){const source=fs.readFileSync(x.file,'utf8');assert.equal(source.split(/\r?\n/)[x.line-1].trim(),x.reason);assert(source.includes(x.test));}

const E=d.E1;assert(E.priorApprovalNotInherited);assert.equal(E.aliasCount,5);assert.equal(E.totalBytes,419264);assert.equal(E.directConsumerCount,23);assert.equal(E.consumers.length,23);assert.equal(E.originalDeadline,'2026-11-09');assert.equal(E.deadlineExtension,false);assert.equal(E.exitBefore,'Current-batch-G3');
for(const p of m.E1Inputs){verify(p);verify(p.canonical);assert(raw(p.file).equals(raw(p.canonical.file)));const s=fs.lstatSync(p.file);assert(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1);}
for(const c of E.consumers)verify(c.source);
const aliases=m.E1Inputs.map(p=>p.file);const args=['-l','-F',...aliases.flatMap(p=>['-e',p]),'tools','--glob','*.mjs','--glob','*.js','--glob','*.cjs'];
const direct=execFileSync('rg',args,{encoding:'utf8',windowsHide:true}).trim().split(/\r?\n/).map(p=>p.replaceAll('\\','/'));
const literalConsumers=[...new Set([...direct,'tmp/rust-r3hijk/foundation-business-regression01.mjs'])].sort();
assert.deepEqual(literalConsumers,E.consumers.map(x=>x.source.file).sort());assert.equal(literalConsumers.length,23);

const registeredFile=original('tmp/rust-r3m/root/g0-issue-registration.json'),registration=J(registeredFile);assert.equal(registration.batch.number,97);assert.deepEqual(registration.children.map(x=>x.number),[98,99,100]);
const graphFile=original('tmp/rust-r3m/root/g0-online01/24-after-stdout-original.json'),graph=J(graphFile).data.repository;assert.equal(graph.p85.state,'OPEN');assert.equal(graph.p57.state,'OPEN');assert.equal(graph.batch.state,'OPEN');
assert.deepEqual(graph.batch.subIssues.nodes.map(x=>x.number),[98,99,100]);assert(graph.batch.subIssues.nodes.every(x=>x.state==='OPEN'));assert(graph.p85.subIssues.nodes.some(x=>x.number===97));
for(let n=86;n<=96;n++)assert(graph.p85.subIssues.nodes.some(x=>x.number===n&&x.state==='CLOSED'));
const statusFile='docs/design/rust-r3-closeout-status.json',status=J(statusFile);assert(!status.G1Certified&&!status.G3Certified&&!status.G4Certified&&!status.stageIntegrationComplete);assert(status.parent85Open&&status.overall57Open);
const sensitive=new Set(['password','password_hash','token_hash','csrf_token_hash','tokenHash','csrfTokenHash','accessToken','refreshToken','clientSecret']);let jsonScanned=0;const privacy=[];
function scan(v,f,path='$'){if(Array.isArray(v)){v.forEach((x,i)=>scan(x,f,path+'['+i+']'));return;}if(!v||typeof v!=='object')return;for(const[k,x]of Object.entries(v)){if(sensitive.has(k)&&typeof x==='string'&&x.trim()&&!/redact|\*\*\*/i.test(x))privacy.push({file:f,path:path+'.'+k});scan(x,f,path+'.'+k);}}
for(const p of m.originals.filter(p=>p.file.endsWith('.json'))){scan(J(p.file),p.file);jsonScanned++;}assert.deepEqual(privacy,[]);

const mdFile=C+'/g1-independent-review01.md';
const md=`# RUST-R3-CO 联合 G1 独立审查 01\n\n结论：**Pass**。仅认证输入可实施，不认证产品修复、实际阶段验收、G3/G4或父片完成。\n\n- 基线：\`${base}\`，\`codex/poms-r3-closeout\`。\n- 主输入：\`${manifestFile}\`，359370 B，SHA256 \`7c41d08b0021ba0c7937948bd61ef990f4b4a7cac7bf4276d736a363a69b749e\`。\n- 同时冻结 Root supplement01、02、03；精确 pin 见同名 JSON。\n- 范围：#97 下 #98/#99/#100；既交付 HTTP58 不重复发明。A14、B38、Root 项目基础6互斥覆盖58；A/B均无 projects/ 修改授权。\n\n1703个直接pin全部匹配，75份复制原件与logicalOriginal逐字节相同。239是当前Rust工程文件数；1373为混合保护集合，G2只允许声明的两UI文件改变。原完整公开面、client579和migration92保持。B未格式化的sealed prose按原字节保存在.md.bin；机器JSON和Root基线为可读正式输入，不将原件冒称格式检查通过。\n\n四类输入澄清已完成：D旧baseline的26B目录纠正；B旧治理三pin精确绑定base并由当前Root authority取代；B的20项表述不增加A源码授权；B-UI-DATE错误的:convert例子由supplement03固定为既有LeadController_convertToProject/:convertToProject，不增加别名。原件均保留。未关闭G1输入阻断P0/P1/P2为0。\n\n六项产品修复仍是G2必交内容：A系统评分/解释单tuple；B客户与联系人CAS0→409、客户跨actor同值no-op、组织UUID同身份的即时投影；Root非空plannedSignAt仅两UI文件改为Date.toISOString。它们没有在本审查中修复或运行通过。人工审批正常复用已存匹配系统tuple；用户明确的历史缺匹配快照fallback仅在审批同TX先补系统分/system snapshot，再覆盖审批，任何必要写失败全回滚。GET不回填、不增加I/F/upload自动触发。\n\nA12、B32、D18是纯验收定义，数量不是实跑结果。Root须在统一候选完成58有效入口/guard、同一converted Project完整生产链、真实冲突与必要写失败、四旅程×四轴16格及非空日期、完整保护与终态。Windows浏览器连Linux Rust不认证Windows原生Rust服务。53 DB opt-in与1显式子进程fixture分列，ignored不计通过；未来R4/R5 prepared事实只证明读取。\n\nE1在本批重新具名批准：仅原5个regular alias、419264 B、23直接legacy消费者，Root负责，原2026-11-09不延长且本批G3前退出，二者取更早。仅供退出工作，不新增消费者、镜像、private依赖或未适配历史运行承诺。strict canonical/hash受支持入口须实际代表性重放，删除恰5alias后再成功，并保持归档原字节。\n\nG2仅可在Root对本manifest、三个supplement和本独审完成线上freeze并读回后启动，由Root明确分配独立作者工作树。当前线上freeze尚未认证。其后仍须独立G3、固定提交、main/归档与实际G4；只有全部条件满足才可关闭98/99/100/97/85，总体57保持Open。\n\n审查者只读静态文件/hash/Git；未写产品、Root执行器或治理，未运行作者纯定义、安装、构建、测试、HTTP、PG、browser或旧private。\n`;
const acceptedCorrections=[
  {id:'A-P2-01',owner:'A #98',scope:'System score and explanatory snapshot use one materialized tuple; normal manual/revoke reuses matching stored tuple; historical missing-match approval fallback follows direct user decision.',status:'Unimplemented, required G2 witness/repair/regression, not a G1-input blocker',sources:['apps/poms-api-rust/src/leads/service.rs:859','apps/poms-api-rust/src/leads/service.rs:1064'],cases:['A-S02','A-S03','A-S04','A-S08','A-S12']},
  ...b.knownFindings.filter(x=>/^P2-B0[1-4]$/.test(x.id)).map(x=>({id:x.id,owner:'B #99',scope:x.target,status:'Unimplemented, required G2 actual witness/repair/regression, not a G1-input blocker',sources:x.source,cases:x.cases})),
  {id:'D-P2-PLANNED-SIGN-AT-01 / B-UI05',owner:'Root',scope:'Exactly lead-list.ts and its spec; nonempty Date.toISOString, preserve datetime DTO and other date-only fields.',status:'Unimplemented, required G2 repair and actual sixteen journey cells including four filled-date conversions',cases:['M4-plannedSignAt-nonempty','B-UI-DATE']}
];assert.equal(acceptedCorrections.length,6);
const review={
  kind:'C-independent-R3-closeout-complete-joint-G1-review01',createdAt:new Date().toISOString(),reviewCompleted:true,
  reviewer:{agent:'/root/r3hijk_review',role:'Sole independent non-author C; no author/executor/governance implementation',configuredTarget:'gpt-6.1-sol/max',Fast:'unverified'},
  verdict:'Pass',G1Certified:true,G2AuthorizedAfterOnlineFreeze:true,G2AuthorizedNow:false,onlineFreezeCertified:false,G3Certified:false,G4Certified:false,implementationAccepted:false,stageIntegrationComplete:false,
  activeManifest:pin(manifestFile),supplementInputs:suppFiles.map(pin),base,branch:'codex/poms-r3-closeout',batchIssue:97,scopeIssues:[98,99,100],stageIssue:85,overallIssue:57,
  inputFindingCounts:{P0:0,P1:0,P2:0},findingCountsMeaning:'G1 input usability/scope/authority blockers only; the six named product correction targets below remain open G2 work.',unresolvedG1InputBlockers:[],
  acceptedG2CorrectionTargets:acceptedCorrections,productCorrectionsAlreadyFixed:false,
  inputIntegrity:{
    directPinCounts:dimensions,directPinsVerified:inputPins.length,directPinnedBytes:inputBytes,allDirectPinsExact:true,sortedGroupPinArraySha256:hash(JSON.stringify(inputPins)),
    all75OriginalCopiesEqualLogicalSourceBytes:true,allOriginalsRetained:true,
    AInternalPins:{source:38,additional:28,evidence:7,all73CurrentRawExact:true},
    BInternalPins:{source:88,evidence:24,currentRawExact:109,threeHistoricalBasePinsExact:true,historicalGovernanceSources:historicalMetadata},
    DInternalPins:{formal:39,currentRawExact:38,oneOldBaselinePinReconciled:true},
    all224AuthorSourceFormalEvidencePinsResolvedWithoutClaimingFourOldPinsEqualCurrent:true,
    BImmutableProse:{formal:pin(bMD),logicalOriginal:'tmp/rust-r3m/input-b/g1-input01.md',unformattedOriginalPreserved:true,representedAsFormatted:false,semanticAuthority:'Sealed B machine JSON plus Root joint baseline and supplements.',noProductSourceOrActiveMarkdownFormattingWaiver:true},
    currentProductChangesBeforeG1:[],all239RustEngineeringAnd1373ProtectedPinsExact:true,noEarlyProductG2Observed:true,
    protectedMixedCounts:protectedGroups,onlyAllowedProtectedG2Changes:m.protectedAllowedG2Deltas,
    nativeOpenAPI:{file:pin('libs/shared/api-spec/openapi.json'),...surface(spec)},
    priorRustOpenAPI:{file:pin(priorRustOutput),...surface(J(priorRustOutput)),classification:'Exact unchanged historical current-source output; fresh final candidate runtime comparison required in M5.'},
    historicalRuntimeIntegrity:pin(priorIntegrityFile),priorHIJKSchemaInput:{file:pin(priorSliceOutput),paths:22,operations:28,schemas:585,notTheFullRuntimeSurface:true},
    declaredRustEngineeringCount239OverridesApproximate235Prose:true,client579AndOriginal92MigrationsPinned:true
  },
  resolvedInputClarifications:[
    {id:'C-G1-D-BASELINE-PIN-01',authority:pin(manifestFile),old:dOldBaseline,current:pin(baselineFile),exact26ByteInverseVerified:true,noBusinessScopeDelta:true},
    {id:'C-G1-B-OWNERSHIP-01',authority:pin(suppFiles[0]),sealedBSource:pin(bFile),interpretation:'A leads14 + B38 + Root project-basic6; no A/B projects product authorization; discovered new project gap requires checkpoint.'},
    {id:'C-G1-B-HISTORICAL-METADATA-01',authority:pin(suppFiles[1]),allThreeOldPinsExactAtBase:true,currentRootPinsVerified:true,sealedBRetained:true},
    {id:'C-G1-B-CONVERT-PATH-01',authority:pin(suppFiles[2]),caseId:'B-UI-DATE',originalPath:'/api/leads/{leadId}:convert',authoritativeOperationId:conversion.operationId,method:conversion.method,canonicalPath:conversion.path,placeholder:'leadId maps to id',noNewRouteAlias:true}
  ],
  ownershipAndPublicSurface:{
    existingDeliveredHTTP:58,newPublicOperations:0,newDTO:0,newDDL:0,newPermission:0,newGeneratedClient:0,
    scopeEquation:'14 + 38 + Root 6 = 58',AOperationIds:aRows.map(x=>x.operationId),BOperationIds:bRows.map(x=>x.operationId),RootProjectOperationIds:rootRows.map(x=>x.operationId),
    AProduct:'leads/ non-http only',BProduct:b.scope.futureG2ExclusiveDirectories,Root:'All shared HTTP/lib/Cargo/bridges/UI exact delta/governance/execution; projects6 valid actual stage receipts without project product edits.',
    D:'Input/ignored delivery audit and tools/rust-r3m/e1-* canonical/hash supported replay; actual environment execution remains Root-only.',
    approval:'R3 existing direct Lead score override lifecycle; R4 contract/contract-review; R5 commission payout/adjustment; no invented generic R3 handler or scheduler.',
    R2Shared:'Review only actual R3 consumption; future producer completion is not an R3 circular prerequisite.',
    preparedFutureFacts:'Only declared lawful readonly projections, independently visible committed fixtures and owned cleanup; no R4/R5 producer/approval certification.'
  },
  businessContractReview:{
    sourceAuthorities:['EX54 §5.1 semantic dedup tuple and §5.2 explanatory history','EX54 §6 manual override lifecycle','EX55A-R §5 single breakdown, existing explicit triggers and old readonly snapshots','Root current joint baseline business correctness policy','Direct human historical fallback decision relayed by Root and frozen in A input'],
    systemScore:'Each real explicit system trigger materializes one score/rating/formula/reason/breakdown/gates tuple and persists a coherent Lead/system snapshot; semantic tuple dedup remains.',
    manualScore:'Normal approve/revoke retains a genuinely matching stored system tuple and real manual effective/source/actor metadata; no reread of new facts falsely presented as old explanation.',
    historicalFallback:{source:pin(aFile),decision:decision.decisionQuote,onlyMissingMatchingSystemTuple:true,approvalTransaction:'First recompute system score from one current materialized tuple and store system snapshot, then override approval/manual snapshot/registered audit. Every necessary write shares one owning TX.',wholeGraphRollbackAndSuccessfulRecoveryRequired:true,noGETBackfillOrAutomaticI_F_UploadRefresh:true,noBulkHistoricalRewriteAuthorized:true},
    requiredWrites:'Business states/dependents/snapshots/registered audits are atomic; independent number reservation gaps and independent session touches explicitly separate. Do not invent lead.created/I.created/snapshot-created audits absent the registered runtime contract.',
    CAS:'Only actual CAS0 conflicts409; genuine SQL errors500 plus rollback. Preserve legal two201 version creation and two201 first-comment contracts; no new expectedVersion DTO.',
    identity:'Parsed UUID identity for internal relation/owner/org comparison without global raw input lowercasing or widening eligibility.',
    noOpAndQueries:'Business-equal updates including other actor leave versions/time/actor/snapshots/audits unchanged; GET never repairs history.',
    moneyAndDates:'Exact Decimal: money2, quantity/unitPrice4, signed rates8 with existing numeric limits; date remains date, plannedSignAt remains ISO datetime. No new multiplication or 0..1 rule.',
    noHardGateRelaxation:'Manual high scores never fill missing conversion/qualification business facts.'
  },
  matrixReview:{
    ADefinitions:12,BDefinitions:32,DDefinitions:18,definitionsAreUnexecuted:true,countsNotAcceptanceResults:true,all58DMethodPathOperationIssuePermissionRowsMatchCanonicalCurrentInventory:true,
    allARequestOperationMethodPathsMatchCurrentInventory:true,BSevenOtherStructuredRequestsMatchCurrentInventory:true,BOneWrongConversionExampleExplicitlySuperseded:true,
    M0:'Fresh final candidate valid receipts for all58; complete envelopes/contracts/real nonempty facts; each route missing-session/permission and every mutating CSRF; shared dispatch classes by real path and zero business deltas.',
    M1M2:'One actual Customer/Contact/Lead/I/F/upload/score/override/qualify/convert graph; consume that exact returned Project in cost/bid/pricing versions, real Todo/J/K and workspaces. No stitching unrelated old projects.',
    M3:'Fresh controlled A single-materialization interleaving; each affected explicit scoring trigger; normal manual after unrefreshed real facts; prepared legacy fallback and every necessary write failure; real Customer/Contact/Lead/override/I CAS; F same-source and target empty stream; C/D/G current/children/Decimal boundaries.',
    actualWaiterEvidence:'Observe actual fresh lock wait state/identity; no sleep-only claims. Distinct sessions/actors, before/after exact graph, legitimate winner normalization and recovery/cleanup.',
    UI:{journeys:d.journeys.map(x=>x.name),journeysCount:4,platformAxes:['Linux browser to Linux Native','Linux browser to Linux Rust','Windows browser to Windows Native','Windows browser to Linux Rust'],actualJourneyCellsRequired:16,allAfterBoundedTwoFileFixAndCurrentBuild:true,nonemptyDateConversions:4,blankNullAndOtherDateRegression:true,selectedLocalCalendarDateNetworkDatetimeProjectGETAndPGMustAgree:true,noMocksDOMInjectionOrFailureFallback:true,WindowsRustNativeServerCertified:false,originalAbsentIEditDeleteAndJSelectorControlsRemainAbsent:true},
    M5:'Strict E1 replay and exact five alias exit; final source/artifact/runtime full spec/client/migration comparison; risk-scaled Rust/frontend validation and required lint, current full owned graph/seed/privilege/log restoration with second-zero cleanup, stop owned runtimes and PG preserve volume/private originals.',
    ignored:{total:54,DBOptIn:53,explicitParentInvokedChild:1,all54CurrentIgnoreAttributeLinesAndTestNamesVerified:true,defaultIgnoredNotPass:true,parentCurrentPassReceiptRequired:true},
    causalReuse:'Only exact hashes plus dependency impact; original candidate/platform/partial/failure labels retained. Historical deep matrices not counted as current execution; touched effects rerun on final candidate.',
    validationResponsibilities:'Root executes required Rust fmt/clippy deny warnings/locked offline tests/release; impacted admin lint/no new unexplained warnings/unit/production build, relevant API regression and static/full runtime integrity, Markdown and diff checks. C executed none of these products/checks.'
  },
  currentG1CommonChecks:{source:'Root direct report during this independent review',docsFormat:'Pass',unstagedDiff:'Pass',stagedDiff:'Pass',CExecuted:false,productStillUnmodified:true,productBuildTestAndEnvironmentAcceptanceStillPendingG2:true},
  E1Approved:true,
  E1:{
    decision:'Fresh named current RUST-R3-CO G1 approval, only for bounded exit work. Prior batch approval not inherited.',approved:true,
    files:m.E1Inputs,regularAliases:5,totalBytes:419264,allFiveRegularNonSymlinkSingleLinkAndCanonicalRawEqual:true,
    actualDirectLiteralLegacyConsumers:23,consumerPaths:literalConsumers,all23OriginalConsumerSourcePinsExact:true,consumerClassificationPreserved:d.E1.consumers.map(x=>({source:x.source,class:x.class,unchangedLegacyCommandReplaySupported:x.unchangedLegacyCommandReplaySupported})),
    owner:'Root /root',originalDeadline:'2026-11-09',deadlineExtended:false,exitBefore:'Current-batch G3 or original2026-11-09, whichever occurs first',
    noNewLegacyConsumerMirrorAliasLargeCopyOrPrivateRead:true,
    supportedExit:'Strict canonical archive identity (logical file,bytes,SHA), immutable snapshots before mapped move; reject conflict/unknown/traversal/absolute/wrong hash/length; never old-active/latest fallback. Actual two manifest/operation projection and four fixture builder modes, deterministic semantic/hash assertions; remove exactly five aliases then rerun successful supported entry and verify canonical/raw historical bytes unchanged.',
    oldHardcodedRuntimeScripts:'Remain immutable historical originals, with explicit support replacement and non-runnable-unchanged limitations; no claim all legacy commands replay.',
    G3BlockedUntilExitActuallyProven:true
  },
  environmentAndPrivacy:{
    onlyNewRootOwnedIsolatedPG15CohortsAndPrivateStateAllowed:true,oldPG17PrivateKeysCohortsUnreadAndUnchanged:true,
    preciseEnvironment:'New poms-r3m PG15.12/volume/databases/role; ports23433->15432,Native13400/13410,Rust13500,UI13600 loopback and pre-bind identity checks. Original92 migration execution owner unchanged.',
    reusableCaches:'Hash-verified public toolchain/library/browser/image/cache only; never auth/secret/private original outputs.',
    publicOriginalJSONFilesScanned:jsonScanned,sensitiveLiteralFindings:0,secretValuesPrinted:false,
    evidence:'Private raw auth/SQL originals protected; public redacted derivatives labelled with original hashes; full/failed/partial/uncertified/stopped kept and canonical archive mappings raw exact.'
  },
  gateDecision:{
    allowedAfterOnlineFreeze:'Root may activate bounded three-author G2 in isolated author worktrees after exact manifest plus supplement01/02/03 and this independent Pass are published/frozen with actual readback. No product execution/acceptance is inferred from this review.',
    futureCloseoutTargets:[98,99,100,97,85],currentCloseoutAllowed:false,overall57MustRemainOpen:true,
    G3FixedMainArchiveAndActualG4RemainSeparate:true,newBusinessScopeOrUnforeseenRealGapRequiresCheckpointAndIndependentReview:true,
    baselinePendingAndAuthorSourceReadyFlagsAreHistoricalInputLabelsNotEvidenceOfPrematureImplementation:true
  },
  noProductRootExecutorOrGovernanceWriting:true,noAuthorDefinitionsOrRootExecutorsImportedOrExecuted:true,noInstallBuildTestDBHTTPBrowserServiceOrWSLExecution:true,noPrivateRead:true,noGitMutationOrGitHubExternalWrite:true,onlyOwnCReviewArtifactsWritten:true,
  ownStaticVerifier:pin(C+'/write-g1-independent-review01.mjs')
};
assert(!fs.existsSync(mdFile));assert(!fs.existsSync(C+'/g1-independent-review01.json'));
fs.writeFileSync(mdFile,md,{flag:'wx'});review.readableCompanion=pin(mdFile);
fs.writeFileSync(C+'/g1-independent-review01.json',JSON.stringify(review,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({JSON:pin(C+'/g1-independent-review01.json'),Markdown:pin(mdFile),verdict:'Pass',G1Certified:true,G2AuthorizedAfterOnlineFreeze:true,E1Approved:true,inputBlockers:0,productCorrectionsUnimplemented:6}));
