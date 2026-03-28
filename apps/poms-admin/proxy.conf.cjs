const apiTarget = process.env.POMS_API_PROXY_TARGET ?? 'http://127.0.0.1:3333';

module.exports = {
    '/api': {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
        logLevel: 'warn'
    }
};
