process.on('SIGTERM', () => undefined);
if (process.send) process.send({ ready: true });
setInterval(() => undefined, 1000);
