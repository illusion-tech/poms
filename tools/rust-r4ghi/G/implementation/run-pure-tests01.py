"""Bind isolated exact arithmetic checks to the actual shared/G source bytes."""
from pathlib import Path
import hashlib,json,subprocess
ROOT=Path(__file__).resolve().parents[4]
OUT=Path(__file__).resolve().parent
sources=['apps/poms-api-rust/src/project_operating/facts.rs','apps/poms-api-rust/src/project_operating_common/scalars.rs','tools/rust-r4ghi/G/implementation/pure-tests/src/lib.rs','tools/rust-r4ghi/G/implementation/pure-tests/Cargo.toml','tools/rust-r4ghi/G/implementation/pure-tests/build.rs']
def hashes(): return {path:hashlib.sha256((ROOT/path).read_bytes()).hexdigest() for path in sources}
before=hashes()
result=subprocess.run(['cargo','test','--manifest-path','tools/rust-r4ghi/G/implementation/pure-tests/Cargo.toml','--target-dir','tools/rust-r4ghi/G/implementation/pure-tests/target'],cwd=ROOT,text=True,encoding='utf-8',errors='replace',stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
after=hashes()
(OUT/'pure-tests/result01.log').write_text(result.stdout,encoding='utf-8')
evidence={'kind':'isolated-actual-common-scalar-and-G-facts','exitCode':result.returncode,'passed':result.returncode==0 and before==after,'sourceBytesStableDuringRun':before==after,'sourceSha256':after,'errorAdapter':'test-only minimal Error enum; actual common scalars.rs and G facts.rs imported directly','productCompilation':False,'databaseAcceptance':False,'httpAcceptance':False,'authorizationAcceptance':False,'log':'pure-tests/result01.log'}
(OUT/'pure-tests/result01.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(evidence,ensure_ascii=False))
raise SystemExit(0 if evidence['passed'] else 1)
