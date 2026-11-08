import pathlib,json,hashlib,re,datetime
ROOT=pathlib.Path('E:/projects/worktrees/poms-r3hijk-next28/poms');BASE=ROOT/'tools/rust-r4ghi/independent/review05/shared-source-followup58';OLD=BASE/'foreign-fiscal-source-proposal84';OUT=BASE/'foreign-fiscal-source-proposal84-02';sha=lambda b:hashlib.sha256(b).hexdigest()
assert not (OUT/'manifest84-02.json').exists();oldbytes=(OLD/'manifest84.json').read_bytes();assert sha(oldbytes)=='b4a22ea2f436c9d7c8d38667b2c7483025e6a3f1e172cf0feb7a054bca36af9a';old=json.loads(oldbytes)
def remove(text,marker):
 a=text.index(marker);i=text.index('{',a)+1;d=1
 while d:d+=(text[i]=='{')-(text[i]=='}');i+=1
 return text[:a]+text[i:],text[a:i],i
norm=lambda s:re.sub(r'\n(?:[ \t]*\n)+','\n\n',s.strip())
files=[]
for f in old['files']:
 marker='#[cfg(test)]\nmod '+('foreign_fiscal_source84_tests' if f['file'].endswith('context.rs') else 'foreign_fiscal_predicate84_tests');b=(OUT/'before84'/f['file']).read_bytes();assert sha(b)==f['afterSHA256'];a=(OUT/'candidate'/f['file']).read_bytes();old_code,old_module,_=remove(b.decode(),marker);new_code,new_module,end=remove(a.decode(),marker);assert old_module==new_module;assert norm(old_code)==norm(new_code);assert not a.decode()[end:].strip(),'new84 test module must be final item'
 files.append({'file':f['file'],'rootBaseBeforeSHA256':f['beforeSHA256'],'applyAfter84SHA256':sha(b),'afterSHA256':sha(a),'candidate':'candidate/'+f['file'],'before84Candidate':'before84/'+f['file'],'testModuleByteUnchangedSHA256':sha(new_module.encode()),'nonTestCodeUnchangedExceptBlankLineLayout':True})
assert (OUT/'rustfmt84-02.stderr.log').stat().st_size==0
m={'schemaVersion':1,'kind':'author-support-product84-test-layout-only02','at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'state':'unapplied-Source13-candidate-only','applyAfter84':{'file':'../foreign-fiscal-source-proposal84/manifest84.json','sha256':sha(oldbytes)},'files':files,'scope':'Move the exact two84 test modules to each file EOF; all non-test code and test bodies unchanged except separating blank lines. Prevent items_after_test_module layout warning.','RootProductWritten':False,'Root152HelperGraphChanged':False,'SQLExecuted':False,'HTTPExecuted':False,'validation':{'rustfmtFiles':2,'rustfmtExit0':True,'rustfmtStdoutSHA256':sha((OUT/'rustfmt84-02.stdout.log').read_bytes()),'rustfmtStderrSHA256':sha((OUT/'rustfmt84-02.stderr.log').read_bytes()),'exactPriorPureAndFSInputsUnchanged':True,'priorPureTests':3,'priorActualFSReplay':1,'fullCargoOrClippyCertified':False},'G3Certified':False,'G4Certified':False}
(OUT/'manifest84-02.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({'manifest':str(OUT/'manifest84-02.json'),'sha256':sha((OUT/'manifest84-02.json').read_bytes()),'files':2,'testBodiesExact':True,'nonTestCodeExactExceptBlankLines':True,'RootWritten':False}))
