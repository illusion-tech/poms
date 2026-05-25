const fs = require('node:fs');

const envFile = '/srv/poms/test/shared/poms-api.env';

function parseEnvFile(path) {
    if (!fs.existsSync(path)) {
        throw new Error(`Required env file does not exist: ${path}`);
    }

    return Object.fromEntries(
        fs
            .readFileSync(path, 'utf8')
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith('#'))
            .map((line) => {
                const separator = line.indexOf('=');
                if (separator === -1) {
                    throw new Error(`Invalid env line in ${path}: ${line}`);
                }

                const key = line.slice(0, separator).trim();
                const value = line.slice(separator + 1).trim();
                return [key, value];
            })
    );
}

const apiEnv = {
    ...parseEnvFile(envFile),
    NODE_ENV: 'production'
};

module.exports = {
    apps: [
        {
            name: 'poms-api-test',
            cwd: '/srv/poms/test/current/api',
            script: 'main.js',
            exec_mode: 'fork',
            instances: 1,
            autorestart: true,
            max_restarts: 10,
            min_uptime: '10s',
            watch: false,
            time: true,
            out_file: '/srv/poms/test/shared/logs/poms-api-test.out.log',
            error_file: '/srv/poms/test/shared/logs/poms-api-test.error.log',
            env: apiEnv,
            env_production: apiEnv
        }
    ]
};
