"""Build against extracted Debian 12 headers/libs without installing host packages."""
import argparse
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--packages', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--cargo-home', type=Path, required=True)
parser.add_argument('--source-revision', required=True, help='Actual host Git HEAD; Windows worktree pointers cannot be read by WSL Git')
args = parser.parse_args()
if not re.fullmatch(r'[0-9a-f]{40}', args.source_revision):
    raise SystemExit('Pass the actual full host Git revision')
repo = Path(__file__).resolve().parents[2]
output = args.output.resolve()
if output.exists():
    raise SystemExit('Use a new output directory; all previous results are retained')
packages = sorted(args.packages.resolve().glob('*.deb'))
expected = {'libc6', 'libc6-dev', 'linux-libc-dev', 'libgcc-s1'}
observed = set()
for package in packages:
    fields = subprocess.check_output(['dpkg-deb', '-f', str(package), 'Package', 'Version', 'Architecture'], text=True)
    metadata = dict(line.split(': ', 1) for line in fields.splitlines())
    name = metadata['Package']
    if name not in expected or name in observed or metadata['Architecture'] != 'amd64':
        raise SystemExit('Unexpected or duplicate sysroot package')
    if name in {'libc6', 'libc6-dev'} and not metadata['Version'].startswith('2.36-'):
        raise SystemExit('Debian 12 glibc 2.36 is required')
    observed.add(name)
    print(fields.strip(), flush=True)
if observed != expected:
    raise SystemExit('The four Debian sysroot/runtime packages are required')
output.mkdir(parents=True)
sysroot = output / 'sysroot'
sysroot.mkdir()
for package in packages:
    subprocess.run(['dpkg-deb', '-x', str(package), str(sysroot)], check=True)
compiler = output / 'cc-bookworm'
compiler.write_text('#!/bin/sh\nexec /usr/bin/gcc --sysroot=' + shlex.quote(str(sysroot)) + ' "$@"\n')
compiler.chmod(0o755)
# Debian's package contains an absolute symlink. Address its actual extracted
# target explicitly; never replace or install a loader in the host filesystem.
loader = sysroot / 'lib/x86_64-linux-gnu/ld-linux-x86-64.so.2'
libraries = ':'.join(str(sysroot / path) for path in ['lib/x86_64-linux-gnu', 'usr/lib/x86_64-linux-gnu'])
probe = output / 'strtol-probe.c'
probe.write_text('#include <stdio.h>\n#include <stdlib.h>\nint main(void){printf("%ld\\n",strtol("12345",NULL,10));return 0;}\n')
subprocess.run([str(compiler), '-D_GNU_SOURCE', '-std=gnu17', str(probe), '-o', str(output / 'strtol-probe')], check=True)
assert subprocess.check_output([str(loader), '--library-path', libraries, str(output / 'strtol-probe')], text=True).strip() == '12345'
env = dict(os.environ, CARGO_HOME=str(args.cargo_home.resolve()), CARGO_TARGET_DIR=str(output / 'target'), CARGO_BUILD_JOBS='2', CC=str(compiler), CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_LINKER=str(compiler))
cargo = str(Path.home() / '.cargo/bin/cargo')
command = [cargo, '+1.99.1', 'build', '--manifest-path', str(repo / 'apps/poms-api-rust/Cargo.toml'), '--offline', '--locked', '--release', '--target', 'x86_64-unknown-linux-gnu']
print('Building normal release profile against extracted glibc 2.36', flush=True)
with (output / 'build.log').open('x') as log:
    subprocess.run(command, cwd=repo, env=env, stdout=log, stderr=subprocess.STDOUT, check=True)
binary = output / 'poms-api-rust'
shutil.copy2(output / 'target/x86_64-unknown-linux-gnu/release/poms-api-rust', binary)
versions = subprocess.check_output(['readelf', '--version-info', str(binary)], text=True)
(output / 'elf-versions.txt').write_text(versions)
required = sorted(set(re.findall(r'Name: (GLIBC_([0-9.]+))', versions)), key=lambda match: tuple(map(int, match[1].split('.'))))
if not required or tuple(map(int, required[-1][1].split('.'))) > (2, 36):
    raise SystemExit('The candidate still requires a newer glibc; retained without publishing')
document = subprocess.check_output([str(loader), '--library-path', libraries, str(binary), '--openapi'], text=True)
(output / 'openapi.json').write_text(document)
actual = json.loads(document)
canonical = json.loads((repo / 'libs/shared/api-spec/openapi.json').read_text())
def operations(spec):
    return sorted((method, path, value['operationId']) for path, methods in spec['paths'].items() for method, value in methods.items() if method in {'get', 'post', 'put', 'patch', 'delete', 'head', 'options'})
assert operations(actual) == operations(canonical), 'Release operations differ from the shared spec'
revision = args.source_revision
(output / 'build.txt').write_text('source=' + revision + '\nprofile=release\ntarget=x86_64-unknown-linux-gnu\nrequired_glibc=' + required[-1][1] + '\noperations=' + str(len(operations(actual))) + '\n')
print(json.dumps({'releaseBuilt': True, 'binary': str(binary), 'requiredGlibc': required[-1][1], 'operations': len(operations(actual)), 'source': revision}), flush=True)
