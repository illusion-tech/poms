// Expectations execute unchanged source schemas. This finite corpus is not a DB/network claim.
export function golden(shared, sourceHead) {
    const cases = [];
    const uuid = 'a0000000-0000-4000-8000-000000000001';
    const seeds = {
        IdentityProviderConfigListQuery: {},
        CreateIdentityProviderConfigRequest: { provider: 'feishu', displayName: ' Name ', clientId: ' Client ' },
        UpdateIdentityProviderConfigRequest: { displayName: ' Name ' },
        TestIdentityProviderConnectionRequest: {},
        ExternalLoginCallbackQuery: { state: ' signed-state ' },
        IdentityProviderOAuthCallbackQuery: { state: ' signed-state ' },
        CreateExternalLoginSessionRequest: { ticket: 't'.repeat(32) },
        ExternalUserSearchQuery: { q: ' Name ' },
        BindUserExternalIdentityRequest: { identityProviderConfigId: uuid, subjectId: ' Subject ' },
        UnbindExternalIdentityRequest: {}
    };
    function add(schema, name, value, inputRaw = value === undefined ? null : JSON.stringify(value)) {
        let expected;
        try {
            const result = shared[schema + 'Schema'].safeParse(inputRaw === null ? undefined : JSON.parse(inputRaw));
            expected = result.success ? { success: true, dataRaw: JSON.stringify(result.data), ownKeys: Object.keys(result.data) } : { success: false, errors: result.error.issues };
        } catch (error) { expected = { success: false, internalError: { name: error.name, message: error.message } }; }
        cases.push({ schema, name, inputRaw, expected });
    }
    for (const [schema, seed] of Object.entries(seeds)) {
        for (const [name, value] of [['missing', undefined], ['null', null], ['array', []], ['string', 'x'], ['number', 1], ['empty', {}], ['minimal', seed], ['unknown-only', { unknown: true }]]) add(schema, name, value);
        add(schema, 'unknown-strip', { ...seed, unknown: true, encryptedClientSecret: 'synthetic-only' });
        add(schema, 'all-invalid', Object.fromEntries(Object.keys(shared[schema + 'Schema'].shape).map(key => [key, false])));
    }
    const fields = {
        CreateIdentityProviderConfigRequest: [['tenantId',128],['displayName',128],['clientId',255],['clientSecret',2048]],
        UpdateIdentityProviderConfigRequest: [['displayName',128],['clientId',255],['clientSecret',2048]],
        TestIdentityProviderConnectionRequest: [['externalRootDepartmentId',128]],
        ExternalLoginCallbackQuery: [['state',4096],['code',2048],['error',255],['error_description',2048]],
        IdentityProviderOAuthCallbackQuery: [['state',4096],['code',2048],['error',255],['error_description',2048]],
        CreateExternalLoginSessionRequest: [['ticket',4096]],
        ExternalUserSearchQuery: [['q',128]],
        BindUserExternalIdentityRequest: [['tenantId',128],['subjectId',255],['unionId',255],['subjectDisplayName',255],['mobile',64]]
    };
    for (const [schema, items] of Object.entries(fields)) for (const [field,max] of items) {
        for (const [name,value] of [['null',null],['empty',''],['space',' '],['trim','\ufeff\u00a0x\u202f'],['not-trim','\u0085x\u0085'],['lone-high','\ud800'],['lone-low','\udc00'],['astral-at','😀'.repeat(max)],['astral-above','😀'.repeat(max+1)],['at','x'.repeat(max)],['above','x'.repeat(max+1)],['array',[]],['object',{}],['nul','x\u0000']]) add(schema,field+':'+name,{...seeds[schema],[field]:value});
    }
    for (const schema of ['CreateIdentityProviderConfigRequest','UpdateIdentityProviderConfigRequest']) {
        for (const field of ['enabled','loginEnabled','bindingEnabled','searchEnabled']) for (const value of [true,false,null,0,1,'true',[],{}]) add(schema,field+':'+JSON.stringify(value),{...seeds[schema],[field]:value});
        for (const field of ['loginScopes','searchScopes','tenantAllowlist']) for (const [name,value] of [['null',null],['empty',[]],['scalar','x'],['duplicate',[' a ','a',' b ']],['blank',[' ']],['non-string',[1,null]],['max',Array.from({length:32},(_,i)=>'scope'+i)],['above',Array.from({length:33},(_,i)=>'scope'+i)],['long',['x'.repeat(129)]],['astral',['😀'.repeat(128)]]]) add(schema,field+':'+name,{...seeds[schema],[field]:value});
        for (const value of ['per-admin','service-account','PER-ADMIN',' per-admin ',null,[],{}]) add(schema,'searchGrantMode:'+JSON.stringify(value),{...seeds[schema],searchGrantMode:value});
        for (const field of ['redirectUri','searchRedirectUri']) for (const value of [null,'https://example.invalid/callback',' https://example.invalid/callback ','mailto:a@example.invalid','file:///C:/a','anything:opaque','https:example.invalid','https://例子.invalid/路','/relative','example.invalid','', '\ud800','https://example.invalid/'+'x'.repeat(600),[],{}]) add(schema,field+':'+JSON.stringify(value),{...seeds[schema],[field]:value});
    }
    for (const value of ['feishu','dingtalk','wecom','FEISHU',' feishu ',null,[],{}]) for (const schema of ['CreateIdentityProviderConfigRequest','IdentityProviderConfigListQuery']) add(schema,'provider:'+JSON.stringify(value),{...seeds[schema],provider:value});
    for (const value of ['draft','active','disabled','misconfigured','ACTIVE',null,[],{}]) add('IdentityProviderConfigListQuery','status:'+JSON.stringify(value),{status:value});
    for (const schema of ['UpdateIdentityProviderConfigRequest','TestIdentityProviderConnectionRequest','UnbindExternalIdentityRequest']) for (const raw of ['-1','-0','0','1','1.5','2147483648','9007199254740991','9007199254740992','1e999','1.00000000000000001','9007199254740990.9','"3"','true','null']) add(schema,'expectedVersion:'+raw,null,JSON.stringify(seeds[schema]).slice(0,-1)+(Object.keys(seeds[schema]).length?',':'')+'"expectedVersion":'+raw+'}');
    for (const value of [{expectedVersion:1},{unknown:true},{provider:'feishu',tenantId:'tenant'},{redirectUri:null},{searchRedirectUri:null},{clientSecret:null},{loginScopes:[]},{enabled:false}]) add('UpdateIdentityProviderConfigRequest','refine:'+JSON.stringify(value),value);
    for (const value of ['basic','external-org-sync','BASIC',null,[],{}]) add('TestIdentityProviderConnectionRequest','capability:'+JSON.stringify(value),{capability:value});
    for (const value of [null,'', ' ', '0','1','50','51','1.5','0x10','1e1',true,false,[],['2'],['1','2'],{},'Infinity','NaN','9007199254740992']) add('ExternalUserSearchQuery','limit:'+JSON.stringify(value),{q:'x',limit:value});
    for (const field of ['state','code','error','error_description']) for (const schema of ['ExternalLoginCallbackQuery','IdentityProviderOAuthCallbackQuery']) add(schema,field+':duplicate-query',{...seeds[schema],[field]:['a','b']});
    for (const value of [uuid,uuid.toUpperCase(),'00000000-0000-0000-0000-000000000000','ffffffff-ffff-ffff-ffff-ffffffffffff','a0000000-0000-8000-8000-000000000001','a0000000-0000-0000-8000-000000000001',' '+uuid+' ',uuid.replaceAll('-',''),null,1,[]]) add('BindUserExternalIdentityRequest','uuid:'+JSON.stringify(value),{...seeds.BindUserExternalIdentityRequest,identityProviderConfigId:value});
    for (const field of ['avatarUrl','email']) for (const value of [null,'', ' a@example.invalid ', 'https://example.invalid/a','mailto:a@example.invalid','a..b@example.invalid','a@localhost','名字@example.invalid','a@例子.invalid',[],{}]) add('BindUserExternalIdentityRequest',field+':'+JSON.stringify(value),{...seeds.BindUserExternalIdentityRequest,[field]:value});
    for (const length of [31,32,4096,4097]) add('CreateExternalLoginSessionRequest','ticket:length'+length,{ticket:'t'.repeat(length)});
    add('UpdateIdentityProviderConfigRequest','duplicate-last',null,'{"displayName":"old","displayName":" new ","redirectUri":"https://example.invalid","redirectUri":null}');
    add('ExternalLoginCallbackQuery','escaped-key',null,'{"state":"old","\\u0073tate":" new "}');
    return { formatVersion: 1, sourceHead, oracle: 'Unchanged original shared Zod 4.6.1, finite request wire corpus; no DB or upstream I/O', schemaKeys: Object.fromEntries(Object.keys(seeds).map(name => [name,Object.keys(shared[name+'Schema'].shape)])), cases };
}
