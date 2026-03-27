export default {
    displayName: 'poms-api-e2e',
    preset: '../../jest.preset.js',
    globalSetup: '<rootDir>/src/support/global-setup.ts',
    globalTeardown: '<rootDir>/src/support/global-teardown.ts',
    setupFiles: ['<rootDir>/src/support/test-setup.ts'],
    testEnvironment: 'node',
    transform: {
        '^.+\\.[tj]s$': [
            'ts-jest',
            {
                tsconfig: '<rootDir>/tsconfig.spec.json'
            }
        ]
    },
    testMatch: ['<rootDir>/src/**/*.e2e-spec.ts'],
    moduleFileExtensions: ['ts', 'js', 'html'],
    coverageDirectory: '../../coverage/poms-api-e2e'
};
