"""Passive, bounded loopback PostgreSQL BackendKeyData identity observation.

Only the server's public backend PID is exported. Authentication, SQL payloads
and the four-byte cancellation key never enter a file, hash or output message.
The raw socket is opened as root, then privilege is dropped before any input.
"""
import hashlib
import ctypes
import json
import os
from pathlib import Path
import pwd
import re
import select
import socket
import struct
import sys
import time

ROOT = Path('/home/wangzishi/projects/poms-rust-r2l')
PRIVATE = Path('/home/wangzishi/.local/share/poms-r2l/private')
BINARY = Path('/home/wangzishi/.local/share/poms-r2l/target/release/poms-api-rust')


def kernel_filter_program():
    # Classic BPF. Reject before delivery unless IPv4/TCP server 19432 with
    # both IPv4 endpoints 127.0.0.1, an unfragmented packet and a valid IHL.
    return [(0x28, 0, 0, 12), (0x15, 0, 15, 0x0800),
            (0x30, 0, 0, 23), (0x15, 0, 13, 6),
            (0x20, 0, 0, 26), (0x15, 0, 11, 0x7f000001),
            (0x20, 0, 0, 30), (0x15, 0, 9, 0x7f000001),
            (0x28, 0, 0, 20), (0x45, 7, 0, 0x3fff),
            (0x30, 0, 0, 14), (0x54, 0, 0, 15), (0x35, 0, 4, 5),
            (0xb1, 0, 0, 14), (0x48, 0, 0, 14), (0x15, 0, 1, 19432),
            (0x06, 0, 0, 262144), (0x06, 0, 0, 0)]


def attach_kernel_filter_and_bind(raw_socket, libc):
    class Filter(ctypes.Structure):
        _fields_ = [('code', ctypes.c_ushort), ('jt', ctypes.c_ubyte), ('jf', ctypes.c_ubyte), ('k', ctypes.c_uint)]

    class Program(ctypes.Structure):
        _fields_ = [('length', ctypes.c_ushort), ('filters', ctypes.POINTER(Filter))]

    class LinkAddress(ctypes.Structure):
        _fields_ = [('family', ctypes.c_ushort), ('protocol', ctypes.c_ushort), ('ifindex', ctypes.c_int),
                    ('hatype', ctypes.c_ushort), ('pkttype', ctypes.c_ubyte), ('halen', ctypes.c_ubyte), ('address', ctypes.c_ubyte * 8)]

    instructions = kernel_filter_program()
    filters = (Filter * len(instructions))(*(Filter(*row) for row in instructions))
    program = Program(len(instructions), filters)
    assert libc.setsockopt(raw_socket.fileno(), socket.SOL_SOCKET, 26, ctypes.byref(program), ctypes.sizeof(program)) == 0
    raw_socket.setsockopt(socket.SOL_SOCKET, 44, 1)  # SO_LOCK_FILTER
    address = LinkAddress(socket.AF_PACKET, socket.htons(3), socket.if_nametoindex('lo'), 0, 0, 0)
    assert libc.bind(raw_socket.fileno(), ctypes.byref(address), ctypes.sizeof(address)) == 0
    return {'attachedBeforeProtocolBind': True, 'locked': True,
            'scope': 'IPv4 TCP, 127.0.0.1 both endpoints, unfragmented, server source port 19432',
            'instructionsSha256': hashlib.sha256(json.dumps(instructions).encode()).hexdigest()}


