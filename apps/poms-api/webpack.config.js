const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
    output: {
        path: join(__dirname, '../../dist/apps/poms-api'),
        clean: true,
        ...(process.env.NODE_ENV !== 'production' && {
            devtoolModuleFilenameTemplate: '[absolute-resource-path]'
        })
    },
    resolve: {
        alias: {
            '@poms/api-contracts': join(__dirname, '../../libs/api/contracts/src/index.ts'),
            '@poms/shared-contracts': join(__dirname, '../../libs/shared/contracts/src/index.ts')
        }
    },
    plugins: [
        new NxAppWebpackPlugin({
            target: 'node',
            compiler: 'tsc',
            main: 'apps/poms-api/src/main.ts',
            tsConfig: 'apps/poms-api/tsconfig.app.json',
            useTsconfigPaths: true,
            assets: ['./src/assets'],
            optimization: false,
            outputHashing: 'none',
            generatePackageJson: true,
            sourceMap: true
        })
    ]
};
