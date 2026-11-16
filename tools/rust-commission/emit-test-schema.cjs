// Emit the application's actual migration up() SQL for an empty test database.
// No database access, seeds, migration down(), or acceptance-framework state.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
class Migration {
  statements = [];
  addSql(sql) {
    if (typeof sql !== 'string') throw new Error('Expected migration SQL text');
    this.statements.push(sql);
  }
}
(async () => {
  const directory = path.join(root, 'apps/poms-api/src/migrations');
  const output = ['BEGIN;'];
  for (const name of fs.readdirSync(directory).filter(n => /^Migration.*\.ts$/.test(n)).sort()) {
    const source = fs.readFileSync(path.join(directory, name), 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
    }}).outputText;
    const exports = {};
    vm.runInNewContext(code, { exports, require(name) {
      if (name !== '@mikro-orm/migrations') throw new Error(`Unexpected migration import: ${name}`);
      return { Migration };
    }}, { filename: name, timeout: 1000 });
    const constructors = Object.values(exports).filter(value => typeof value === 'function' && value.prototype instanceof Migration);
    if (constructors.length !== 1) throw new Error(`Expected one migration: ${name}`);
    const migration = new constructors[0]();
    await migration.up();
    output.push(`-- ${name}`, ...migration.statements);
  }
  process.stdout.write(output.concat('COMMIT;').join('\n') + '\n');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
