"""Read Root public inputs; write a reviewable support packet only in this directory."""
from __future__ import annotations

import argparse
import difflib
import hashlib
import json
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

PACKAGE = Path(__file__).resolve().parent
POLICY = json.loads((PACKAGE / 'policy130.json').read_text(encoding='utf-8'))
ROOT = Path(POLICY['expectedRoot'])
DOCS = [
    'README.md', 'docs/design/README.md',
    'docs/design/backend-rust-migration-plan.md',
    'docs/design/rust-migration-execution-tracker.md',
    'docs/design/phase2-development-execution-tracker.md',
    'docs/design/rust-r4-scope-and-dependencies.md',
    'docs/design/rust-r4def-delivery-status.json',
    'docs/design/api-route-canonical-inventory.md',
]
COUNTS = dict(D=7, E=11, F=12, batch=30, r4DeliveredAfterFinal=67, r4Total=92,
              remaining=25, operating=17, acceptanceCompletionArchive=8,
              rustTechnical=240, rustOfficialBeforeFinal=210, rustOfficialAfterFinal=240,
              paths=239, operations=293, schemas=626, clientFiles=616)
PROOFS = ['finalValidation', 'cleanup', 'stopped', 'independentG3', 'fixedCommitReview',
          'mainIntegration', 'preclosePermission', 'onlineReadback', 'independentActualG4']
ASSERTIONS = ['exactOwnedCleanup', 'borrowedOriginalsRestored', 'secondCleanupNoop',
              'ownedApisStopped', 'privateAndVolumesRetained', 'historicalLabelsRetained',
              's4IsPermanentAncestor', 'productScopeLimitedToBatch30',
              'sixIssueBodiesCommentsAndNativeTreeMatchApprovedPlan',
              'finalIndependentActualG4Pass', 'fullR4RemainsIncomplete', 'r5AndLaterRemainOutOfScope']


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def emit(relative: str, data: bytes | str | dict | list) -> None:
    destination = PACKAGE / relative
    assert destination.resolve().is_relative_to(PACKAGE)
    destination.parent.mkdir(parents=True, exist_ok=True)
    if not isinstance(data, (bytes, str)):
        data = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    if isinstance(data, str):
        data = data.encode('utf-8')
    # Only named review templates are mutable drafts. Source snapshots and plans stay create-only.
    mode = 'wb' if relative.startswith(('ready-template/', 'final-template/')) else 'xb'
    with destination.open(mode) as stream:
        stream.write(data)


def destination_for(origin: str) -> str:
    if origin == POLICY['baseline']:
        return 'docs/design/archive/slices/rust-r4def-next30-baseline.md.bin'
    for prefix, target in [
        ('docs/design/rust-r4def/', 'docs/design/archive/slices/rust-r4def/'),
        ('tmp/rust-r4def/root/', 'docs/design/archive/slices/rust-r4def/g2-evidence130/root/'),
        ('tmp/rust-r4def/independent/', 'docs/design/archive/slices/rust-r4def/g2-evidence130/independent/'),
    ]:
        if origin.startswith(prefix):
            result = target + origin[len(prefix):]
            return result if result.endswith(('.bin', '.png')) else result + '.bin'
    raise ValueError(f'Unapproved origin: {origin}')


def excluded(relative: str, directory: bool = False) -> str | None:
    parts = relative.lower().split('/')
    if any(part in POLICY['deniedDirectoryComponents'] for part in parts):
        return 'excluded-private-object-or-build-directory'
    if directory:
        return None
    name = parts[-1]
    if re.search(POLICY['buildOutputPathRegex'], relative.lower()):
        return 'excluded-build-output-bulk'
    source_wrapper = re.search(POLICY['publicSourceWrapperRegex'], name)
    if name.startswith('.env') or (re.search(POLICY['deniedNameRegex'], name) and not source_wrapper):
        return 'excluded-private-looking-name'
    if any(name.endswith(suffix) or suffix + '.' in name for suffix in POLICY['deniedSuffixes']):
        return 'excluded-runtime-container-or-secret-suffix'
    return None


