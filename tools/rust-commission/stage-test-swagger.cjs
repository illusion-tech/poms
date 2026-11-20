const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

function resolveDependency(requireRelease, name) {
    try {
        return requireRelease.resolve(name);
    } catch (error) {
        if (error.code !== 'MODULE_NOT_FOUND') throw error;
        return createRequire(requireRelease.resolve('@nestjs/swagger')).resolve(name);
    }
}

function stageSwagger(specFile, destination, packageFile = path.resolve(__dirname, '../../package.json')) {
    const requireRelease = createRequire(path.resolve(packageFile));
    const assets = path.dirname(resolveDependency(requireRelease, 'swagger-ui-dist'));
    const yaml = require(resolveDependency(requireRelease, 'js-yaml'));
    const json = fs.readFileSync(specFile);
    const spec = JSON.parse(json);
    assert(typeof spec.openapi === 'string' && Object.keys(spec.paths ?? {}).length > 0, 'Expected the exported OpenAPI document');
    const yamlSpec = yaml.dump(spec, { lineWidth: -1 });
    assert.deepEqual(yaml.load(yamlSpec), spec);

    fs.mkdirSync(destination);
    const ui = path.join(destination, 'api-docs');
    fs.mkdirSync(ui);
    fs.writeFileSync(path.join(destination, 'openapi.json'), json, { flag: 'wx' });
    fs.writeFileSync(path.join(destination, 'openapi.yaml'), yamlSpec, { flag: 'wx' });
    for (const name of ['swagger-ui.css', 'swagger-ui-bundle.js', 'swagger-ui-standalone-preset.js', 'favicon-32x32.png', 'LICENSE', 'NOTICE']) {
        fs.copyFileSync(path.join(assets, name), path.join(ui, name), fs.constants.COPYFILE_EXCL);
    }
    fs.writeFileSync(path.join(ui, 'index.html'), [
        '<!doctype html>',
        '<html lang="zh-Hans">',
        '<head>',
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        '<title>POMS API</title>',
        '<link rel="icon" href="./favicon-32x32.png">',
        '<link rel="stylesheet" href="./swagger-ui.css">',
        '</head>',
        '<body>',
        '<div id="swagger-ui"></div>',
        '<script defer src="./swagger-ui-bundle.js"></script>',
        '<script defer src="./swagger-ui-standalone-preset.js"></script>',
        '<script defer src="./swagger-ui-init.js"></script>',
        '</body>',
        '</html>',
        '',
    ].join('\n'), { flag: 'wx' });
    fs.writeFileSync(path.join(ui, 'swagger-ui-init.js'), [
        'SwaggerUIBundle({',
        "    url: '/api-docs-json',",
        "    dom_id: '#swagger-ui',",
        '    validatorUrl: null,',
        '    presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],',
        "    layout: 'StandaloneLayout'",
        '});',
        '',
    ].join('\n'), { flag: 'wx' });
}

if (require.main === module) {
    const [spec, destination, packageFile] = process.argv.slice(2);
    if (!spec || !destination) throw new Error('Usage: stage-test-swagger.cjs <openapi.json> <new destination directory> [api package.json]');
    stageSwagger(spec, destination, packageFile);
}
module.exports = { stageSwagger };
