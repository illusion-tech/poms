// Isolate public dependency source caches. Never copy credentials or old private runtime data.
import fs from 'node:fs';
import assert from 'node:assert/strict';
assert.equal(process.platform, 'linux');
const source = '/home/wangzishi/projects/poms-rust-r4abc/tmp/rust-r4abc/cargo-home';
const destination = '/home/wangzishi/.cache/poms-r4def-cargo-home';
const marker = destination + '/poms-r4def-cache.json';
if (fs.existsSync(destination)) {
    assert(fs.existsSync(marker)); const value = JSON.parse(fs.readFileSync(marker, 'utf8'));
    assert(value.kind === 'R4-DEF-public-Cargo-source-cache' && value.complete);
    console.log(JSON.stringify({ cargoHome: destination, reused: true, oldPrivateRead: false }));
} else {
    fs.mkdirSync(destination, { recursive: false });
    const value = { kind: 'R4-DEF-public-Cargo-source-cache', source, destination, directories: ['git', 'registry'], credentialsCopied: false, oldPrivateRead: false, complete: false };
    fs.writeFileSync(marker, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
    for (const name of value.directories) { assert(fs.statSync(source + '/' + name).isDirectory()); fs.cpSync(source + '/' + name, destination + '/' + name, { recursive: true, force: false, errorOnExist: true, preserveTimestamps: true }); }
    value.complete = true; fs.writeFileSync(marker, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
    console.log(JSON.stringify({ cargoHome: destination, complete: true, directories: value.directories, oldPrivateRead: false, credentialsCopied: false }));
}
