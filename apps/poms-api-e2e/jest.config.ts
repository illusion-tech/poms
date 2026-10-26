// eslint-disable-next-line @nx/enforce-module-boundaries -- E1: E2E-only shared owned-process test tool; no production boundary change.
import { resolveApiPlan } from '../../tools/e2e/api-server.cjs';

const { suite } = resolveApiPlan();

export default {
    displayName: 'poms-api-e2e',
    preset: '../../jest.preset.js',
    roots: ['<rootDir>/src'],
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
    testMatch: suite === 'foundation' ? ['**/foundation.e2e-spec.ts'] : ['**/*.e2e-spec.ts'],
    testPathIgnorePatterns: suite === 'nest-full' ? ['/foundation\\.e2e-spec\\.ts$'] : [],
    passWithNoTests: false,
    moduleFileExtensions: ['ts', 'js', 'html'],
    coverageDirectory: '../../coverage/poms-api-e2e'
};
