import baseConfig from '../../../eslint.config.mjs';

export default [
    ...baseConfig,
    {
        files: ['**/*.json'],
        rules: {
            '@nx/dependency-checks': [
                'error',
                {
                    ignoredFiles: ['{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}']
                }
            ]
        },
        languageOptions: {
            parser: await import('jsonc-eslint-parser')
        }
    },
    {
        files: ['**/*.ts'],
        rules: {
            // vendored 上游风格: 保留字面量类型标注
            '@typescript-eslint/no-inferrable-types': 'off'
        }
    }
];