def enumerate_public(base: str):
    start = ROOT / base
    if not start.is_dir():
        raise ValueError(f'Missing public input directory: {base}')
    stack = [start]
    while stack:
        directory = stack.pop()
        for item in sorted(os.scandir(directory), key=lambda x: x.name.lower()):
            relative = Path(item.path).relative_to(ROOT).as_posix()
            stat = item.stat(follow_symlinks=False)
            if item.is_symlink() or getattr(stat, 'st_file_attributes', 0) & 0x400:
                yield relative, 'excluded-reparse-point', None
                continue
            reason = excluded(relative, item.is_dir(follow_symlinks=False))
            if reason:
                yield relative, reason, None
            elif item.is_dir(follow_symlinks=False):
                stack.append(Path(item.path))
            elif item.is_file(follow_symlinks=False):
                yield relative, None, stat.st_size


def build_plan() -> dict:
    entries, exclusions, blocked = [], [], []
    sources = [(POLICY['baseline'], None, (ROOT / POLICY['baseline']).stat().st_size)]
    sources += list(enumerate_public(POLICY['lifecycleRoot']))
    for base in POLICY['publicEvidenceRoots']:
        sources += list(enumerate_public(base))
    for relative, reason, size in sources:
        lifecycle = relative == POLICY['baseline'] or relative.startswith(POLICY['lifecycleRoot'] + '/')
        if not reason and size > POLICY['maxBytesPerFile']:
            reason = 'excluded-oversize-file'
        if not reason and not lifecycle and Path(relative).suffix.lower() not in POLICY['allowedExtensions']:
            reason = 'excluded-non-evidence-extension'
        if not reason:
            data = (ROOT / relative).read_bytes()
            if relative.endswith('.bin') and data.startswith((b'MZ', b'\x7fELF', b'PK')):
                reason = 'excluded-runtime-or-container-magic'
        if reason:
            record = dict(logicalOrigin=relative, reason=reason)
            exclusions.append(record)
            if lifecycle:
                blocked.append(record)
            continue
        assert len(data) == size, f'Input changed while freezing: {relative}'
        entries.append(dict(logicalOrigin=relative, storedAt=destination_for(relative),
                            operation='move' if lifecycle else 'copy', bytes=len(data),
                            rawBytesSha256=sha(data), certification='original-labels-retained-no-upgrade'))
    entries.sort(key=lambda entry: entry['logicalOrigin'])
    assert len({e['storedAt'].lower() for e in entries}) == len(entries)
    return dict(kind='R4DEF-closeout130-raw-archive-plan', generatedAt=datetime.now(timezone.utc).isoformat(),
                expectedRoot=POLICY['expectedRoot'], policyRawBytesSha256=sha((PACKAGE / 'policy130.json').read_bytes()),
                entries=entries, exclusions=exclusions, blockedLifecycle=blocked,
                totals=dict(files=len(entries), bytes=sum(e['bytes'] for e in entries),
                            lifecycleMoves=sum(e['operation'] == 'move' for e in entries),
                            publicEvidenceCopies=sum(e['operation'] == 'copy' for e in entries),
                            exclusions=len(exclusions)),
                runtimeCertified=False, archiveApplied=False,
                note='Planning only; source bytes and actual Root Gate facts must pass before applying.')


def create_packet(plan_name: str, refresh: bool) -> None:
    if not refresh:
        guards = []
        for source in DOCS:
            data = (ROOT / source).read_bytes()
            snapshot = 'sources/' + source + '.bin'
            emit(snapshot, data)
            guards.append(dict(logicalOrigin=source, snapshot=snapshot, bytes=len(data), rawBytesSha256=sha(data)))
        emit('source-guards130.json', dict(kind='R4DEF-closeout130-writeback-source-guards',
                                          expectedRoot=POLICY['expectedRoot'], files=guards))
        facts = dict(kind='Root-supplied-R4DEF-closeout-facts130', rootVerified=None, stage='Pending',
                     closedAt=None, implementationCommit=None, metadataCommit=None, mainCommit=None, finalMetadataCommit=None,
                     permanentS4='4f0ad88e78622a75b88b4e3cc72aded9da67458a', counts=COUNTS,
                     evidence={name: dict(file=None, rawBytesSha256=None,
                                          checks=[dict(pointer=None, equals=None)]) for name in PROOFS},
                     assertions={name: None for name in ASSERTIONS},
                     issueStatePointers={str(n): None for n in [57, 101, 106, 107, 108, 109]},
                     instructions='Root fills real paths, exact raw SHA256, actual JSON-pointer/value checks and assertions; null is never Pass.')
        emit('root-facts130.template.json', facts)
    plan = build_plan()
    emit(plan_name, plan)
    print(json.dumps(dict(plan=plan_name, **plan['totals'], blockedLifecycle=len(plan['blockedLifecycle']))))


