"""Read-only metadata after the dedicated K services have stopped."""
import datetime
import json
import os
from pathlib import Path
import subprocess

root = Path('/home/wangzishi/projects/poms-rust-r2k')
assert Path.cwd() == root
out = root / 'tmp/rust-r2k/environment-final-stop01.json'
assert not out.exists()

def command(*args):
    return subprocess.check_output(args, text=True).strip()

containers = []
for name in ['poms-r0e-pg15', 'poms-r2ij-pg15', 'poms-r2l1-pg15', 'poms-r2k-pg15']:
    value = command('podman', '--cgroup-manager=cgroupfs', 'inspect', '--format',
                    '{{.Name}}|{{.State.Status}}|{{.Image}}|{{index .Config.Labels "org.poms.scope"}}', name)
    actual, status, image, scope = value.split('|')
    assert actual == name and status == 'exited'
    containers.append(dict(name=name, status=status, image=image, scope=scope))
ports = [18432, 8700, 8701, 8800, 8900]
listeners = command('ss', '-H', '-ltn', ' or '.join(f'sport = :{port}' for port in ports))
assert not listeners
volume = command('podman', '--cgroup-manager=cgroupfs', 'volume', 'inspect', '--format',
                 '{{.Name}}|{{index .Labels "org.poms.scope"}}', 'poms-r2k-pg15-data')
assert volume == 'poms-r2k-pg15-data|rust-r2k'
private = Path('/home/wangzishi/.local/share/poms-r2k/private')
assert private.is_dir() and not private.is_symlink() and (private.stat().st_mode & 0o777) == 0o700
report = dict(formatVersion=1, result='pass', kind='K-final-stopped-readonly-metadata',
              at=datetime.datetime.now(datetime.timezone.utc).isoformat(), containers=containers,
              ports=ports, fivePortsFree=True, oldContainersUnchanged=True,
              oldContainerBoundary='All three original named containers remain exited; no start/stop/update performed by this audit.',
              privateRetained=True, privateBytesRead=False, volumeRetained=True,
              productDmlStatements=0, windowsPg17='Separate Windows service metadata receipt; no Windows SQL or service mutation.')
out.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(dict(result='pass', file=str(out.relative_to(root)), fivePortsFree=True)))
