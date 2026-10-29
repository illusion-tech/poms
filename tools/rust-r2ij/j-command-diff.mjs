import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const tag=process.argv[2];assert(process.argv.length===3&&/^[a-z0-9-]{1,50}$/.test(tag??''));
const report=JSON.parse(readFileSync(`tmp/rust-r2ij/j-command-comparison-${tag}.json`));
function differences(a,b,at=''){
    if(Object.is(a,b))return [];
    if(a&&b&&typeof a==='object'&&typeof b==='object')return [...new Set([...Object.keys(a),...Object.keys(b)])].flatMap(key=>differences(a[key],b[key],at+'.'+key));
    return [{path:at,nest:a,rust:b}];
}
console.log(JSON.stringify({result:report.result,failure:report.failure,differences:report.differences.map(row=>({name:row.name,changes:differences(row.nest,row.rust).slice(0,100)}))},null,2));
