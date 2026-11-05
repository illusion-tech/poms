// Same frozen I/O protocol; only the output namespace differs from original125.
export * from './io125.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { PRIVATE103, PUBLIC103, sha103 } from './io125.mjs';
export async function createOutput103(edition) {
    assert(/^[0-9]+[a-z]?$/.test(edition));
    const priv = PRIVATE103 + '/cleanup-wrapper125a-' + edition, pub = PUBLIC103 + '/cleanup-wrapper125a-' + edition;
    await fs.mkdir(priv, { mode: 0o700 }); await fs.mkdir(pub);
    async function write(where, name, value) {
        assert(/^[a-zA-Z0-9-]+$/.test(name));
        const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n'), file = where + '/' + name + '.json';
        await fs.writeFile(file, bytes, { flag: 'wx', mode: 0o600 });
        return { file, bytes: bytes.length, rawBytesSha256: sha103(bytes) };
    }
    return { priv, pub, private: (name, value) => write(priv, name, value), public: (name, value) => write(pub, name, value) };
}
