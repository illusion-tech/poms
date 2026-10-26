// Private IPC anchor. It remains alive after an early backend exit so its
// owner can verify and terminate the same process tree without adopting PIDs.
const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');
let configured = false;
let releasing = false;
let backend;
let runId;
const keepAlive = setInterval(() => undefined, 1000);
const report = (message) => {
    if (process.connected) process.send({ ...message, runId });
};
process.on('SIGTERM', () => {
    // The Linux owner signals the entire process group. Keep this anchor alive
    // until descendants have drained or the owner applies its force deadline.
});
process.on('message', (message) => {
    if (message?.type === 'release' && message.runId === runId && configured) {
        releasing = true;
        clearInterval(keepAlive);
        process.exit(0);
    }
    if (configured || message?.type !== 'start' || typeof message.runId !== 'string') return;
    configured = true;
    runId = message.runId;
    backend = spawn(message.executable, message.args, {
        cwd: message.cwd,
        env: { ...message.env, POMS_E2E_RUN_ID: runId },
        windowsHide: true,
        stdio: ['ignore', 'inherit', 'inherit']
    });
    backend.once('spawn', () => report({ type: 'backend-spawned', pid: backend.pid }));
    backend.once('error', () => report({ type: 'backend-error' }));
    backend.once('exit', (code, signal) => report({ type: 'backend-exit', code, signal }));
});
process.on('disconnect', () => {
    if (releasing) return;
    // Parent death is also an owned cleanup path; no external PID is read.
    if (process.platform === 'win32') {
        const taskkill = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'taskkill.exe');
        spawnSync(taskkill, ['/PID', String(process.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
        process.exit(1);
    }
    try {
        process.kill(-process.pid, 'SIGTERM');
    } catch {
        /* Already gone. */
    }
    setTimeout(() => {
        try {
            process.kill(-process.pid, 'SIGKILL');
        } catch {
            process.exit(1);
        }
    }, 1000);
});
