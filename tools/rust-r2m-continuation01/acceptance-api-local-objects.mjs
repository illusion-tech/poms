// Root-only actual adapter. Enumerate certified row metadata, never adopt files
// by a directory match. Missing uncommitted objects do not become ownership.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {objectPath} from './fixture-objects.mjs';

export async function certifyExistingLocalObjects({fixture,raw,sourceCapId,retain}){
    assert(raw?.kind==='R2M-actual-full107-private-row-snapshot'&&raw.runId===fixture.runId&&raw.backend===fixture.backend&&raw.tables.length===107);assert.equal(typeof retain,'function');
    const proofs=[],metadataWithoutExistingBytes=[];
    for(const table of['attachment_upload_session','attachment','attachment_download_package']){
        const selected=raw.tables.find(item=>item.table===table);assert(selected&&Array.isArray(selected.ownedRows));
        for(const row of selected.ownedRows){
            if((row.storage_provider??row.provider_type)!=='local'||!row.storage_key)continue;
            const owned=fixture.j.objects.find(item=>item.table===table&&item.id===row.id);assert(owned?.creationProof&&owned.postcondition?.independentlyVisible,'Actual local metadata row must already have independent ownership proof');
            const {file}=objectPath(fixture,row.storage_key);
            if(fs.existsSync(file)){const certificate=await fixture.certifyLocalObject(table,row.id,row.storage_key);proofs.push({table,id:row.id,...certificate})}
            else metadataWithoutExistingBytes.push({table,id:row.id,key:row.storage_key,existingByteCertificate:fixture.j.localObjects?.files.some(item=>item.key===row.storage_key)===true});
        }
    }
    const receipt=await retain({kind:'actual-API-local-row-and-byte-certificates',record:{sourceCapId,runId:fixture.runId,proofs,metadataWithoutExistingBytes,discoveryOwnershipClaimed:false}});return{proofs:proofs.length,metadataWithoutExistingBytes:metadataWithoutExistingBytes.length,privateEvidence:receipt};
}
