const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../../../..');
const ts = createRequire(path.join(root, 'package.json'))('typescript');
const relative = 'apps/poms-api/src/types/mikro-orm-schema.d.ts';
const virtual = path.join(root, relative);
const candidate = path.join(__dirname, 'native-schema-types-candidate26', relative);
const overlay = process.argv.includes('--candidate');
const negative = process.argv.includes('--negative');
const negativePath = path.join(root, 'apps/poms-api/src/types/__schema_type_negative_probe26.ts');
const negativeText = "import { PomsSchemaGenerator } from '../app/core/persistence/poms-schema-generator';\nnew PomsSchemaGenerator('invalid entity manager');\nnew PomsSchemaGenerator();\n";
const configPath = path.join(root, 'apps/poms-api/tsconfig.app.json');
const read = ts.readConfigFile(configPath, ts.sys.readFile);
if (read.error) throw new Error(ts.flattenDiagnosticMessageText(read.error.messageText, '\n'));
const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, path.dirname(configPath));
const options = { ...parsed.options, noEmit: true };
const host = ts.createCompilerHost(options);
const originalRead = host.readFile.bind(host);
const originalExists = host.fileExists.bind(host);
host.readFile = (file) => negative && path.resolve(file) === negativePath ? negativeText : overlay && path.resolve(file) === virtual ? fs.readFileSync(candidate, 'utf8') : originalRead(file);
host.fileExists = (file) => negative && path.resolve(file) === negativePath || overlay && path.resolve(file) === virtual ? true : originalExists(file);
const originalSource = host.getSourceFile.bind(host);
host.getSourceFile = (file, version, ...args) => negative && path.resolve(file) === negativePath || overlay && path.resolve(file) === virtual
    ? ts.createSourceFile(file, host.readFile(file), version, true)
    : originalSource(file, version, ...args);
const roots = [...parsed.fileNames, ...(overlay ? [virtual] : []), ...(negative ? [negativePath] : [])];
const schemaEntry = ts.resolveModuleName('@mikro-orm/core/schema', path.join(root, 'node_modules/@mikro-orm/postgresql/index.d.ts'), options, host).resolvedModule;
const program = ts.createProgram(roots, options, host);
const diagnostics = ts.getPreEmitDiagnostics(program);
const sourcePins = program.getSourceFiles().filter((file) => !file.isDeclarationFile && path.resolve(file.fileName).startsWith(root + path.sep) && path.resolve(file.fileName) !== negativePath).map((file) => ({ file: path.relative(root, file.fileName).replaceAll('\\', '/'), sha256: crypto.createHash('sha256').update(fs.readFileSync(file.fileName)).digest('hex') }));
const checker = program.getTypeChecker();
const implementation = program.getSourceFile(path.join(root, 'apps/poms-api/src/app/core/persistence/poms-schema-generator.ts'));
const declaration = implementation.statements.find((node) => ts.isClassDeclaration(node) && node.name.text === 'PomsSchemaGenerator');
const classType = checker.getTypeAtLocation(declaration);
const constructorType = checker.getTypeOfSymbolAtLocation(checker.getSymbolAtLocation(declaration.name), declaration);
const constructorSignatures = checker.getSignaturesOfType(constructorType, ts.SignatureKind.Construct);
const parameterType = constructorSignatures[0]?.parameters[0] && checker.getTypeOfSymbolAtLocation(constructorSignatures[0].parameters[0], declaration);
const inherited = Object.fromEntries(['config', 'platform'].map((name) => {
    const property = classType.getProperty(name);
    const type = property && checker.getTypeOfSymbolAtLocation(property, declaration);
    return [name, { present: !!property, type: type && checker.typeToString(type), isAny: !!type && !!(type.flags & ts.TypeFlags.Any) }];
}));
const result = {
    kind: 'actual-full-Native-app-tsconfig-VFS-candidate-typecheck-no-emit',
    candidate: overlay, negativeProbe: negative, typescript: ts.version, rootCount: roots.length, sourceCount: sourcePins.length,
    module: ts.ModuleKind[options.module], moduleResolution: ts.ModuleResolutionKind[options.moduleResolution],
    skipLibCheckUnchangedFromApp: options.skipLibCheck,
    schemaPublicSubpathPhysicalResolution: schemaEntry?.resolvedFileName ?? null,
    realSignatureEvidence: { constructorSignatureCount: constructorSignatures.length, constructorParameter: parameterType && checker.typeToString(parameterType), constructorParameterIsAny: !!parameterType && !!(parameterType.flags & ts.TypeFlags.Any), inherited },
    diagnostics: diagnostics.map((error) => ({ code: error.code, file: error.file?.fileName, text: ts.flattenDiagnosticMessageText(error.messageText, '\n') })),
    sourcePins, noEmit: true, SQLExecuted: false, G3Certified: false
};
fs.writeFileSync(path.join(__dirname, negative ? 'native-schema-types-negative26.json' : overlay ? 'native-schema-types-candidate26.json' : 'native-schema-types-base26.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ candidate: overlay, roots: roots.length, sources: sourcePins.length, resolution: result.moduleResolution, diagnostics: result.diagnostics }));
if (diagnostics.length) process.exitCode = 1;