def migrate_links(text: str, relative: str, plan: dict) -> str:
    mapping = {entry['logicalOrigin']: entry['storedAt'] for entry in plan['entries'] if entry['operation'] == 'move'}
    base = Path(relative).parent.as_posix()
    def replace(match):
        target = match.group(1)
        if '://' in target or target.startswith('#'):
            return match.group(0)
        path, separator, fragment = target.partition('#')
        logical = os.path.normpath(os.path.join(base, path)).replace('\\', '/')
        if logical not in mapping:
            return match.group(0)
        link = os.path.relpath(mapping[logical], base).replace('\\', '/')
        return '](' + link + (separator + fragment if separator else '') + ')'
    return re.sub(r'\]\(([^()\s]+)\)', replace, text)


def proof_ref(name: str, doc: str, facts: dict | None, plan: dict) -> str:
    token = '{{' + name + '_REF}}'
    if facts is None:
        return token
    source = facts['evidence'][name]['file']
    mapped = next((e['storedAt'] for e in plan['entries'] if e['logicalOrigin'] == source), source)
    # A later Gate may still live in public tmp or already be archived. Never invent a stored copy.
    if not (ROOT / mapped).is_file():
        mapped = source
    return os.path.relpath(mapped, Path(doc).parent).replace('\\', '/')


def summary(stage: str, doc: str, facts: dict | None, plan: dict) -> str:
    final = stage in ('Final', 'Seal')
    sealed = stage == 'Seal'
    date = facts['closedAt'][:10] if facts and facts.get('closedAt') else '{{ROOT_DATE}}'
    implementation = facts['implementationCommit'] if facts else '{{IMPLEMENTATION_COMMIT}}'
    prefix = '' if doc == 'README.md' else '../../'
    status = prefix + 'docs/design/rust-r4def-delivery-status.json'
    archive = prefix + 'docs/design/archive/slices/rust-r4def/archive-origin-map130.json'
    title = f'### {date} R4 第二批' + ('独立实际 G4 终审' if sealed else '实际线上 G4 收口' if final else ' G4 归档就绪')
    if facts is None:
        title += '（条件候选，未应用）'
    refs = lambda key: proof_ref(key, doc, facts, plan)
    if final:
        first = (f'D#107/E#108/F#109及本批#106已按[独立关闭许可]({refs("preclosePermission")})完成实际线上G4；'
                 f'[六Issue读回]({refs("onlineReadback")})核四项Closed、#101/#57持续Open。'
                 '本批D7/E11/F12共30个唯一HTTP正式交付，R4累计 **67/92**、余 **25**（经营17＋验收/完工/归档8），Rust正式公开操作 **240**。')
        first += (f'[非作者实际终审]({refs("independentActualG4")})已Pass，仅认证本批收口。' if sealed else '当前G4OnlineApplied，非作者实际G4终审另行签署；本条不伪造终审Pass。')
    else:
        first = ('本批D7/E11/F12共30个唯一HTTP已完成限定实现与实际验收，'
                 f'[独立G3]({refs("independentG3")})及[固定提交复核]({refs("fixedCommitReview")})通过。'
                 '当前为G4Ready，四项#107/#108/#109/#106仍Open；Rust技术surface240，正式仍210、本批正式新增0。'
                 '实施提交main集成已核；本批归档与Ready治理提交、独立关闭许可、实际线上G4和非作者实际终审继续推进；#101/#57保持Open。')
    common = (f'实现提交 `{implementation}`；永久S4 `4f0ad88e78622a75b88b4e3cc72aded9da67458a` 保留。'
              f'[验收]({refs("finalValidation")})、[精确清理]({refs("cleanup")})、[停止回执]({refs("stopped")})和[原字节归档]({archive})各自绑定原件；'
              f'[机器状态]({status})镜像同一Gate。完整spec为 **239 paths / 293 operations / 626 schemas**、client **616**。'
              '原G1、Block、Failed、Partial、ignored、Native参考与Native ORM exit 1均保留原分类，不升格为通过。')
    if final:
        common += f'[main集成]({refs("mainIntegration")})已核固定提交及永久S4；最终metadata提交与main SHA由Root实际回执提供。'
    boundary = ('完整R4阶段验收、R5、部署/切流、性能、S3 WORM与真实lost COMMIT ACK均未被本批认证完成；'
                '移交事实和已确认成本不绕过R5准入或自动纳入经营口径。'
                '另保留既有R2缺口：`createUser`携带`initialRoleIds`返回500（`actualapi32/00011`，'
                '`users/service.rs:469 intentionalProtocol`）；由#57后续跟进，本批不修复，也不宣称Rust全局正确性已经完成。')
    return '\n\n' + title + '\n\n' + first + '\n\n' + common + '\n\n' + boundary + '\n'


