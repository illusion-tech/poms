const { createCjsPreset } = require('jest-preset-angular/presets/index.js');

const config = {
    ...createCjsPreset(),
    displayName: 'poms-admin',
    preset: '../../jest.preset.js',
    setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
    coverageDirectory: '../../coverage/apps/poms-admin'
};

module.exports = config;
