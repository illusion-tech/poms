import pathlib,json,hashlib
ROOT=pathlib.Path('E:/projects/worktrees/poms-r3hijk-next28/poms');BASE=ROOT/'tools/rust-r4ghi/independent/review05/shared-source-followup58';OLD=BASE/'foreign-fiscal-source-proposal84';OUT=BASE/'foreign-fiscal-source-proposal84-02';sha=lambda b:hashlib.sha256(b).hexdigest()
assert sha((OLD/'manifest84.json').read_bytes())=='b4a22ea2f436c9d7c8d38667b2c7483025e6a3f1e172cf0feb7a054bca36af9a';assert not (OUT/'candidate').exists()
for file,marker in [('apps/poms-api-rust/src/project_operating/context.rs','#[cfg(test)]\nmod foreign_fiscal_source84_tests'),('apps/poms-api-rust/src/project_operating/store.rs','#[cfg(test)]\nmod foreign_fiscal_predicate84_tests')]:
 p=OLD/'candidate'/file;text=p.read_text();a=text.index(marker);i=text.index('{',a)+1;depth=1
 while depth:depth+=(text[i]=='{')-(text[i]=='}');i+=1
 module=text[a:i];rest=text[:a]+text[i:];after=rest.rstrip()+'\n\n'+module+'\n'
 for folder,bytes in [('before84',p.read_bytes()),('candidate',after.encode())]:
  q=OUT/folder/file;q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(bytes)
print('Moved84 test modules to EOF in new02 copies only; old84 and Root unchanged')
