const path=require('node:path');
const proposed=path.join(__dirname,'proposed'),root='E:/projects/worktrees/poms-r3hijk-next28/poms';
module.exports=(request,options)=>{
    try{return options.defaultResolver(request,options);}
    catch(error){const relative=path.relative(proposed,options.basedir);if(request.startsWith('.')&&!relative.startsWith('..'))return options.defaultResolver(request,{...options,basedir:path.join(root,relative)});throw error;}
};