class StartupStream:
    """Finite TCP reassembly up to K; retains startup bytes in memory only."""
    def __init__(self, sequence):
        self.syn = sequence
        self.base = (sequence + 1) & 0xffffffff
        self.bytes = {}
        self.contiguous = bytearray()
        self.read_offset = 0
        self.types = []
        self.negotiation = True
        self.result = None
        self.failure = None

    def reject(self, reason):
        self.failure = reason
        self.bytes.clear()
        self.contiguous.clear()

    def feed(self, sequence, payload):
        if self.result is not None or self.failure is not None:
            return
        offset = (sequence - self.base) & 0xffffffff
        if offset + len(payload) > 131072:
            self.reject('startup-sequence-outside-bounded-window')
            return
        for index, value in enumerate(payload):
            position = offset + index
            previous = self.bytes.get(position)
            if previous is not None and previous != value:
                self.reject('conflicting-TCP-retransmission')
                return
            self.bytes[position] = value
        while self.read_offset in self.bytes:
            self.contiguous.append(self.bytes[self.read_offset])
            self.read_offset += 1
        if self.negotiation and self.contiguous:
            if self.contiguous[0] == ord('S'):
                self.reject('TLS-encrypted-startup-not-observable')
                return
            if self.contiguous[0] == ord('N'):
                del self.contiguous[0]
            self.negotiation = False
        while len(self.contiguous) >= 5:
            kind = self.contiguous[0]
            length = struct.unpack('!I', self.contiguous[1:5])[0]
            if length < 4 or length > 131072 or kind not in b'RENSKZv':
                self.reject('unsupported-or-incomplete-PG-startup-framing')
                return
            if len(self.contiguous) < length + 1:
                return
            self.types.append(chr(kind))
            if len(self.types) > 128:
                self.reject('startup-message-bound-exceeded')
                return
            if kind == ord('K'):
                if length != 12:
                    self.reject('unexpected-BackendKeyData-length')
                    return
                # Do not parse, hash or export the cancellation-key bytes.
                backend_pid = struct.unpack('!I', self.contiguous[5:9])[0]
                if not 0 < backend_pid < 2147483648:
                    self.reject('invalid-backend-PID')
                    return
                self.result = {'backendPid': backend_pid, 'messageType': 'K', 'messageLength': 12,
                               'startupMessageTypes': list(self.types), 'serverSynSequence': self.syn,
                               'cancelKeyParsedOrExported': False, 'payloadRetained': False}
                self.bytes.clear()
                self.contiguous.clear()
                return
            if kind in (ord('E'), ord('Z')):
                self.reject('startup-ended-without-BackendKeyData')
                return
            del self.contiguous[:length + 1]


def identity(pid):
    stat = Path(f'/proc/{pid}/stat').read_text()
    return {'pid': pid, 'startTicks': stat[stat.rfind(')') + 2:].split()[19]}


def rust_sockets(expected, digest):
    pid = expected['pid']
    assert identity(pid) == expected
    assert Path(f'/proc/{pid}/exe').resolve() == BINARY
    assert hashlib.sha256(BINARY.read_bytes()).hexdigest() == digest
    inodes = set()
    for fd in Path(f'/proc/{pid}/fd').iterdir():
        try:
            target = os.readlink(fd)
        except FileNotFoundError:
            continue
        match = re.fullmatch(r'socket:\[(\d+)\]', target)
        if match:
            inodes.add(match[1])
    rows = []
    for line in Path(f'/proc/{pid}/net/tcp').read_text().splitlines()[1:]:
        fields = line.split()
        local_address, local_port = fields[1].split(':')
        remote_address, remote_port = fields[2].split(':')
        if fields[9] in inodes and fields[3] == '01' and remote_address == '0100007F' and int(remote_port, 16) == 19432:
            assert local_address == '0100007F'
            rows.append({'inode': fields[9], 'localPort': int(local_port, 16)})
    assert identity(pid) == expected
    return rows


