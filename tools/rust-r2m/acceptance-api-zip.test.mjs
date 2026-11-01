// Synthetic archives only. The fixture writer uses Node's independent zlib
// CRC implementation; the acceptance reader is the pinned mature K reader.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {crc32} from 'node:zlib';
import {SourceReader} from './acceptance-source.mjs';
import {archiveReaderSources,assertHandoverArchive,readMatureStoreZip} from './acceptance-api-zip.mjs';
const root=path.resolve(import.meta.dirname,'../..'),sha=bytes=>createHash('sha256').update(bytes).digest('hex'),id=n=>'a0000000-0000-4000-8000-'+String(n).padStart(12,'0');
const reader=()=>new SourceReader({root,pins:archiveReaderSources.map(pin=>({...pin,bytes:fs.readFileSync(path.join(root,pin.file)).length})),sourceEpoch:'pure-zip-only'});
function zip(entries){
    const locals=[],central=[];let offset=0;
    for(const{name,data}of entries){const filename=Buffer.from(name),bytes=Buffer.from(data),crc=crc32(bytes),local=Buffer.alloc(30),record=Buffer.alloc(46);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(0x0800,6);local.writeUInt32LE(crc,14);local.writeUInt32LE(bytes.length,18);local.writeUInt32LE(bytes.length,22);local.writeUInt16LE(filename.length,26);locals.push(local,filename,bytes);record.writeUInt32LE(0x02014b50);record.writeUInt16LE(20,4);record.writeUInt16LE(20,6);record.writeUInt16LE(0x0800,8);record.writeUInt32LE(crc,16);record.writeUInt32LE(bytes.length,20);record.writeUInt32LE(bytes.length,24);record.writeUInt16LE(filename.length,28);record.writeUInt32LE(offset,42);central.push(record,filename);offset+=30+filename.length+bytes.length}
    const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...locals,directory,end]);
}
function fixture(){
    const run=id(1),project=id(2),handover=id(3),pkg=id(4),normal=id(5),sensitive=id(6),selection=id(7),omitted=id(8),data=Buffer.from('pure known uploaded source\n'),secret=Buffer.from('pure sensitive source must stay out\n'),reason='Security level sensitive is excluded from ordinary handover download packages',sourceRefs=[{sourceType:'project',sourceId:project,relationType:'attachment',label:'pure source'}],summary={includedCount:1,excludedCount:1,includedAttachmentIds:[normal],excludedAttachmentIds:[sensitive],excludedReasons:[reason]},item={selectionId:selection,attachmentId:normal,versionGroupId:normal,displayName:'中文.txt',category:'demand',securityLevel:'normal',fileName:'001-中文.txt',sourceRefs},manifest={packageId:pkg,handoverId:handover,projectId:project,createdAt:'2026-10-31T10:00:00.000Z',expiresAt:'2026-11-01T10:00:00.000Z',manifestSummary:summary,items:[item]},bindings={runId:run,project:{id:project},handover:{id:handover},package:{id:pkg},packageAttachment:{id:normal},sensitiveAttachment:{id:sensitive},upload:{package:{bytes:data},sensitive:{bytes:secret}}},after={rows:{attachment_download_package:[{id:pkg,project_id:project,handover_id:handover,status:'ready',storage_provider:'local',storage_key:'poms-r2m/'+run+'/attachment-download-packages/pure.zip',created_at:manifest.createdAt,expires_at:manifest.expiresAt,manifest_summary:summary}],attachment:[{id:normal,checksum_sha256:sha(data),size_bytes:data.length},{id:sensitive}],project_handover_attachment_selection:[{id:selection,handover_id:handover,attachment_id:normal,status:'included',security_level:'normal',display_name:item.displayName,category:'demand',version_group_id:normal,source_refs:sourceRefs},{id:omitted,handover_id:handover,attachment_id:sensitive,status:'sensitive-excluded',security_level:'sensitive',exclusion_reason:reason}],attachment_download_package_item:[{package_id:pkg,attachment_id:normal,status:'included',file_name:item.fileName,version_group_id:normal,source_refs:sourceRefs},{package_id:pkg,attachment_id:sensitive,status:'excluded',file_name:null,exclusion_reason:reason}]}},archive=(manifestValue=manifest,payload=data,extra=[])=>zip([{name:'manifest.json',data:Buffer.from(JSON.stringify(manifestValue,null,2))},{name:item.fileName,data:payload},...extra]);
    return{bindings,after,manifest,archive,response:bytes=>({bodyBytes:bytes,bodyBytesSha256:sha(bytes),bodyBytesLength:bytes.length})};
}
test('the mature K parser checks actual CRC/local-central structure and the exact uploaded ordinary payload against physical selection/package facts',()=>{
    const f=fixture(),proof=assertHandoverArchive({sourceReader:reader(),response:f.response(f.archive()),bindings:f.bindings,after:f.after});assert.equal(proof.allLocalCentralAndCrcChecks,true);assert.equal(proof.actualUploadedSourceBytesEqual,true);assert.equal(proof.entries.length,2);assert.equal(proof.sensitiveAttachmentExcluded,f.bindings.sensitiveAttachment.id);
});
test('CRC corruption and unaccounted trailer bytes cannot pass as a complete original archive',()=>{
    const f=fixture(),bad=Buffer.from(f.archive());bad[30+Buffer.byteLength('manifest.json')]^=1;assert.throws(()=>readMatureStoreZip({sourceReader:reader(),bytes:bad}));assert.throws(()=>readMatureStoreZip({sourceReader:reader(),bytes:Buffer.concat([f.archive(),Buffer.from('trailer')])}));
});
test('a structurally valid ZIP still fails on foreign manifest identity, different real source bytes or inclusion of sensitive bytes',()=>{
    const f=fixture(),verify=bytes=>assertHandoverArchive({sourceReader:reader(),response:f.response(bytes),bindings:f.bindings,after:f.after});assert.throws(()=>verify(f.archive({...f.manifest,handoverId:id(99)})));assert.throws(()=>verify(f.archive(f.manifest,Buffer.from('different source'))));assert.throws(()=>verify(f.archive(f.manifest,f.bindings.upload.package.bytes,[{name:'sensitive.txt',data:f.bindings.upload.sensitive.bytes}])));
});
