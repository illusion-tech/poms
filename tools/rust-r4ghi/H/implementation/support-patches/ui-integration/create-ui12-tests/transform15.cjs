const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const root='E:/projects/worktrees/poms-r3hijk-next28/poms',rootRequire=createRequire(path.join(root,'package.json'));
const angular=rootRequire('jest-preset-angular').default;
function overlay(source,file){const rel=path.relative(root,file),candidate=path.join(__dirname,'proposed',rel);return !rel.startsWith('..')&&fs.existsSync(candidate)?fs.readFileSync(candidate,'utf8'):source;}
exports.createTransformer=(options)=>{
    const transformer=angular.createTransformer(options),process=transformer.process.bind(transformer),key=transformer.getCacheKey.bind(transformer);
    transformer.process=(source,file,...args)=>process(overlay(source,file),file,...args);
    transformer.getCacheKey=(source,file,...args)=>key(overlay(source,file),file,...args);
    return transformer;
};
