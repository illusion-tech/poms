const path = require('node:path');

module.exports = {
    rootDir: path.resolve(__dirname, '../..'),
    testEnvironment: 'node',
    roots: ['<rootDir>/tools/rust-r0f-auth-compat', '<rootDir>/apps/poms-api/src', '<rootDir>/libs/api/contracts/src', '<rootDir>/libs/shared/contracts/src', '<rootDir>/libs/vendor/nestjs-zod/src'],
    modulePathIgnorePatterns: ['<rootDir>/apps/poms-api/src/config/load-env.ts'],
    testMatch: ['<rootDir>/tools/rust-r0f-auth-compat/oracle.spec.ts'],
    transform: {
        '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tools/rust-r0f-auth-compat/tsconfig.json', diagnostics: true }]
    },
    moduleNameMapper: {
        '^@poms/shared-contracts$': '<rootDir>/libs/shared/contracts/src/index.ts',
        '^@poms/api-contracts$': '<rootDir>/libs/api/contracts/src/index.ts',
        '^@poms/vendor-nestjs-zod$': '<rootDir>/libs/vendor/nestjs-zod/src/index.ts',
        '^@mikro-orm/(core|postgresql)$': '<rootDir>/apps/poms-api/src/test-utils/mikro-orm.mock.ts',
        '^@mikro-orm/nestjs$': '<rootDir>/apps/poms-api/src/test-utils/mikro-orm-nestjs.mock.ts',
        '^\\.\\./\\.\\./\\.\\./config/load-env$': '<rootDir>/tools/rust-r0f-auth-compat/support/env.mock.ts'
    },
    collectCoverage: false,
    watchman: false,
    maxWorkers: 1,
    verbose: false
};
