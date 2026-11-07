// Isolated H component tests against the frozen generated schema candidate.
const path = require('node:path');
const { createRequire } = require('node:module');
const installed = createRequire('E:/projects/poms/package.json');
const { createCjsPreset } = installed('jest-preset-angular/presets/index.js');
const preset = createCjsPreset();
module.exports = {
    ...preset,
    snapshotSerializers: preset.snapshotSerializers.map((serializer) => installed.resolve(serializer)),
    testEnvironment: installed.resolve('jest-environment-jsdom'),
    rootDir: path.resolve(__dirname, '../../../../..'),
    displayName: 'H-isolated-component-candidate',
    modulePaths: ['E:/projects/poms/node_modules'],
    moduleDirectories: ['node_modules', 'E:/projects/poms/node_modules'],
    cacheDirectory: path.join(__dirname, 'jest-cache'),
    setupFilesAfterEnv: ['<rootDir>/apps/poms-admin/src/test-setup.ts'],
    testMatch: ['<rootDir>/apps/poms-admin/src/app/features/project/project-operating-review.spec.ts'],
    moduleNameMapper: { '^@poms/shared-contracts$': path.join(__dirname, 'ui-contract-harness.ts') },
    transform: { '^.+\\.(ts|js|mjs|html|svg)$': [installed.resolve('jest-preset-angular'), { tsconfig: path.join(__dirname, 'tsconfig.ui-unit.json'), stringifyContentPathRegex: '\\.(html|svg)$' }] }
};
