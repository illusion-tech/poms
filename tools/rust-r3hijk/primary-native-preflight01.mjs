import fs from 'node:fs';import{createHash}from'node:crypto';import{execFileSync}from'node:child_process';
const manifest=JSON.parse(fs.readFileSync('docs/design/archive/slices/rust-r3hijk/g3-input-manifest03.json')),sha=b=>createHash('sha256').update(b).digest('hex'),differences=[];
for(const row of manifest.protectedNativeInputs){const data=fs.readFileSync('E:/projects/poms/'+row.file);if(data.length===row.bytes&&sha(data)===row.rawBytesSha256)continue;
 const blob=execFileSync('git',['show','7f970c992291c61477eb9bd83a48cec19a769d88:'+row.file],{encoding:null,windowsHide:true,maxBuffer:16000000});
 differences.push({file:row.file,expectedBytes:row.bytes,primaryBytes:data.length,expectedSha256:row.rawBytesSha256,primarySha256:sha(data),gitBaseBytes:blob.length,gitBaseSha256:sha(blob),primaryStartsUTF8BOM:data.subarray(0,3).equals(Buffer.from([239,187,191])),primaryWithoutBOMMatches:sha(data.subarray(3))===row.rawBytesSha256,indexFlags:execFileSync('git',['-C','E:/projects/poms','ls-files','-v','--',row.file],{encoding:'utf8',windowsHide:true}).trim()});
}
fs.writeFileSync('tmp/rust-r3hijk/primary-native-preflight01.json',JSON.stringify({kind:'R3HIJK-readonly-primary-Native-byte-preflight',createdAt:new Date().toISOString(),differences,primaryModified:false},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({differences,primaryModified:false}));
