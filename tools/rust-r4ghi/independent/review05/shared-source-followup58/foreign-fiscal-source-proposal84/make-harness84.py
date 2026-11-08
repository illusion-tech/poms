import pathlib,json,hashlib
ROOT=pathlib.Path('E:/projects/worktrees/poms-r3hijk-next28/poms');OUT=ROOT/'tools/rust-r4ghi/independent/review05/shared-source-followup58/foreign-fiscal-source-proposal84';sha=lambda b:hashlib.sha256(b).hexdigest()
store=(OUT/'candidate/apps/poms-api-rust/src/project_operating/store.rs').read_text();context=(OUT/'candidate/apps/poms-api-rust/src/project_operating/context.rs').read_text();sources=(ROOT/'apps/poms-api-rust/src/project_operating/sources.rs').read_text();support=(ROOT/'apps/poms-api-rust/src/contract_support/mod.rs').read_text()
def block(text,marker):
 start=text.index(marker);open=text.index('{',start);n=1;i=open+1
 while n:
  n+=(text[i]=='{')-(text[i]=='}');i+=1
 return text[start:i]+'\n'
enum=block(store,'#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]\npub(crate) enum Table')
predicate=block(store,'fn project_predicate(');ids=block(store,'pub(crate) fn id(');version=block(store,'pub(crate) fn version(');conflict=block(store,'pub(crate) fn conflict(')
catalog=block(sources,'#[derive(Default, Clone)]\npub(crate) struct Catalog');catalog_impl=block(sources,'impl Catalog {');kind=block(sources,'pub(crate) fn kind(');payload=block(sources,'pub(crate) fn factual_payload(');reference=block(sources,'pub(crate) fn reference(');canonical=block(support,'pub fn canonical_hash(')
local=block(context,'fn locally_registered_upstream(');costref=block(context,'fn cost_source_ref(');storetests=block(store,'#[cfg(test)]\nmod foreign_fiscal_predicate84_tests');contexttests=block(context,'#[cfg(test)]\nmod foreign_fiscal_source84_tests')
header='''// Isolated exact pure candidate predicates/local guard plus exact existing
// identity/hash/catalog/reference adapters; no async SQL/HTTP adapter compiled.
use serde_json::{Value,json};use uuid::Uuid;use crate::contract_support::Error;
mod contract_support {use serde_json::Value;use sha2::{Sha256,Digest};#[derive(Debug)]pub enum Error {Internal,CodedConflict{code:&'static str,message:String}}
'''
text=header+canonical+'}\nmod store {use crate::{Error,Value,Uuid};\n'+enum+'impl Table {\n'+predicate+'}\n'+ids+version+conflict+storetests+'}\nuse store::Table;\nmod sources {use crate::{Value,Uuid,Error};use crate::store::{self,Table};use crate::contract_support::canonical_hash;use std::collections::BTreeMap;\n'+catalog+catalog_impl+kind+payload+reference+'}\nuse sources::{self as source_adapter,Catalog};\n'+local+costref+contexttests
p=OUT/'pure-harness84.rs';assert not p.exists();p.write_text(text,encoding='utf-8',newline='\n')
deps=pathlib.Path(r'\\wsl.localhost\Debian\home\wangzishi\.cache\poms-r4ghi-target-ROOT\debug\deps');libs=['libserde_json-b2cbb6aa9ac0dba9.rlib','libuuid-670016c2d8dd5403.rlib','libsha2-332405444c4ca7e5.rlib'];inputs={'harnessSHA256':sha(p.read_bytes()),'proposedPredicateSHA256':sha(predicate.encode()),'proposedLocalGuardSHA256':sha(local.encode()),'productTestsSHA256':sha((storetests+contexttests).encode()),'readOnlyCachedDependencies':[{'file':'/home/wangzishi/.cache/poms-r4ghi-target-ROOT/debug/deps/'+n,'sha256':sha((deps/n).read_bytes())} for n in libs],'asyncProductionAdapterCompiled':False,'SQL':False,'HTTP':False,'RootWritten':False};(OUT/'harness-inputs84.json').write_text(json.dumps(inputs,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({'harnessSHA256':inputs['harnessSHA256'],'productTests':3,'SQL':False,'RootWritten':False}))
