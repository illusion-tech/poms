import pathlib,json,hashlib,re,datetime
ROOT=pathlib.Path('E:/projects/worktrees/poms-r3hijk-next28/poms');BASE=ROOT/'tools/rust-r4ghi/independent/review05/shared-source-followup58';OUT=BASE/'edition12-82';OLD=BASE/'edition12-81';sha=lambda b:hashlib.sha256(b).hexdigest()
assert not (OUT/'manifest82.json').exists();oldbytes=(OLD/'manifest81.json').read_bytes();assert sha(oldbytes)=='7982f478f7bf30cd66006981e2f5b1d5d0a15a9b89abd34b2e7af89e77e8dcbd';old=json.loads(oldbytes)
sourcepath=OUT/'candidate/tools/rust-r4ghi/business/required-write-sources58.json';source=json.loads(sourcepath.read_bytes());assert len(source['productSources'])==406 and len(source['helperSources'])==155
for p in source['productSources']:assert sha((ROOT/p['file']).read_bytes())==p['sha256'],p['file']
for p in source['helperSources']:
 q=OUT/'candidate'/p['file']
 if not q.exists():q=ROOT/p['file']
 assert sha(q.read_bytes())==p['sha256'],p['file']
helpers=[{'file':q.relative_to(ROOT).as_posix(),'sha256':sha(q.read_bytes())} for q in sorted((ROOT/'tools/rust-r4ghi/business').iterdir()) if q.is_file() and q.suffix in ['.json','.mjs']];assert len(helpers)==152
for f in old['effectiveFiles']:assert sha((ROOT/f['file']).read_bytes())==f['afterSHA256'],f['file']
files=[]
for q in sorted((OUT/'candidate').rglob('*')):
 if not q.is_file():continue
 logical=q.relative_to(OUT/'candidate').as_posix();b=OUT/'before'/logical;assert b.read_bytes()==(ROOT/logical).read_bytes();assert (OUT/'sandbox'/logical).read_bytes()==q.read_bytes();files.append({'file':logical,'beforeSHA256':sha(b.read_bytes()),'afterSHA256':sha(q.read_bytes()),'candidate':q.relative_to(OUT).as_posix(),'beforeCandidate':b.relative_to(OUT).as_posix()})
assert len(files)==4
checks={}
for name,count in [('windows-pure82',130),('linux-targeted82',27)]:
 text=(OUT/(name+'.stdout.log')).read_text();assert re.search(r'\btests '+str(count)+r'\b',text) and re.search(r'\bpass '+str(count)+r'\b',text) and re.search(r'\bfail 0\b',text);assert (OUT/(name+'.stderr.log')).stat().st_size==0;checks[name]={'passed':count,'failed':0,'stdoutSHA256':sha((OUT/(name+'.stdout.log')).read_bytes()),'stderrSHA256':sha((OUT/(name+'.stderr.log')).read_bytes())}
syntax=json.loads((OUT/'syntax82.json').read_bytes());assert len(syntax)==3 and all(x['exitCode']==0 for x in syntax)
raw=(OUT/'frozen-allocation-shape82.stdout.log').read_bytes();allocation=json.loads(raw);assert allocation['allExpectedBasisResultSlotFieldsPhysicallyPresent'] and allocation['allThreeLayersExactBalanced'];assert allocation['currentHTTPAcceptance'] is False and allocation['producer']=='API134/source11';assert (OUT/'frozen-allocation-shape82.stderr.log').stat().st_size==0
m={'schemaVersion':1,'kind':'author-support-exact-original-NUMERIC-weight-admission82','at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'applyAfter81':{'file':'../edition12-81/manifest81.json','sha256':sha(oldbytes)},'files':files,
   'sourceEdition':'g2-business12/API135','sourcePinsSHA256':source['sourceInputSHA256'],'productSources':406,'binarySHA256':source['binarySHA256'],'source58SHA256':sha(sourcepath.read_bytes()),'businessHelperCount':152,'helperSourcesExcludingSelfIncludingOutside':155,'currentRootHelperPinsBefore82':helpers,
   'scope':'Read exact original PG NUMERIC lexemes at both2/1 admission predicates; no numeric round trip, producer/body/amount/FI/race/immutability change.',
   'failedReadOnlyPreparation':{'file':'/home/wangzishi/.local/share/poms-r4ghi/private/business/g2-business12/main01/005514-shared-stage-race81-01-partial.json','rawBytesSha256':'e1d8d970db761edd49edd02b976bc414d8580940639b0f1ac6e7b45a85619920','preserved':True,'governedCorrectionPOSTNotReached':True},
   'tests':{'Node':'24.19.0',**checks,'syntaxChangedFiles':3,'syntaxAllExit0':True,'syntaxSHA256':sha((OUT/'syntax82.json').read_bytes()),'actualFrozenAllocationShape':{'stdoutSHA256':sha(raw),'stderrSHA256':sha((OUT/'frozen-allocation-shape82.stderr.log').read_bytes()),'producer':'API134/source11','currentHTTPAcceptance':False,'checks':['all basis/result/slot fields physically exist','exact2/1 NUMERIC lexemes','three net/tax/gross layers BigInt balanced','measurement net matches','ratio6 sums exactly1','actual source version/currency match']}},
   'runtimeNext':'Root exact-promotes fourfiles then new unique shared-stage-race58 phase; do not relabel prior partial. Tax fixture/preparation follows Stage success, with complete actual target review before Tax sweep.',
   'TaxSweepPreauthorizedByThisPatch':False,'README':{'file':'README82.md','sha256':sha((OUT/'README82.md').read_bytes())},'RootToolsOrProductWritten':False,'SQLExecutedByAuthor':False,'HTTPExecutedByAuthor':False,'G3Certified':False,'G4Certified':False}
(OUT/'manifest82.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({'manifest':str(OUT/'manifest82.json'),'sha256':sha((OUT/'manifest82.json').read_bytes()),'deltas':4,'source58SHA256':m['source58SHA256'],'windows':130,'linux':27,'actualAllocationFSShape':True,'RootChanged':False,'SQL':False,'HTTP':False}))
