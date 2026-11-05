"""Offline Git object/pack measurements; all output stays beside this file."""
import argparse
import hashlib
import json
import os
import re
import struct
import subprocess
import time
from pathlib import Path

ROOT = Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
OUT = Path(__file__).resolve().parent
BASE = 'aa9290fba9ff01fc8086c5a8ca52c20b59202017'
TARGET = '0dc42d13bbd1e22a021535d8b67ac9e4f7e1ca77'
PROFILES = {
    'default': [],
    'nosparse': ['-c', 'pack.useSparse=false'],
    'opt221': ['-c', 'pack.allowPackReuse=false', '-c', 'pack.useBitmaps=false', '-c', 'pack.compression=9', '-c', 'core.compression=9', '-c', 'pack.window=50', '-c', 'pack.threads=2'],
    'opt221-nosparse': ['-c', 'pack.allowPackReuse=false', '-c', 'pack.useBitmaps=false', '-c', 'pack.compression=9', '-c', 'core.compression=9', '-c', 'pack.window=50', '-c', 'pack.threads=2', '-c', 'pack.useSparse=false'],
    'pathwalk': ['-c', 'pack.usePathWalk=true', '-c', 'pack.useSparse=false', '-c', 'pack.useBitmaps=false'],
}
parser = argparse.ArgumentParser()
parser.add_argument('profile', choices=PROFILES)
parser.add_argument('--target', default=TARGET)
parser.add_argument('--base', default=BASE)
parser.add_argument('--name')
parser.add_argument('--also-exclude', action='append', default=[])
args = parser.parse_args()
assert re.fullmatch('[0-9a-f]{40}', args.target) and re.fullmatch('[0-9a-f]{40}', args.base)
assert all(re.fullmatch('[0-9a-f]{40}', item) for item in args.also_exclude)
name = args.name or args.profile
assert re.fullmatch('[A-Za-z0-9_-]+', name)
environment = dict(os.environ, GIT_OPTIONAL_LOCKS='0', GIT_NO_LAZY_FETCH='1', GIT_TERMINAL_PROMPT='0')
command = ['git', '-C', str(ROOT), *PROFILES[args.profile], 'pack-objects', '--stdout', '--revs', '--thin', '--delta-base-offset']
pack_path = OUT / (name + '.pack')
stderr_path = OUT / (name + '.stderr.bin')
start = time.monotonic()
with pack_path.open('xb') as pack, stderr_path.open('xb') as stderr:
    revisions = args.target + '\n^' + args.base + '\n' + ''.join('^' + item + '\n' for item in args.also_exclude)
    process = subprocess.run(command, input=revisions.encode('ascii'), stdout=pack, stderr=stderr, env=environment, cwd=OUT, timeout=180)
data = pack_path.read_bytes()
assert process.returncode == 0, stderr_path
assert data[:4] == b'PACK'
record = dict(kind='read-only-local-pack-measurement230', profile=args.profile, target=args.target, excludedBase=args.base,
              alsoExcluded=args.also_exclude,
              command=command, exitCode=process.returncode, seconds=round(time.monotonic() - start, 3),
              bytes=len(data), objectCount=struct.unpack('>I', data[8:12])[0], rawBytesSha256=hashlib.sha256(data).hexdigest(),
              rootRefsChanged=False, rootIndexChanged=False, remoteMutation=False)
with (OUT / (name + '.json')).open('x', encoding='utf-8', newline='\n') as receipt:
    json.dump(record, receipt, indent=2)
    receipt.write('\n')
print(json.dumps(record))
