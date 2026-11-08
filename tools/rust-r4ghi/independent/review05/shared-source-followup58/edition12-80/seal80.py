import datetime
import hashlib
import json
import pathlib
import re

ROOT = pathlib.Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
OUT = ROOT / 'tools/rust-r4ghi/independent/review05/shared-source-followup58/edition12-80'
CANDIDATE = OUT / 'candidate'
sha = lambda b: hashlib.sha256(b).hexdigest()
manifest_path = OUT / 'manifest80.json'
assert not manifest_path.exists(), 'Frozen edition must not be replaced'
provenance = json.loads((OUT / 'input-provenance80.json').read_bytes())
base = provenance['baseHelperSources']
for pin in base + provenance['productSources']:
    assert sha((ROOT / pin['file']).read_bytes()) == pin['sha256'], pin['file']
actual_helpers = sorted(p.relative_to(ROOT).as_posix() for p in (ROOT / 'tools/rust-r4ghi/business').iterdir() if p.is_file() and p.suffix in ['.json','.mjs'])
assert actual_helpers == sorted(p['file'] for p in base)
source58_path = CANDIDATE / 'tools/rust-r4ghi/business/required-write-sources58.json'
source58 = json.loads(source58_path.read_bytes())
assert source58['productSources'] == provenance['productSources'] and len(source58['productSources']) == 406
assert len(source58['helperSources']) == 155
for pin in source58['helperSources']:
    path = CANDIDATE / pin['file']
    if not path.exists(): path = ROOT / pin['file']
    assert sha(path.read_bytes()) == pin['sha256'], pin['file']
files = []
for path in sorted(CANDIDATE.rglob('*')):
    if not path.is_file(): continue
    logical = path.relative_to(CANDIDATE).as_posix()
    before = ROOT / logical
    if before.exists():
        assert logical in ['tools/rust-r4ghi/business/faults.mjs','tools/rust-r4ghi/business/upstream.mjs']
        before_candidate = OUT / 'before' / logical
        assert before_candidate.read_bytes() == before.read_bytes()
    else: before_candidate = None
    assert (OUT / 'sandbox' / logical).read_bytes() == path.read_bytes()
    files.append({'file':logical,'beforeSHA256':sha(before.read_bytes()) if before.exists() else None,
                  'afterSHA256':sha(path.read_bytes()),'candidate':path.relative_to(OUT).as_posix(),
                  'beforeCandidate':before_candidate.relative_to(OUT).as_posix() if before_candidate else None})
assert len(files) == 13
syntax = json.loads((OUT / 'syntax80.json').read_bytes())
assert len(syntax) == 12 and all(x['exitCode'] == 0 for x in syntax)
test_results = {}
for name, count in [('windows-pure80',125),('linux-targeted80',22)]:
    stdout = (OUT / (name + '.stdout.log')).read_text()
    assert re.search(r'\btests '+str(count)+r'\b', stdout) and re.search(r'\bpass '+str(count)+r'\b', stdout) and re.search(r'\bfail 0\b', stdout)
    assert (OUT / (name + '.stderr.log')).stat().st_size == 0
    test_results[name] = {'passed':count,'failed':0,'stdoutSHA256':sha((OUT / (name + '.stdout.log')).read_bytes()),'stderrSHA256':sha((OUT / (name + '.stderr.log')).read_bytes())}
cash = json.loads((OUT / 'frozen-cash-shape80.stdout.log').read_bytes())
assert cash['currentAcceptance'] is False and cash['realFreshPreparationUsed'] is False and len(cash['checks']) == 3
assert (OUT / 'frozen-cash-shape80.stderr.log').stat().st_size == 0
tests = {'Node':'24.19.0','windowsFullBusinessPure':test_results['windows-pure80'],'linuxNewPure':test_results['linux-targeted80'],
         'syntax':{'files':12,'allExit0':True,'receiptSHA256':sha((OUT/'syntax80.json').read_bytes())},
         'historicalCashCatalogShape':{'contexts':3,'producer':'API134/source11','currentAcceptance':False,'stdoutSHA256':sha((OUT/'frozen-cash-shape80.stdout.log').read_bytes()),'stderrSHA256':sha((OUT/'frozen-cash-shape80.stderr.log').read_bytes())}}
manifest = {'schemaVersion':1,'kind':'author-support-shared-stage-tax-and-ordered-race-source12-edition80',
            'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':files,
            'sourceEdition':'g2-business12/API135','sourcePinsSHA256':provenance['sourceInputSHA256'],'productSources':406,
            'binarySHA256':provenance['binarySHA256'],'actualSource12Candidate':provenance['actualCandidate'],
            'baseBusinessHelperCount':141,'expectedFinalBusinessHelperCount':152,'helperSourcesExcludingSelfIncludingOutside':155,
            'source58SHA256':sha(source58_path.read_bytes()),'migrations':97,'tablesPerDatabase':139,
            'inputProvenanceSHA256':sha((OUT/'input-provenance80.json').read_bytes()),
            'README':{'file':'README80.md','sha256':sha((OUT/'README80.md').read_bytes())},
            'runtimeOrder':[{'stage':'shared-stage-race58','purpose':'Stage full necessary FI plus secondary project lock; final same-body success is correction201/capture409 actual ordered race'},
                            {'stage':'shared-tax-fixture58','purpose':'Real current Expense/E/F pending before consumption; complete2/1 batch and two real G snapshots, then fresh preparation only'},
                            {'stage':'shared-tax-sweep58','purpose':'Tax-only same-pending automatic whole-batch replacement; all affected G/H necessary FI and same-body201'}],
            'requiresRootExclusiveDriverAndExactPromotion':True,'doesNotAllowPlainStageSuccessThenReplayForRace':True,
            'actualInventoriesAreDerivedNotHardcoded87or67':True,'allActualLiveTerminalsRequired':True,'periodTargetsFailClosed':True,
            'serverPreparationRequiredAfterLatestActualCReceipt':True,'oldExpectedHashesNeverRefreshedDuringSweep':True,
            'sharedTaxWithoutReceiverLocalFRelationRemainsUnknown':True,'oldArtifactsNotRelabelledOrEdited':True,
            'controls':'Only Root-owned exact FI DDL; scheduling SELECT FOR UPDATE/BEGIN/ROLLBACK; no business fixture SQL',
            'tests':tests,'RootToolsOrProductWritten':False,'SQLExecutedByAuthor':False,'HTTPExecutedByAuthor':False,
            'GateScope':'Authored executable support proposal only; Root non-author review, exact promotion and real execution still required',
            'G3Certified':False,'G4Certified':False}
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'manifest':str(manifest_path),'sha256':sha(manifest_path.read_bytes()),'targetFiles':len(files),'source58SHA256':manifest['source58SHA256'],'tests':{'windows':125,'linux':22,'syntax':12},'RootProductUnchanged':True,'SQL':False,'HTTP':False}))
