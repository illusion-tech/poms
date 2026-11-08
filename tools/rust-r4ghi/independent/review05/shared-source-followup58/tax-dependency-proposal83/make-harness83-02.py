import pathlib,json,hashlib
ROOT=pathlib.Path('E:/projects/worktrees/poms-r3hijk-next28/poms');OUT=ROOT/'tools/rust-r4ghi/independent/review05/shared-source-followup58/tax-dependency-proposal83';sha=lambda b:hashlib.sha256(b).hexdigest()
g=(OUT/'candidate/apps/poms-api-rust/src/project_operating/restatement.rs').read_text()
start=g.index('#[derive(Clone)]\nstruct Impact {');end=g.index('async fn impact_graph(',start);helpers=g[start:end]
tests=g[g.index('#[cfg(test)]\nmod tax_dependency83_tests'):]
support=(ROOT/'apps/poms-api-rust/src/contract_support/mod.rs').read_text();canonical=support[support.index('pub fn canonical_hash('):support.index('pub fn require_uuid(',support.index('pub fn canonical_hash('))]
store=(ROOT/'apps/poms-api-rust/src/project_operating/store.rs').read_text();idfn=store[store.index('pub(crate) fn id('):store.index('pub(crate) fn version(',store.index('pub(crate) fn id('))];conflict=store[store.index('pub(crate) fn conflict('):store.index('pub(crate) async fn semantic_current_baseline(',store.index('pub(crate) fn conflict('))]
sources=(ROOT/'apps/poms-api-rust/src/project_operating/sources.rs').read_text();day=sources[sources.index('pub(crate) fn business_day('):sources.index('pub(crate) fn known_at(',sources.index('pub(crate) fn business_day('))]
header='''// Exact proposed pure helpers/tests and exact current hash/id/date adapters.
// This harness has no DB/HTTP and does not compile the async production adapter.
use serde_json::Value;
use std::collections::BTreeSet;
use uuid::Uuid;
use contract_support::Error;
mod contract_support {
 use serde_json::Value;
 use sha2::{Digest,Sha256};
 #[derive(Debug)]
 pub enum Error { Internal, CodedConflict {code: &'static str,message:String} }
'''
harness=header+canonical+'}\nmod store {use crate::{Error,Value,Uuid};\n'+idfn+conflict+'}\nmod sources {use crate::{Error,Value,store};use chrono::{DateTime,NaiveDate};\n'+day+'}\n'+helpers+tests
p=OUT/'pure-harness83-02.rs';p.write_text(harness,encoding='utf-8',newline='\n')
deps=pathlib.Path(r'\\wsl.localhost\Debian\home\wangzishi\.cache\poms-r4ghi-target-ROOT\debug\deps');libs=['libserde_json-b2cbb6aa9ac0dba9.rlib','libuuid-670016c2d8dd5403.rlib','libchrono-6f198e0d99a786b4.rlib','libsha2-332405444c4ca7e5.rlib','libchrono_tz-c227167beb59df47.rlib']
pins=[{'file':'/home/wangzishi/.cache/poms-r4ghi-target-ROOT/debug/deps/'+n,'sha256':sha((deps/n).read_bytes())} for n in libs]
receipt={'kind':'exact-source-pure83-harness-inputs','harnessSHA256':sha(p.read_bytes()),'proposedHelpersSHA256':sha(helpers.encode()),'proposedTestsSHA256':sha(tests.encode()),'currentCanonicalHashSHA256':sha(canonical.encode()),'currentIDAdapterSHA256':sha(idfn.encode()),'currentDateAdapterSHA256':sha(day.encode()),'readOnlyCachedDependencyPins':pins,'asyncProductionAdapterCompiled':False,'SQL':False,'HTTP':False,'RootWritten':False}
(OUT/'harness-inputs83-02.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'harnessSHA256':receipt['harnessSHA256'],'cachedDeps':len(pins),'RootWritten':False}))
