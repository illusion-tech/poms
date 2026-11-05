import hashlib, json, pathlib
root = pathlib.Path(__file__).resolve().parents[3]
folder = root / 'docs/design/rust-r4def/joint-g1-06'
manifest = json.loads((folder / 'manifest06.json').read_text('utf-8'))
for item in manifest['outputs']:
    p = root / item['file']
    assert hashlib.sha256(p.read_bytes()).hexdigest() == item['rawBytesSha256'], p
authority = json.loads((folder / 'schema-authority06.json').read_text('utf-8'))
owned = {k:v for k,v in authority['schemas'].items() if v.get('owner') == 'F'}
(root / 'tools/rust-r4def/F/frozen-schemas06.json').write_text(json.dumps(owned, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
for name, declaration in owned.items():
    schema = declaration['after']
    print(name, json.dumps(schema, ensure_ascii=False, separators=(',', ':')))