def migrate_json_refs(value, plan):
    mapping = {entry['logicalOrigin']: entry['storedAt'] for entry in plan['entries'] if entry['operation'] == 'move'}
    if isinstance(value, dict):
        return {key: migrate_json_refs(item, plan) for key, item in value.items()}
    if isinstance(value, list):
        return [migrate_json_refs(item, plan) for item in value]
    if isinstance(value, str):
        if value in mapping:
            return mapping[value]
        if 'docs/design/' + value in mapping:
            return mapping['docs/design/' + value][len('docs/design/'):]
    return value


def render(stage: str, output: str, plan_file: str, facts_file: str | None, prior_file: str | None) -> None:
    plan = json.loads((PACKAGE / plan_file).read_text(encoding='utf-8'))
    guards = json.loads((PACKAGE / 'source-guards130.json').read_text(encoding='utf-8'))['files']
    facts = json.loads(Path(facts_file).read_text(encoding='utf-8')) if facts_file else None
    prior = json.loads(Path(prior_file).read_text(encoding='utf-8')) if prior_file else None
    if facts is not None:
        assert facts['rootVerified'] is True and facts['counts'] == COUNTS
        assert facts['closedAt'] and re.fullmatch(r'[0-9a-f]{40}', facts['implementationCommit'])
    if prior:
        assert prior['kind'] == 'R4DEF-closeout130-writeback-applied'
        assert (prior['stage'], stage) in (('Ready', 'Final'), ('Final', 'Seal'))
    changes, patches = [], []
    for guard in guards:
        relative = guard['logicalOrigin']
        original = (PACKAGE / guard['snapshot']).read_bytes()
        assert len(original) == guard['bytes'] and sha(original) == guard['rawBytesSha256']
        current = (ROOT / relative).read_bytes()
        if prior:
            record = next(item for item in prior['files'] if item['logicalOrigin'] == relative)
            assert record['originalGuardRawBytesSha256'] == guard['rawBytesSha256']
            assert sha(current) == record['afterRawBytesSha256'], f'Prior Ready source changed: {relative}'
            original = current
        elif facts:
            assert sha(current) == guard['rawBytesSha256'], f'Writeback source changed: {relative}'
        text = original.decode('utf-8-sig').replace('\r\n', '\n')
        if relative.endswith('.json'):
            status = migrate_json_refs(json.loads(text), plan)
            status.update(stage=('G4Certified' if stage == 'Seal' else 'G4OnlineApplied' if stage == 'Final' else 'G4Ready') if facts else 'Candidate' + stage + 'NotApplied',
                          date=facts['closedAt'][:10] if facts else '{{ROOT_DATE}}',
                          updatedAt=facts['closedAt'] if facts else None,
                          officialNewDelivered=30 if stage in ('Final','Seal') else 0,
                          officialRustOperations=240 if stage in ('Final','Seal') else 210,
                          technicalRustOperations=240, G3Certified=True if facts else None,
                          G4Certified=(stage == 'Seal') if facts else None,
                          finalIndependentActualReviewPending=stage != 'Seal',
                          implementationCommit=facts['implementationCommit'] if facts else None,
                          metadataCommit=facts['metadataCommit'] if facts else None,
                          mainCommit=facts['mainCommit'] if facts else None,
                          finalMetadataCommit=facts.get('finalMetadataCommit') if facts else None,
                          fullR4Complete=False, fullR4StageAcceptanceComplete=False,
                          archive='archive/slices/rust-r4def/archive-origin-map130.json')
            status['issues'] = {str(n): ('CLOSED' if stage in ('Final','Seal') and n not in (57, 101) else 'OPEN') for n in (57, 101, 106, 107, 108, 109)}
            status['currentPublicContract'] = dict(paths=239, operations=293, schemas=626, generatedClientFiles=616,
                                                  permanentS4='4f0ad88e78622a75b88b4e3cc72aded9da67458a')
            status['r4Progress'] = dict(delivered=67 if stage in ('Final','Seal') else 37, total=92,
                                       remaining=25 if stage in ('Final','Seal') else 55,
                                       pendingBatch=0 if stage in ('Final','Seal') else 30,
                                       later=dict(operating=17, acceptanceCompletionArchive=8))
            status['G2']['historicalSnapshotOnly'] = True
            status['currentGateEvidence'] = facts['evidence'] if facts else {key: None for key in PROOFS}
            status['cleanupCertified'] = True if facts else None
            status['knownOutOfBatchFollowup'] = dict(issue=57, scope='existing-R2', capability='createUser with initialRoleIds',
                                                    actual='500', evidence='actualapi32/00011', source='users/service.rs:469 intentionalProtocol',
                                                    fixedByThisBatch=False)
            text = json.dumps(status, ensure_ascii=False, indent=2) + '\n'
        else:
            text = migrate_links(text, relative, plan)
            date = facts['closedAt'][:10] if facts else '{{ROOT_DATE}}'
            if relative.endswith('backend-rust-migration-plan.md'):
                text = re.sub(r'^\*\*文档状态\*\*:.*$', '**文档状态**: Active — R0/R1/R2/R3已完成；R4' + ('累计67/92、Rust正式240，本批#106/D/E/F已线上G4收口' if stage in ('Final','Seal') else '本批G4Ready，技术240/正式210') + '；完整R4仍Doing，#101/#57 Open，R5–R7待推进', text, count=1, flags=re.M)
            if relative.endswith('rust-migration-execution-tracker.md'):
                text = re.sub(r'^\*\*当前状态\*\*:.*$', '**当前状态**: R0/R1/R2/R3已交付；R4' + ('累计67/92、Rust正式240；#106/#107/#108/#109 Closed' if stage in ('Final','Seal') else '本批G4Ready、技术240/正式210，本批Issue保持Open') + '；#101 Doing、#57 Open，R5–R7 Todo', text, count=1, flags=re.M)
            if relative.endswith('phase2-development-execution-tracker.md'):
                text = re.sub(r'^\*\*Rust 迁移补充索引更新\*\*:.*$', '**Rust 迁移补充索引更新**: ' + date + '；原第二阶段任务状态不变', text, count=1, flags=re.M)
            if relative.endswith('rust-r4-scope-and-dependencies.md'):
                text = re.sub(r'^最后更新：.*$', '最后更新：' + date + '。#101/#57保持Open。' + ('本批#106/D#107/E#108/F#109已线上G4收口并Closed；R4累计67/92、余25，Rust正式240。' if stage in ('Final','Seal') else '本批仅G4Ready，正式Rust210、本批新增0。') + '完整R4仍未完成。', text, count=1, flags=re.M)
                text = text.replace('## 尚未交付的阶段范围', '## 首批后盘点（历史时点）', 1)
                text = text.replace('## 第二批当前准入', '## 第二批G1准入（历史时点）', 1)
            if relative.endswith('api-route-canonical-inventory.md'):
                old = '新增 RUST-R4D 两项 route surface 已获用户明确授权；当前仅冻结 canonical 候选，尚未实现或通过 G1。'
                new = 'RUST-R4D 两项 route surface 已完成真实实现及本批限定验收；' + ('本批已线上G4收口，正式交付计入D7。' if stage in ('Final','Seal') else '当前G4Ready，正式交付尚未计入。')
                if old in text:
                    text = text.replace(old, new, 1).replace('G2 前须完成联合 G1。', '原G1候选与冻结原件按历史标签保留。', 1)
                elif stage in ('Final', 'Seal'):
                    text = text.replace('当前G4Ready，正式交付尚未计入。', '本批已线上G4收口，正式交付计入D7。', 1)
                lines = text.splitlines()
                matched = 0
                for index, line in enumerate(lines):
                    if any('`' + capability + '`' in line for capability in ('prepareProjectHandover', 'confirmProjectHandoverParticipant')):
                        cells = line.split('|')
                        assert len(cells) == 12, line
                        cells[4] = cells[3]
                        cells[7] = ' `N/A` '
                        cells[10] = ' `aligned` '
                        lines[index] = '|'.join(cells)
                        matched += 1
                assert matched == 2, f'Canonical rows changed: {matched}'
                text = '\n'.join(lines) + '\n'
            if relative != 'README.md':
                text = re.sub(r'^\*\*最后更新\*\*: .*$', '**最后更新**: ' + date, text, count=1, flags=re.M)
            text = text.rstrip('\n') + summary(stage, relative, facts, plan)
        # Mutable index docs may use the source's newline representation. Raw lifecycle inputs never pass this code.
        result = text.replace('\n', '\r\n').encode('utf-8') if b'\r\n' in original else text.encode('utf-8')
        target = output + '/' + relative
        emit(target, result)
        if relative.endswith('api-route-canonical-inventory.md'):
            subprocess.run(['deno', 'run', '--allow-read', '--allow-write', str(ROOT / 'tools/format-md-tables.ts'),
                            str(PACKAGE / target)], check=True, cwd=PACKAGE, capture_output=True)
            result = (PACKAGE / target).read_bytes()
            text = result.decode('utf-8-sig').replace('\r\n', '\n')
        changes.append(dict(logicalOrigin=relative, candidate=target, beforeRawBytesSha256=sha(original),
                            originalGuardRawBytesSha256=guard['rawBytesSha256'], afterRawBytesSha256=sha(result), bytes=len(result)))
        patches.extend(difflib.unified_diff(original.decode('utf-8-sig').replace('\r\n', '\n').splitlines(True),
                                           text.splitlines(True), fromfile='a/' + relative, tofile='b/' + relative))
    emit(output + '/writeback130.patch', ''.join(patches))
    emit(output + '/writeback130.json', dict(kind='R4DEF-closeout130-rendered-writeback', stage=stage,
                                           templateOnly=facts is None, factsRawBytesSha256=sha(Path(facts_file).read_bytes()) if facts_file else None,
                                           planRawBytesSha256=sha((PACKAGE / plan_file).read_bytes()), files=changes))
    print(json.dumps(dict(output=output, stage=stage, templateOnly=facts is None, files=len(changes))))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--plan-name', default='archive-plan130.json')
    parser.add_argument('--refresh-plan', action='store_true')
    parser.add_argument('--render', choices=['Ready', 'Final', 'Seal'])
    parser.add_argument('--output')
    parser.add_argument('--facts')
    parser.add_argument('--prior-receipt')
    args = parser.parse_args()
    if args.render:
        assert args.output, 'Render output directory is required and must be new'
        render(args.render, args.output, args.plan_name, args.facts, args.prior_receipt)
    else:
        create_packet(args.plan_name, args.refresh_plan)
