// Explicit new-R2M private IO only. Merely importing this module reads nothing.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const roots = ['/r2m-private', '/home/wangzishi/.local/share/poms-r2m/private'];
export function readPrivateRegular(file, { kind = 'owner' } = {}) {
    assert.equal(process.platform, 'linux');
    const directory = path.dirname(file), name = path.basename(file);
    if (kind === 'owner') assert(roots.includes(directory) && name === 'owner-password');
    else {
        assert.equal(kind, 'journal');
        assert(roots.some(root => directory === root + '/m-runs'));
        assert(/^(nest|rust)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.json$/.test(name));
    }
    for (const parent of kind === 'owner' ? [directory] : [path.dirname(directory), directory]) {
        const stat = fs.lstatSync(parent);
        assert(stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0, 'r2m_private_directory');
    }
    const before = fs.lstatSync(file);
    assert(before.isFile() && !before.isSymbolicLink() && before.nlink === 1 && before.size <= 32 * 1024 * 1024 && (before.mode & 0o077) === 0, 'r2m_private_file');
    const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
    try {
        const opened = fs.fstatSync(fd);
        assert(opened.isFile() && opened.nlink === 1 && opened.dev === before.dev && opened.ino === before.ino && (opened.mode & 0o077) === 0, 'r2m_private_identity');
        const value = fs.readFileSync(fd, 'utf8');
        const after = fs.fstatSync(fd);
        for (const key of ['dev', 'ino', 'size', 'mtimeMs', 'ctimeMs']) assert.equal(opened[key], after[key], 'r2m_private_changed_during_read');
        return value;
    } finally { fs.closeSync(fd); }
}
