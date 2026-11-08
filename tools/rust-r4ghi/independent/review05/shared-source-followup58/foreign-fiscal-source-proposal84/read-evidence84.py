import pathlib,json,hashlib,datetime
ROOT=pathlib.Path('E:/projects/worktrees/poms-r3hijk-next28/poms');OUT=ROOT/'tools/rust-r4ghi/independent/review05/shared-source-followup58/foreign-fiscal-source-proposal84';PRIVATE=pathlib.Path(r'\\wsl.localhost\Debian\home\wangzishi\.local\share\poms-r4ghi\private');B=PRIVATE/'business/g2-business12/main01';sha=lambda b:hashlib.sha256(b).hexdigest()
def pin(p,expected=None):
 b=p.read_bytes();h=sha(b)
 if expected:assert h==expected,(str(p),h,expected)
 return b,{'file':str(p).replace('\\','/'),'bytes':len(b),'rawBytesSha256':h}
def win(p):return pathlib.Path(r'\\wsl.localhost\Debian'+p.replace('/','\\'))
partial,pp=pin(B/'006185-shared-tax-fixture82-01-partial.json','e6ae5532d0ab49e889cf3fda89c72dea83820944ac5debb7988f3897623359b9')
request,rp=pin(B/'006224-http-request-body.bin','c964db7e6fb628f8a42032aaf91dd18c3d6c4cb0c6e69f8817e9105a2431cb06')
response,ep=pin(B/'006224-http-response-body.bin','90e56882f5b12601240e878972e83416e380f5609e78fc59fb108ad28c6e3dc1')
ledger,lp=pin(B/'006225-ledger.json','46f166b813d409e679759ccfbb63175c8a266a0c7c6dedfff2f511d38395e7f7');l=json.loads(ledger);r=json.loads(request);error=json.loads(response);assert error['code']=='operating_cost_source_missing' and error['statusCode']==409;assert l['ownershipComplete'] and l['recorded']==[] and l['blockers']==[]
frames=[]
for p in [l['before'],l['after']]:
 b,_=pin(win(p['file']),p['rawBytesSha256']);frames.append(json.loads(b))
before,after=frames;assert before['objects']==after['objects'];checked=0
for db,v in before['databases'].items():
 assert v['meta']==after['databases'][db]['meta'];assert len(v['tables'])==139;assert v['tables'].keys()==after['databases'][db]['tables'].keys()
 for table,m in v['tables'].items():
  n=after['databases'][db]['tables'][table];assert {k:x for k,x in m.items() if k!='file'}=={k:x for k,x in n.items() if k!='file'},(db,table)
  pin(win(m['file']),m['rawBytesSha256']);pin(win(n['file']),n['rawBytesSha256']);checked+=1
def rows(table):
 m=before['databases']['poms_r4ghi_rust']['tables'][table];b,_=pin(win(m['file']),m['rawBytesSha256']);return [dict(json.loads(line),value=json.loads(json.loads(line)['raw'])) for line in b.splitlines() if line]
target_ids={d['target']['id'] for d in r['costDecisions']};results=[x for x in rows('shared_cost_allocation_result') if x['value']['id'] in target_ids];assert len(results)==1;result=results[0];v=result['value'];assert v['project_id']==r['projectId'];slots=[x for x in rows('shared_cost_allocation_source_snapshot') if x['value']['basis_id']==v['basis_id']];assert len(slots)==1;slot=slots[0]['value'];cost=next(x for x in rows('project_actual_cost_record') if x['value']['id']==slot['cost_record_id']);c=cost['value'];expense=next(x for x in rows('expense_record') if x['value']['id']==c['source_id']);e=expense['value'];assert c['source_type']=='expense-record' and c['project_id']!=r['projectId'];assert e['project_id']==c['project_id'] and e['status']=='confirmed';assert c['row_version']==slot['cost_row_version']==e['row_version']==2
sources=[]
for f in ['apps/poms-api-rust/src/project_operating/context.rs','apps/poms-api-rust/src/project_operating/store.rs']:
 _,p=pin(ROOT/f);sources.append({'file':f,'sha256':p['rawBytesSha256']})
out={'schemaVersion':1,'review':'IR-G84-real-foreign-fiscal-parent-catalog-omission','at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'priority':'P1','evidenceClass':'actualAPI135 failedHTTP409 plus immutable complete before/after filesystem readback','sourceEdition':'g2-business12/API135','originals':{'partial':pp,'requestBody':rp,'responseBody':ep,'ledger':lp,'before':l['before'],'after':l['after']},'sourcePins':sources,'actualRelation':{'targetProject':r['projectId'],'allocationResult':v['id'],'basisId':v['basis_id'],'sourceCost':{'id':c['id'],'projectId':c['project_id'],'sourceType':c['source_type'],'sourceId':c['source_id'],'rowVersion':c['row_version'],'rowSHA256':cost['sha256'],'xmin':cost['xmin']},'physicalExpense':{'id':e['id'],'projectId':e['project_id'],'status':e['status'],'rowVersion':e['row_version'],'rowSHA256':expense['sha256'],'xmin':expense['xmin']},'slotCostVersion':slot['cost_row_version']},'beforeAfter':{'databases':2,'tablesPerDB':139,'tablePairsRawFilesVerified':checked,'allRowsAndXminExactEqual':True,'catalogSequencesObjectsEqual':True,'recorded':0,'blockers':0},'diagnosis':'Foreign E cost is collected through actual share source snapshots; its real Expense parent exists but Expense still uses onlylocal project predicate. Allocation context asks cost_source_ref and fails on missing catalog parent. No business source is missing in PG.','followup':'Fix only exact linked fiscal parent catalog/family-lock closure, keep imported parents out of own-project unmapped/upstream projections. Preserve failed request; do not rePOST or synthesize costs.','SQLExecuted':False,'HTTPExecuted':False,'RootWritten':False,'G3Certified':False,'G4Certified':False}
OUT.mkdir(parents=True,exist_ok=True);q=OUT/'evidence84.json';assert not q.exists();q.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({'report':str(q),'sha256':sha(q.read_bytes()),'fullTablePairs':checked,'rowsXminUnchanged':True,'SQL':False,'HTTP':False}))
