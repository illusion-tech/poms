// Candidate configuration; loaded only during an explicitly approved cutover.
module.exports = {
    apps: [{
        name: 'poms-api-rust-test',
        cwd: '/srv/poms/test/current/api',
        script: 'poms-api-rust',
        interpreter: 'none',
        exec_mode: 'fork',
        instances: 1,
        autorestart: false,
        watch: false,
        kill_timeout: 12000,
        time: true,
        out_file: '/srv/poms/test/shared/logs/poms-api-rust-test.out.log',
        error_file: '/srv/poms/test/shared/logs/poms-api-rust-test.error.log',
        env: { NODE_ENV: 'production', POMS_ENV_FILE: '/srv/poms/test/shared/poms-api.env' }
    }]
};
