import pathlib,hashlib,json,shutil
ROOT=pathlib.Path('E:/projects/worktrees/poms-r3hijk-next28/poms');BASE=ROOT/'tools/rust-r4ghi/independent/review05/shared-source-followup58';OLD=BASE/'tax-continuation13-draft85';OUT=BASE/'tax-continuation13-draft85-02';sha=lambda b:hashlib.sha256(b).hexdigest();assert sha((OLD/'manifest85.json').read_bytes())=='699e69811117a3b40d41ebba288b8161a359881d5b6bfaef2605695e989d46ea';assert not (OUT/'candidate').exists()
for name in ['tax13-provenance.mjs','tax13.test.mjs']:
 f='tools/rust-r4ghi/business/'+name
 for prefix in ['candidate','before85']:
  q=OUT/prefix/f;q.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(OLD/'candidate'/f,q)
shutil.copytree(OLD/'sandbox',OUT/'sandbox');(OUT/'temp').mkdir();print('New85-02 copies only; Root and immutable85 preserved')
