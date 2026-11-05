"""Prepare, never send, a single-original-commit Git receive-pack request."""
import hashlib
import json
import os
import struct
import subprocess
import zlib
from pathlib import Path

ROOT = Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
OUT = Path(__file__).resolve().parent
TARGET = 'e5f13b05a47766a4c6a3aa13b7fc7a39799b3e76'
PARENT = 'd6c3cff84dd96c981bab075d3f4aca3e98c76c4b'
PRELOADED29 = '81cb16950c4b87d2ea14e0fd44134ab310bb2a10'
TREE = '27a0e702ab3e3fd40d1f945f77333f9297c4001b'
ENV = dict(os.environ, GIT_OPTIONAL_LOCKS='0', GIT_NO_LAZY_FETCH='1', GIT_TERMINAL_PROMPT='0')

def git(arguments, data=None):
    result = subprocess.run(['git', '-C', str(ROOT), *arguments], input=data, capture_output=True, env=ENV, cwd=OUT, timeout=60)
    assert result.returncode == 0, result.stderr.decode('utf-8', 'replace')
    return result.stdout

def write(name, value):
    with (OUT / name).open('xb') as file:
        file.write(value)

def pkt(value):
    return f'{len(value)+4:04x}'.encode('ascii') + value

raw = git(['cat-file', 'commit', TARGET])
assert hashlib.sha1(b'commit ' + str(len(raw)).encode('ascii') + b'\0' + raw).hexdigest() == TARGET
headers = raw.split(b'\n\n', 1)[0].splitlines()
assert headers[0] == b'tree ' + TREE.encode('ascii')
assert [line for line in headers if line.startswith(b'parent ')] == [b'parent ' + PARENT.encode('ascii')]
assert git(['rev-parse', PRELOADED29 + '^{tree}']).strip().decode('ascii') == TREE
# No --revs: this object list contains exactly the original commit, not its tree/history.
pack = git(['pack-objects', '--stdout', '--delta-base-offset'], (TARGET + '\n').encode('ascii'))
assert pack[:4] == b'PACK' and struct.unpack('>I', pack[8:12])[0] == 1
assert hashlib.sha1(pack[:-20]).digest() == pack[-20:]
position = 12
byte = pack[position]
position += 1
assert (byte >> 4) & 7 == 1, 'Single full commit object required, no deltas'
size = byte & 15
shift = 4
while byte & 128:
    byte = pack[position]
    position += 1
    size |= (byte & 127) << shift
    shift += 7
inflater = zlib.decompressobj()
decoded = inflater.decompress(pack[position:-20]) + inflater.flush()
assert decoded == raw and len(decoded) == size and not inflater.unused_data
write('original-e5.commit.bin', raw)
write('original-e5-only.pack', pack)
requests = []
for name, old, ref in [
    ('create-exact-e5-temp230', '0'*40, 'refs/heads/codex/poms-r4def-transfer-e5-exact230'),
    ('replace-small25-after29', PRELOADED29, 'refs/heads/codex/poms-r4def-transfer-e5-small-25'),
]:
    command = f'{old} {TARGET} {ref}'.encode('ascii') + b'\0report-status\n'
    body = pkt(command) + b'0000' + pack
    filename = name + '.receive-pack.bin'
    write(filename, body)
    requests.append(dict(file=filename, bytes=len(body), rawBytesSha256=hashlib.sha256(body).hexdigest(),
                         old=old, new=TARGET, ref=ref, capability='report-status',
                         expectedReports=['unpack ok', 'ok ' + ref], remoteMutationPerformed=False))
plan = dict(kind='offline-only-single-original-e5-commit-receive-pack230',
            endpoint='https://github.com/illusion-tech/poms.git/git-receive-pack',
            publicHeaders={'Content-Type':'application/x-git-receive-pack-request','Accept':'application/x-git-receive-pack-result'},
            targetCommit=TARGET, parent=PARENT, tree=TREE,
            originalCommitRawBytes=len(raw), originalCommitRawBytesSha256=hashlib.sha256(raw).hexdigest(),
            pack=dict(file='original-e5-only.pack',bytes=len(pack),objects=1,rawBytesSha256=hashlib.sha256(pack).hexdigest()),
            requests=requests, useExactlyOneRequest=True,
            requiredActualPreconditions=[
                'Root freshly verifies authenticated receive-pack advertisement includes report-status',
                'Remote preloaded part29 is exact 81cb16950c4b87d2ea14e0fd44134ab310bb2a10 and tree 27a0e702ab3e3fd40d1f945f77333f9297c4001b',
                'Remote d6 parent remains available and main/feature exact-old-SHA expectations remain current',
                'Selected request old SHA matches actual advertised ref; zero old SHA requires ref absence',
                'Root supplies authentication through its existing private path; this packet contains no credentials',
            ],
            requiredActualPostconditions=[
                'HTTP success alone is insufficient: require unpack ok and ok for the exact selected ref',
                'Fresh exact-SHA remote ref readback equals original e5 before normal main/feature publication',
                'Temporary refs never merge into main; main/feature receive original e5 only with Root exact-old-SHA lease',
                'Record selected temporary ref final SHA for later exact-lease cleanup',
            ],
            mainOrFeatureMutationInThisPayload=False, rootRefsChanged=False, rootIndexChanged=False,
            credentialsRead=False, networkRequestSent=False,
            note='Locally validated binary protocol candidate. Server acceptance not yet observed. Do not send before part29 preconditions.')
with (OUT / 'final-payload230.json').open('x', encoding='utf-8', newline='\n') as file:
    json.dump(plan, file, indent=2)
    file.write('\n')
print(json.dumps(dict(packBytes=len(pack), packObjects=1, originalCommitExact=True, requestBytes=[item['bytes'] for item in requests], networkRequestSent=False)))
