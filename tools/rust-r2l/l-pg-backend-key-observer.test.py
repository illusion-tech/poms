"""Controlled byte counterexamples; no socket, DB, process or privilege use."""
import importlib.util
import json
from pathlib import Path
import struct
import unittest
spec = importlib.util.spec_from_file_location('observer', Path(__file__).with_name('l-pg-backend-key-observer.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def message(kind, body):
    return kind + struct.pack('!I', len(body) + 4) + body


class StartupIdentity(unittest.TestCase):
    def test_kernel_filter_rejects_every_nonfixture_direction_before_delivery(self):
        def packet(port=19432, protocol=6, source=b'\x7f\0\0\1', destination=b'\x7f\0\0\1', fragment=0, ihl=5):
            ethernet = bytearray(14)
            ethernet[12:14] = b'\x08\x00'
            ip = bytearray(ihl * 4)
            ip[0] = 0x40 + ihl
            ip[9] = protocol
            ip[6:8] = struct.pack('!H', fragment)
            ip[12:16], ip[16:20] = source, destination
            tcp = bytearray(20)
            tcp[0:2] = struct.pack('!H', port)
            tcp[2:4] = struct.pack('!H', 19432 if port != 19432 else 42000)
            return bytes(ethernet + ip + tcp)

        def accepts(data):
            pc, accumulator, index = 0, 0, 0
            instructions = module.kernel_filter_program()
            while pc < len(instructions):
                code, yes, no, operand = instructions[pc]
                if code in (0x28, 0x30, 0x20, 0x48, 0xb1):
                    offset = operand + (index if code == 0x48 else 0)
                    length = 1 if code in (0x30, 0xb1) else 4 if code == 0x20 else 2
                    if offset + length > len(data):
                        return False
                    value = int.from_bytes(data[offset:offset + length], 'big')
                    if code == 0xb1:
                        index = (value & 15) * 4
                    else:
                        accumulator = value
                elif code == 0x54:
                    accumulator &= operand
                elif code in (0x15, 0x45, 0x35):
                    passed = accumulator == operand if code == 0x15 else bool(accumulator & operand) if code == 0x45 else accumulator >= operand
                    pc += yes if passed else no
                elif code == 0x06:
                    return operand > 0
                else:
                    raise AssertionError('Unreviewed filter instruction')
                pc += 1
            return False

        self.assertTrue(accepts(packet()))
        self.assertTrue(accepts(packet(ihl=6)))
        for invalid in [packet(port=19433), packet(protocol=17), packet(source=b'\x7f\0\0\2'),
                        packet(destination=b'\x0a\0\0\1'), packet(fragment=0x2000), packet(fragment=1), packet()[:35], b'']:
            self.assertFalse(accepts(invalid))

    def test_split_out_of_order_retransmission_identity_and_no_secret_export(self):
        # Synthetic public fixture words only; never an actual backend key.
        payload = b'N' + message(b'R', struct.pack('!I', 0)) + message(b'S', b'application_name\0poms-api-rust\0') + message(b'K', struct.pack('!II', 321, 0x12345678))
        stream = module.StartupStream(100)
        stream.feed(111, payload[10:])
        self.assertIsNone(stream.result)
        stream.feed(101, payload[:10])
        stream.feed(101, payload[:10])
        self.assertEqual(stream.result['backendPid'], 321)
        self.assertEqual(stream.result['startupMessageTypes'], ['R', 'S', 'K'])
        self.assertNotIn(str(0x12345678), json.dumps(stream.result))
        self.assertEqual(stream.bytes, {})
        self.assertEqual(stream.contiguous, bytearray())

    def test_tls_is_not_a_certificate(self):
        stream = module.StartupStream(20)
        stream.feed(21, b'S')
        self.assertEqual(stream.failure, 'TLS-encrypted-startup-not-observable')
        self.assertIsNone(stream.result)

    def test_conflicting_retransmission_rejected(self):
        stream = module.StartupStream(10)
        stream.feed(15, b'ab')
        stream.feed(15, b'ac')
        self.assertEqual(stream.failure, 'conflicting-TCP-retransmission')

    def test_incomplete_or_invalid_key_is_not_a_certificate(self):
        for payload in [message(b'K', struct.pack('!I', 321)), message(b'K', struct.pack('!II', 0, 1)), message(b'Z', b'I')]:
            stream = module.StartupStream(1)
            stream.feed(2, payload)
            self.assertIsNone(stream.result)
            self.assertIsNotNone(stream.failure)
        stream = module.StartupStream(1)
        stream.feed(2, message(b'K', struct.pack('!II', 321, 1))[:-1])
        self.assertIsNone(stream.result)

    def test_sequence_and_frame_bounds_reject(self):
        for sequence, payload in [(200000, b'a'), (2, b'R' + struct.pack('!I', 200000))]:
            stream = module.StartupStream(1)
            stream.feed(sequence, payload)
            self.assertIsNotNone(stream.failure)
            self.assertIsNone(stream.result)


if __name__ == '__main__':
    unittest.main()
