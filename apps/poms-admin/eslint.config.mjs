import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
    ...baseConfig,
    ...nx.configs['flat/angular'],
    ...nx.configs['flat/angular-template'],
    {
        files: ['**/*.ts'],
        rules: {
            'no-var': 'off',
            '@angular-eslint/component-selector': 'off',
            '@angular-eslint/no-input-rename': 'off',
            '@angular-eslint/no-output-native': 'off',
            '@angular-eslint/prefer-inject': 'off',
            '@typescript-eslint/no-unused-expressions': 'off',
            '@angular-eslint/directive-selector': [
                'error',
                {
                    type: 'attribute',
                    prefix: 'app',
                    style: 'camelCase'
                }
            ],
            
            '@angular-eslint/use-lifecycle-interface': 'warn',
            '@typescript-eslint/ban-ts-comment': 'warn',
            '@typescript-eslint/no-empty-function': 'off',
            '@typescript-eslint/no-inferrable-types': 'off',
            '@typescript-eslint/no-wrapper-object-types': 'off',
            'prefer-const': 'warn'
        }
    },
    {
        files: ['**/*.html'],
        // Override or add rules here
        rules: {
            '@angular-eslint/template/click-events-have-key-events': 'off',
            '@angular-eslint/template/interactive-supports-focus': 'off',
            '@angular-eslint/template/label-has-associated-control': 'off',
            '@angular-eslint/template/alt-text': 'off',
            '@angular-eslint/template/elements-content': 'off',
            '@angular-eslint/template/eqeqeq': 'off',
            '@angular-eslint/template/no-autofocus': 'off',
            '@angular-eslint/template/prefer-control-flow': 'off'
        }
    }
];