def write_json(file, value):
    temporary = file.with_name(file.name + '.next')
    fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    try:
        with os.fdopen(fd, 'w') as output:
            json.dump(value, output)
            output.write('\n')
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, file)
        directory = os.open(file.parent, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(directory)
        finally:
            os.close(directory)
    finally:
        if temporary.exists():
            temporary.unlink()


def main():
    tag, build_tag = sys.argv[1:]
    assert re.fullmatch('[a-z0-9-]{1,30}', tag) and re.fullmatch('candidate[0-9]{2}', build_tag)
    assert Path.cwd() == ROOT and os.geteuid() == 0
    account = pwd.getpwnam('wangzishi')
    assert account.pw_uid > 0 and account.pw_gid > 0
    # Protocol zero receives no packets. Install and lock the kernel filter
    # before binding ETH_P_ALL to lo, so no unfiltered queue is ever created.
    raw_socket = socket.socket(socket.AF_PACKET, socket.SOCK_RAW, 0)
    libc = ctypes.CDLL(None, use_errno=True)
    kernel_filter = attach_kernel_filter_and_bind(raw_socket, libc)
    os.setgroups([])
    os.setgid(account.pw_gid)
    os.setuid(account.pw_uid)
    assert os.geteuid() == account.pw_uid
    assert libc.prctl(4, 1, 0, 0, 0) == 0  # same-uid caller can verify worker /proc identity
    assert libc.prctl(38, 1, 0, 0, 0) == 0  # no_new_privs after permanent uid/gid drop
    root_stat = PRIVATE.lstat()
    assert not PRIVATE.is_symlink() and root_stat.st_uid == account.pw_uid and root_stat.st_mode & 0o077 == 0
    directory = PRIVATE / 'pg-backend-identities'
    directory.mkdir(mode=0o700, exist_ok=True)
    assert not directory.is_symlink() and directory.stat().st_mode & 0o077 == 0
    file = directory / (tag + '.json')
    assert not file.exists()
    binding = json.loads((ROOT / f'tmp/rust-r2l/rust-{build_tag}-binary-source.json').read_text())
    digest = binding['binary']['rawBytesSha256']
    assert hashlib.sha256(BINARY.read_bytes()).hexdigest() == digest
    report = {'kind': 'passive-loopback-PG-BackendKeyData-identity-only', 'result': 'ready', 'tag': tag,
              'workerIdentity': identity(os.getpid()), 'uidAfterDrop': os.geteuid(), 'interface': 'lo', 'serverPort': 19432,
              'sourceSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), 'revision': 0, 'proofs': [],
              'kernelFilter': kernel_filter,
              'payloadsOrCancelKeysPersisted': False, 'deadlineSeconds': 280, 'closeout': None}
    write_json(file, report)
    print(json.dumps({'result': 'ready', 'file': str(file), 'workerIdentity': report['workerIdentity']}), flush=True)
    started = time.monotonic()
    streams = {}
    inputs = b''
    pending_admission = None
    try:
        while time.monotonic() - started < 280:
            readable, _, _ = select.select([raw_socket, 0], [], [], 0.1)
            if 0 in readable:
                chunk = os.read(0, 65536)
                if not chunk:
                    report['closeout'] = 'stdin-EOF'
                    break
                inputs += chunk
                assert len(inputs) < 65536
                while b'\n' in inputs:
                    line, inputs = inputs.split(b'\n', 1)
                    request = json.loads(line)
                    if request == {'stop': True}:
                        report['closeout'] = 'owned-caller-stop'
                        return
                    assert set(request) == {'admit'}
                    expected = request['admit']
                    assert set(expected) == {'pid', 'startTicks'}
                    assert pending_admission is None
                    pending_admission = (expected, time.monotonic() + 5)
            if raw_socket in readable:
                packet = raw_socket.recv(262144)
                if len(packet) < 54 or packet[12:14] != b'\x08\x00':
                    continue
                ip = packet[14:]
                if ip[0] >> 4 != 4 or ip[9] != 6 or ip[12:16] != b'\x7f\x00\x00\x01' or ip[16:20] != b'\x7f\x00\x00\x01':
                    continue
                ip_length = (ip[0] & 15) * 4
                if len(ip) < ip_length + 20:
                    continue
                tcp = ip[ip_length:]
                server_port, local_port, sequence = struct.unpack('!HHI', tcp[:8])
                if server_port != 19432:
                    continue
                if struct.unpack('!H', ip[6:8])[0] & 0x3fff:
                    raise AssertionError('Fragmented PG startup is not an identity certificate')
                header_length = (tcp[12] >> 4) * 4
                assert header_length >= 20
                flags = tcp[13]
                if flags & 0x12 == 0x12:
                    previous = streams.get(local_port)
                    if previous is None:
                        assert len(streams) < 128
                        streams[local_port] = StartupStream(sequence)
                    elif previous.syn != sequence:
                        previous.reject('ephemeral-port-reuse-ambiguous')
                payload = tcp[header_length:struct.unpack('!H', ip[2:4])[0] - ip_length]
                if payload and local_port in streams:
                    streams[local_port].feed(sequence, payload)
            if pending_admission is not None:
                expected, deadline = pending_admission
                sockets = rust_sockets(expected, digest)
                assert sockets
                assert all(not streams[row['localPort']].failure for row in sockets if row['localPort'] in streams)
                if all(row['localPort'] in streams and streams[row['localPort']].result is not None for row in sockets):
                    proofs = [{**row, **streams[row['localPort']].result, 'ownedRustProcess': expected} for row in sockets]
                    assert len({row['backendPid'] for row in proofs}) == len(proofs)
                    report['proofs'] = proofs
                    report['revision'] += 1
                    write_json(file, report)
                    pending_admission = None
                else:
                    assert time.monotonic() < deadline, 'No complete original backend key for owned Rust socket'
        else:
            report['closeout'] = 'bounded-deadline'
    except Exception as error:
        report['result'] = 'fail'
        report['failure'] = {'name': type(error).__name__, 'message': str(error)}
        raise
    finally:
        raw_socket.close()
        report['result'] = 'closed' if report['result'] != 'fail' else 'fail'
        report['revision'] += 1
        report['rawSocketClosed'] = True
        write_json(file, report)
        print(json.dumps({'result': report['result'], 'file': str(file), 'closeout': report['closeout']}), flush=True)


if __name__ == '__main__':
    main()
