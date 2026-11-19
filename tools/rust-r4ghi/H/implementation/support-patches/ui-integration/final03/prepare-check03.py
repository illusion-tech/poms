from pathlib import Path
p=Path(__file__).resolve().parent
s=(p.parent/'check-ui.cjs').read_text(encoding='utf8')
s=s.replace("const before=inputHashes();", "const before=inputHashes();\nconst full=process.argv.includes('--full');")
s=s.replace("const inputFiles=['libs/shared/contracts/src/lib/shared-contracts.ts','libs/shared/contracts/src/lib/rust-r4ghi-contracts.generated.ts','libs/shared/api-client/api/project.service.ts','libs/shared/api-client/api/project-cost.service.ts','libs/shared/api-client/model/create-attachment-upload-session-request.ts'];", """function sourceFiles(directory){return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?sourceFiles(path.join(directory,entry.name)):/\\.(ts|html|json)$/.test(entry.name)?[path.join(directory,entry.name)]:[]);}
const inputFiles=['apps/poms-admin/src','libs/admin/data-access/src','libs/shared/contracts/src','libs/shared/api-client'].flatMap(directory=>sourceFiles(path.join(root,directory))).map(file=>path.relative(root,file).replaceAll('\\\\','/')).sort();""")
s=s.replace("errors:errors.map(e=>", "errors:errors.slice(0,18).map(e=>")
s=s.replace("paths:{...config.options.paths,'@poms/admin-data-access':[path.join(__dirname,'admin-stores.ts')]}", "paths:full?config.options.paths:{...config.options.paths,'@poms/admin-data-access':[path.join(__dirname,'../admin-stores.ts')]}")
s=s.replace("const targets=['project-governance.ts','project-own-condition-tasks.ts','project-receipt-basis-authoring.ts'].map(name=>path.join(root,productDir,name));", "const targets=full?[path.join(root,'apps/poms-admin/src/main.ts')]:['project-governance.ts','project-own-condition-tasks.ts','project-receipt-basis-authoring.ts'].map(name=>path.join(root,productDir,name));")
s=s.replace("'isolated-Angular22-with-real-current-client-and-stores'", "full?'full-app-ngc-with-UI-proposal-overlay':'S5-real-client-UI-trees-ngc'")
s=s.replace("'ngc-current-client-result.json'", "full?'ngc-full03.json':'ngc-ui03.json'")
(p/'check-ui03.cjs').write_text(s,encoding='utf8',newline='\n')
