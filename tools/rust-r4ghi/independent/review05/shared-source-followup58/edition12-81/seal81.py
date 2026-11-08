import datetime
import hashlib
import json
import pathlib
import re

ROOT=pathlib.Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
BASE=ROOT/'tools/rust-r4ghi/independent/review05/shared-source-followup58'
OLD=BASE/'edition12-80';OUT=BASE/'edition12-81';sha=lambda b:hashlib.sha256(b).hexdigest()
assert not (OUT/'manifest81.json').exists()
old_bytes=(OLD/'manifest80.json').read_bytes();assert sha(old_bytes)=='bfb4038bb3e1ebbd26ffbe72728ff795065ec50e7e04512d89f8b487cf6674f0';old=json.loads(old_bytes)
provenance=json.loads((OLD/'input-provenance80.json').read_bytes())
for p in provenance['productSources']+provenance['baseHelperSources']:assert sha((ROOT/p['file']).read_bytes())==p['sha256'],p['file']
assert sorted(p.relative_to(ROOT).as_posix() for p in (ROOT/'tools/rust-r4ghi/business').iterdir() if p.is_file() and p.suffix in ['.json','.mjs'])==sorted(p['file'] for p in provenance['baseHelperSources'])
source_path=OUT/'candidate/tools/rust-r4ghi/business/required-write-sources58.json';source=json.loads(source_path.read_bytes())
assert source['productSources']==provenance['productSources'] and len(source['helperSources'])==155
for p in source['helperSources']:
 q=OUT/'candidate'/p['file']
 if not q.exists():q=OLD/'candidate'/p['file']
 if not q.exists():q=ROOT/p['file']
 assert sha(q.read_bytes())==p['sha256'],p['file']
deltas=[]
for q in sorted((OUT/'candidate').rglob('*')):
 if not q.is_file():continue
 logical=q.relative_to(OUT/'candidate').as_posix();prior=OLD/'candidate'/logical
 assert (OUT/'before'/logical).read_bytes()==prior.read_bytes()
 assert (OUT/'sandbox'/logical).read_bytes()==q.read_bytes()
 assert not (ROOT/logical).exists()
 deltas.append({'file':logical,'rootBeforeSHA256':None,'applyAfter80SHA256':sha(prior.read_bytes()),'afterSHA256':sha(q.read_bytes()),'candidate':q.relative_to(OUT).as_posix(),'beforeCandidate':(OUT/'before'/logical).relative_to(OUT).as_posix()})
assert len(deltas)==3
effective=[]
for f in old['files']:
 override=next((d for d in deltas if d['file']==f['file']),None)
 candidate=OUT/override['candidate'] if override else OLD/f['candidate']
 effective.append({'file':f['file'],'beforeSHA256':f['beforeSHA256'],'afterSHA256':sha(candidate.read_bytes()),'candidate':candidate.relative_to(BASE).as_posix(),'candidateBase':'tools/rust-r4ghi/independent/review05/shared-source-followup58','fromEdition':81 if override else 80})
assert len(effective)==13
for f in effective:assert sha((OUT/'sandbox'/f['file']).read_bytes())==f['afterSHA256']
checks={}
for name,count in [('windows-pure81',128),('linux-targeted81',25)]:
 text=(OUT/(name+'.stdout.log')).read_text();assert re.search(r'\btests '+str(count)+r'\b',text) and re.search(r'\bpass '+str(count)+r'\b',text) and re.search(r'\bfail 0\b',text)
 assert (OUT/(name+'.stderr.log')).stat().st_size==0
 checks[name]={'passed':count,'failed':0,'stdoutSHA256':sha((OUT/(name+'.stdout.log')).read_bytes()),'stderrSHA256':sha((OUT/(name+'.stderr.log')).read_bytes())}
syntax=json.loads((OUT/'syntax81.json').read_bytes());assert len(syntax)==2 and all(p['exitCode']==0 for p in syntax)
m={'schemaVersion':1,'kind':'author-support-exact-losing-session-attribution81','at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
   'applyAfter80':{'file':'../edition12-80/manifest80.json','sha256':sha(old_bytes)},'files':deltas,'effectiveFiles':effective,
   'sourceEdition':old['sourceEdition'],'sourcePinsSHA256':old['sourcePinsSHA256'],'productSources':406,'binarySHA256':old['binarySHA256'],
   'source58SHA256':sha(source_path.read_bytes()),'baseBusinessHelperCount':141,'expectedFinalBusinessHelperCount':152,'helperSourcesExcludingSelfIncludingOutside':155,
   'runtimeOrder':old['runtimeOrder'],'migrations':97,'tablesPerDatabase':139,
   'scope':'After immutable winning ledger only, correct exact existing losing-session raw-touch metadata proof to its real capture409 request/originals; no touch produces explicit null and zero writes.',
   'exactAllowedColumns':['idle_expires_at','last_ip','last_seen_at','row_version','updated_at'],'genericLedgerUnchanged':True,'businessOwnedUnchanged':True,
   'README':{'file':'README81.md','sha256':sha((OUT/'README81.md').read_bytes())},'tests':{'Node':'24.19.0',**checks,'syntaxChangedFiles':2,'syntaxAllExit0':True,'syntaxSHA256':sha((OUT/'syntax81.json').read_bytes()),'remaining10MjsUnchangedFrom80':True},
   'RootToolsOrProductWritten':False,'SQLExecutedByAuthor':False,'HTTPExecutedByAuthor':False,'requiresRootNonAuthorReviewAndExactPromotion':True,
   'G3Certified':False,'G4Certified':False}
(OUT/'manifest81.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'manifest':str(OUT/'manifest81.json'),'sha256':sha((OUT/'manifest81.json').read_bytes()),'deltas':3,'effectiveFiles':13,'source58SHA256':m['source58SHA256'],'windows':128,'linux':25,'RootChanged':False,'SQL':False,'HTTP':False}))
