"""Independent standard-library ZIP verification of actual K HTTP downloads."""
import datetime as dt
import hashlib
import json
import pathlib
import re
import sys
import zipfile

ROOT = pathlib.Path('/home/wangzishi/projects/poms-rust-r2k')

def digest(data):
    return hashlib.sha256(data).hexdigest()

def instant(value):
    return dt.datetime.fromisoformat(value.replace('Z', '+00:00'))

def verify(file):
    report = json.loads((ROOT / file).read_bytes())
    assert report['result'] == 'observed' and report['doubleZero']
    case = next(c for c in report['requests'] if c['name'] == 'k.package.success')
    response = case['response']['body']
    package = next(p for p in case['after']['attachment_download_package'] if p['id'] == response['id'])
    assert instant(package['created_at']) == instant(response['createdAt'])
    assert instant(package['expires_at']) == instant(response['expiresAt'])
    assert instant(response['expiresAt']) - instant(response['createdAt']) == dt.timedelta(hours=24)
    assert instant(case['startedAt']) <= instant(response['createdAt']) <= instant(case['finishedAt'])
    assert package['status'] == response['status'] == 'ready'
    assert package['manifest_summary'] == response['manifestSummary']
    archive_file = (ROOT / report['download']['file']).resolve()
    assert archive_file.is_relative_to(ROOT / 'tmp/rust-r2k')
    archive_bytes = archive_file.read_bytes()
    assert digest(archive_bytes) == report['download']['rawBytesSha256']
    aliases = {report['runId']: '<run>', response['id']: '<package>'}
    for key, value in report['fixture'].items():
        if key.endswith('Id'):
            aliases[value] = '<fixture.' + key + '>'
    payloads = {}
    for index, attachment in enumerate(report['attachments']):
        name = chr(ord('A') + index)
        assert attachment['versionGroupId'] == attachment['id']
        aliases[attachment['id']] = '<attachment.' + name + '>'
        payloads[attachment['id']] = ('K-' + name + '-actual\n').encode()
        assert digest(payloads[attachment['id']]) == attachment['checksumSha256']
    with zipfile.ZipFile(archive_file) as archive:
        assert archive.testzip() is None and archive.comment == b''
        entries = archive.infolist()
        assert entries[0].filename == 'manifest.json'
        manifest_bytes = archive.read(entries[0])
        manifest_text = manifest_bytes.decode('utf-8', errors='strict')
        manifest = json.loads(manifest_text)
        assert manifest['packageId'] == response['id']
        assert manifest['handoverId'] == report['fixture']['handoverId']
        assert manifest['projectId'] == report['fixture']['projectId']
        assert manifest['createdAt'] == response['createdAt']
        assert manifest['expiresAt'] == response['expiresAt']
        assert manifest['manifestSummary'] == response['manifestSummary']
        assert len(entries) == len(manifest['items']) + 1
        assert [i['attachmentId'] for i in manifest['items']] == response['manifestSummary']['includedAttachmentIds']
        assert len(manifest['items']) == response['manifestSummary']['includedCount'] == 2
        selections = {s['id']: s for s in case['after']['project_handover_attachment_selection']}
        items = [i for i in case['after']['attachment_download_package_item'] if i['package_id'] == response['id']]
        assert len(items) == len(manifest['items'])
        entry_rows = []
        for index, entry in enumerate(entries):
            assert entry.flag_bits == 0x800 and entry.compress_type == zipfile.ZIP_STORED
            assert entry.create_version == entry.extract_version == 20 and entry.create_system == 0
            assert entry.file_size == entry.compress_size and entry.extra == entry.comment == b''
            assert entry.internal_attr == entry.external_attr == 0
            dos_time = dt.datetime(*entry.date_time, tzinfo=dt.timezone.utc)
            assert instant(case['startedAt']) - dt.timedelta(seconds=2) <= dos_time <= instant(case['finishedAt'])
            assert entry.date_time == entries[0].date_time
            data = archive.read(entry)
            if index:
                item = manifest['items'][index - 1]
                selection = selections[item['selectionId']]
                aliases[item['selectionId']] = '<selection.' + aliases[item['attachmentId']] + '>'
                assert selection['status'] == 'included'
                assert item['attachmentId'] == selection['attachment_id']
                assert item['versionGroupId'] == selection['version_group_id']
                assert item['sourceRefs'] == selection['source_refs']
                assert item['displayName'] == selection['display_name']
                assert item['category'] == selection['category'] and item['securityLevel'] == selection['security_level']
                safe_name = re.sub(r'[\\/:*?"<>|]+', '_', item['displayName']).strip()[:180] or 'attachment.bin'
                expected_name = f'{index:03d}-' + safe_name + ('' if '.' in item['displayName'] else '.bin')
                assert entry.filename == item['fileName'] == expected_name
                assert data == payloads[item['attachmentId']]
                pg_item = next(i for i in items if i['attachment_id'] == item['attachmentId'])
                assert pg_item['file_name'] == entry.filename and pg_item['source_refs'] == item['sourceRefs']
                assert pg_item['status'] == 'included' and pg_item['version_group_id'] == item['versionGroupId']
            entry_rows.append({'name': entry.filename, 'bytes': len(data), 'sha256': digest(data), 'crc32': entry.CRC, 'localHeaderOffset': entry.header_offset})
    normalized = manifest_text
    for old, new in sorted(aliases.items(), key=lambda pair: len(pair[0]), reverse=True):
        normalized = normalized.replace(old, new)
    normalized = normalized.replace(response['createdAt'], '<createdAt>').replace(response['expiresAt'], '<expiresAt>')
    assert not re.search(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', normalized, re.I)
    output = {'report': file, 'archive': report['download'], 'entries': entry_rows, 'manifestRawSha256': digest(manifest_bytes), 'normalizedManifest': normalized, 'normalization': 'Only declared fixture/certified selection/package/attachment aliases and the two separately checked package timestamps; original JSON byte/property/Unicode order remains exact.', 'filenameScope': 'These two concrete A/B ASCII names only; Python strip/slicing is not a general JS UTF16/trim oracle.'}
    if report.get('advanced', {}).get('versionArchive'):
        version = report['advanced']['versionArchive']
        source = ROOT / version['file']
        assert digest(source.read_bytes()) == version['rawBytesSha256']
        creation = next(c for c in report['requests'] if c['name'] == 'advanced.version.unicode-package')
        summary = creation['response']['body']
        latest = report['advanced']['latestAttachment']
        assert summary['id'] == version['packageId']
        assert latest['versionGroupId'] == report['attachments'][0]['id']
        assert instant(summary['expiresAt']) - instant(summary['createdAt']) == dt.timedelta(hours=24)
        assert instant(creation['startedAt']) <= instant(summary['createdAt']) <= instant(creation['finishedAt'])
        with zipfile.ZipFile(source) as archive:
            assert archive.testzip() is None
            entries = archive.infolist()
            assert len(entries) == 2 and entries[0].filename == 'manifest.json'
            assert entries[1].filename == version['expectedEntryName'] == '001-方案_终稿😀.txt'
            assert all(i.flag_bits == 0x800 and i.compress_type == 0 and i.file_size == i.compress_size for i in entries)
            data = archive.read(entries[1])
            assert data == b'K-A-v2-actual\n' and digest(data) == version['payloadRawBytesSha256'] == latest['checksumSha256']
            text = archive.read(entries[0]).decode('utf-8', errors='strict')
            body = json.loads(text)
            assert body['packageId'] == summary['id'] and body['createdAt'] == summary['createdAt'] and body['expiresAt'] == summary['expiresAt']
            assert body['manifestSummary'] == summary['manifestSummary']
            assert len(body['items']) == 1 and body['items'][0]['attachmentId'] == latest['id']
            item = body['items'][0]
            assert item['versionGroupId'] == latest['versionGroupId'] and item['fileName'] == entries[1].filename
            selection = next(s for s in creation['after']['project_handover_attachment_selection'] if s['id'] == item['selectionId'])
            assert selection['attachment_id'] == latest['id'] and selection['source_refs'] == item['sourceRefs']
        version_aliases = dict(aliases)
        version_aliases[summary['id']] = '<unicodePackage>'
        version_aliases[latest['id']] = '<attachment.A.latest>'
        for key, value in report['advanced']['bindings'].items():
            if key not in ['latestAttachmentId', 'primarySelectionId']:
                version_aliases[value] = '<binding.' + key + '>'
        version_normalized = text
        for old, new in sorted(version_aliases.items(), key=lambda pair: len(pair[0]), reverse=True):
            version_normalized = version_normalized.replace(old, new)
        version_normalized = version_normalized.replace(summary['createdAt'], '<createdAt>').replace(summary['expiresAt'], '<expiresAt>')
        assert not re.search(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', version_normalized, re.I)
        output['unicodeLatestVersion'] = {'archive': version, 'crc32': entries[1].CRC, 'manifestRawSha256': digest(text.encode()), 'normalizedManifest': version_normalized, 'sameSelectionIdChangedAttachment': True, 'actualNewPayloadBytesVerified': True, 'filenameScope': 'Exact known Unicode name below180 UTF16 units; no generic trim/surrogate-boundary claim.'}
    return output

if __name__ == '__main__':
    assert len(sys.argv) == 4
    left, right = verify(sys.argv[1]), verify(sys.argv[2])
    assert left['normalizedManifest'] == right['normalizedManifest'], 'Actual manifest bytes differ after bounded, validated aliases'
    if 'unicodeLatestVersion' in left or 'unicodeLatestVersion' in right:
        assert left['unicodeLatestVersion']['normalizedManifest'] == right['unicodeLatestVersion']['normalizedManifest'], 'Actual Unicode/version manifest bytes differ after bounded aliases'
    result = {'formatVersion': 1, 'result': 'pass', 'kind': 'actual-ZIP-independent-Python-stdlib-check', 'python': sys.version, 'backends': [left, right], 'sameNormalizedManifestBytes': True, 'actualBinaryPayloadsEqualKnownUploadedBytes': True, 'performanceOrCloudClaim': False}
    output = ROOT / sys.argv[3]
    with output.open('x', encoding='utf-8', newline='\n') as target:
        json.dump(result, target, ensure_ascii=False, indent=2)
        target.write('\n')
    print(json.dumps({'result': 'pass', 'entriesPerBackend': len(left['entries']), 'normalizedManifestBytes': len(left['normalizedManifest'].encode())}))
