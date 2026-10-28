export function golden(shared,sourceHead) {
    const cases=[];
    function add(schema,name,value,inputRaw=value===undefined?null:JSON.stringify(value)) {
        let expected;
        try {
            const result=shared[schema+'Schema'].safeParse(inputRaw===null?undefined:JSON.parse(inputRaw));
            expected=result.success?{success:true,dataRaw:JSON.stringify(result.data)}:{success:false,errors:result.error.issues};
        } catch(error) { expected={success:false,internalError:{name:error.name,message:error.message}}; }
        cases.push({schema,name,inputRaw,expected});
    }
    const seeds={DictionaryItemListQuery:{},CreateDictionaryItemRequest:{domain:'lead-source',code:'web',name:' Name '},UpdateDictionaryItemRequest:{name:' Name '},UpdateSystemSettingRequest:{value:50}};
    for(const [schema,seed] of Object.entries(seeds)) {
        for(const [name,value] of [['missing',undefined],['null',null],['array',[]],['number',1],['string','x'],['empty',{}],['minimal',seed],['unknown-only',{unknown:'\ud800'}],['all-invalid',Object.fromEntries(Object.keys(shared[schema+'Schema'].shape).map(key=>[key,false]))]]) add(schema,name,value);
        add(schema,'unknown-strip',{...seed,domain:schema==='CreateDictionaryItemRequest'?'lead-source':undefined,secret:'not-persisted',isSystem:true});
    }
    for(const [schema,field,max] of [['DictionaryItemListQuery','keyword',128],['CreateDictionaryItemRequest','code',64],['CreateDictionaryItemRequest','name',128],['CreateDictionaryItemRequest','description',1000],['UpdateDictionaryItemRequest','name',128],['UpdateDictionaryItemRequest','description',1000]]) {
        for(const [name,value] of [['null',null],['empty',''],['space',' '],['trim','\ufeff\u00a0x\u202f'],['not-trim','\u0085x\u0085'],['lone-high','\ud800'],['lone-low','\udc00'],['astral-at','😀'.repeat(max)],['astral-above','😀'.repeat(max+1)],['at','x'.repeat(max)],['above','x'.repeat(max+1)],['array',[]],['long-array',Array(max+1).fill(null)],['object',{}],['length-large',{length:max+1}],['length-nan',{length:{}}],['length-throw',{length:{toString:null}}],['nul','x\u0000']]) add(schema,field+':'+name,{...seeds[schema],[field]:value});
    }
    for(const schema of ['DictionaryItemListQuery','CreateDictionaryItemRequest']) for(const domain of [...shared.DICTIONARY_DOMAINS,'LEAD-SOURCE',' lead-source ',null,[],{}]) add(schema,'domain:'+JSON.stringify(domain),{...seeds[schema],domain});
    for(const schema of ['DictionaryItemListQuery','UpdateDictionaryItemRequest']) for(const status of ['active','inactive','ACTIVE',' active ',null,[],{}]) add(schema,'status:'+JSON.stringify(status),{...seeds[schema],status});
    for(const code of ['a','a0','a-b','A','a_b','0a','a-','a--b','ä','a\n','a\r\n']) add('CreateDictionaryItemRequest','code:pattern:'+code,{...seeds.CreateDictionaryItemRequest,code});
    for(const [schema,fields] of [['CreateDictionaryItemRequest',['sortOrder']],['UpdateDictionaryItemRequest',['sortOrder','expectedVersion']],['UpdateSystemSettingRequest',['value','expectedVersion']]]) for(const field of fields) {
        for(const rawNumber of ['-1','-0','0','1','1.5','2147483648','9007199254740991','9007199254740992','-9007199254740992','1e999','1.00000000000000001','9007199254740990.9','"3"','true','null']) {
            const seed={...seeds[schema]};delete seed[field];
            add(schema,field+':'+rawNumber,null,JSON.stringify(seed).slice(0,-1)+(Object.keys(seed).length?',':'')+'"'+field+'":'+rawNumber+'}');
        }
    }
    for(const value of [{expectedVersion:1},{domain:'lead-source',code:'x',isSystem:false},{description:null},{description:undefined},{status:'inactive'},{sortOrder:0},{name:null,description:null}]) add('UpdateDictionaryItemRequest','refine:'+JSON.stringify(value),value);
    add('UpdateDictionaryItemRequest','duplicate-last',null,'{"name":"old","name":" new ","description":"a","description":null}');
    add('UpdateDictionaryItemRequest','escaped-key',null,'{"name":"old","\\u006eame":" new "}');
    add('DictionaryItemListQuery','duplicate-query',{domain:['lead-source','lead-source'],keyword:['x','y']});
    return {formatVersion:1,sourceHead,oracle:'Original unchanged Zod4.6.1, finite wire corpus, no DB behavior claim',cases};
}
