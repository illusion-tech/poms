import hashlib
import json
import pathlib
from datetime import datetime, timezone

folder = pathlib.Path(__file__).resolve().parent
f_root = folder.parents[3]
root = pathlib.Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
authority_path = root / 'docs/design/rust-r4def/g2-allocation-freeze51.json'
authority_bytes = authority_path.read_bytes()
assert hashlib.sha256(authority_bytes).hexdigest() == '76b159d40f528f9735041f286cbc5f8d22f1e686a3955ba94f635a8b5703817f'
authority = json.loads(authority_bytes)
assert authority['implementationAuthorized'] is True and authority['independentP0P1P2'] == 0
archive = folder / 'source-before46'
assert not archive.exists(), 'Preserve the original F25 archive'
archive.mkdir()
pins = []
for item in authority['sourceBefore']:
    source = f_root / item['file']
    value = source.read_bytes()
    assert hashlib.sha256(value).hexdigest() == item['sha256']
    output = archive / (source.name + '.bin')
    output.write_bytes(value)
    pins.append({'file': item['file'], 'archiveFile': output.name, 'bytes': len(value), 'rawBytesSha256': item['sha256']})
(archive / 'manifest.json').write_text(json.dumps({'kind':'F46-original-F25-source-archive','capturedAt':datetime.now(timezone.utc).isoformat(),'files':pins},indent=2)+'\n',encoding='utf-8')
(folder / 'g2-allocation-freeze51.json.bin').write_bytes(authority_bytes)
print(json.dumps({'f25SourcesArchived':len(pins),'gateSha256':hashlib.sha256(authority_bytes).hexdigest()}))
