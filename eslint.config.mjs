import nx from '@nx/eslint-plugin';
import prettierConfig from 'eslint-config-prettier';

export default [
    {
        ignores: [
            '**/dist/**',
            '**/.nx/**',
            '**/node_modules/**',
            // generated OpenAPI client output
            'libs/shared/api-client/**',
        ],
    },
    ...nx.configs['flat/base'],
    ...nx.configs['flat/javascript'],
    ...nx.configs['flat/typescript'],
    {
        files: ['**/*.{ts,tsx,js,jsx}'],
        rules: {
            '@nx/enforce-module-boundaries': [
                'error',
                {
                    enforceBuildableLibDependency: true,
                    allow: [],
                    depConstraints: [
                        // ── type 层级约束（控制纵向依赖方向）──────────────────────────
                        {
                            sourceTag: 'type:app',
                            onlyDependOnLibsWithTags: ['type:data-access', 'type:contracts'],
                        },
                        {
                            sourceTag: 'type:data-access',
                            onlyDependOnLibsWithTags: ['type:generated', 'type:contracts'],
                        },
                        {
                            sourceTag: 'type:generated',
                            onlyDependOnLibsWithTags: [],
                        },
                        {
                            sourceTag: 'type:contracts',
                            onlyDependOnLibsWithTags: ['type:contracts'],
                        },
                        // ── scope 域约束（控制横向跨域依赖）──────────────────────────
                        // admin 前端只能用 admin 自己的库 + 共享库，不能碰 api 专属库
                        {
                            sourceTag: 'scope:admin',
                            onlyDependOnLibsWithTags: ['scope:admin', 'scope:shared'],
                        },
                        // api 后端只能用 api 自己的库 + 共享库，不能碰 admin 专属库
                        {
                            sourceTag: 'scope:api',
                            onlyDependOnLibsWithTags: ['scope:api', 'scope:shared'],
                        },
                        // shared 共享库只能内部自引用，保持纯净、无域依赖
                        {
                            sourceTag: 'scope:shared',
                            onlyDependOnLibsWithTags: ['scope:shared'],
                        },
                    ],
                },
            ],
        },
    },
    prettierConfig,
];

