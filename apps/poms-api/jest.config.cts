module.exports = {
    displayName: 'poms-api',
    preset: '../../jest.preset.js',
    testEnvironment: 'node',
    transform: {
        '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }]
    },
    moduleFileExtensions: ['ts', 'js', 'html'],
    coverageDirectory: '../../coverage/apps/poms-api',
    moduleNameMapper: {
        '^@mikro-orm/core$': '<rootDir>/src/test-utils/mikro-orm.mock.ts'
    }
};
