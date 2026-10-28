// One-way corpus: every expectation executes the unchanged original Zod schema.
export function golden(shared, sourceHead) {
    const cases = [];
    function add(schema, name, value, raw = value === undefined ? null : JSON.stringify(value), ownUndefined = false) {
        let expected;
        try {
            const result = shared[schema + 'Schema'].safeParse(ownUndefined ? value : raw === null ? undefined : JSON.parse(raw));
            expected = result.success ? { success: true, dataRaw: JSON.stringify(result.data), ownKeys: Object.keys(result.data) } : { success: false, errors: result.error.issues };
        } catch (error) {
            expected = { success: false, internalError: { name: error.name, message: error.message } };
        }
        cases.push({ schema, name, inputRaw: raw, nonWireOwnUndefined: ownUndefined, expected });
    }
    const uuid = 'a0000000-0000-4000-8000-000000000001';
    const seeds = {
        CreatePlatformUserRequest: { username: ' User ', displayName: ' Name ', primaryOrgUnitId: null },
        UpdatePlatformUserRequest: {},
        UpdateCurrentUserProfileRequest: {},
        UpdatePlatformUserActivationRequest: {},
        AssignUserRolesRequest: { roleIds: [] },
        AssignUserOrgMembershipsRequest: { primaryOrgUnitId: uuid }
    };
    const names = Object.keys(seeds);
    for (const schema of names) {
        for (const [name, value] of [['missing', undefined], ['null', null], ['array', []], ['string', 'x'], ['number', 1], ['empty', {}], ['minimal', seeds[schema]], ['unknown-only', { unknown: '\\ud800', password: 'never-stored', isActive: false }]])
            add(schema, name, value);
        add(schema, 'strip-or-strict', { ...seeds[schema], unknown: '\\ud800', password: 'never-stored', avatarUrl: schema === 'UpdatePlatformUserRequest' ? 'https://example.invalid/a' : 'https://example.invalid/not-create-or-self' });
        const fields = Object.keys(shared[schema + 'Schema'].shape);
        add(schema, 'all-own-undefined', Object.fromEntries(fields.map(key => [key, undefined])), null, true);
        add(schema, 'all-invalid', Object.fromEntries(fields.map(key => [key, false])));
    }
    const texts = [
        ['CreatePlatformUserRequest', [['username',64],['displayName',128],['phone',64]]],
        ['UpdatePlatformUserRequest', [['displayName',128],['phone',64]]],
        ['UpdateCurrentUserProfileRequest', [['displayName',128],['phone',64]]],
        ['UpdatePlatformUserActivationRequest', [['reason',1000],['comment',1000]]],
        ['AssignUserRolesRequest', [['reason',1000]]],
        ['AssignUserOrgMembershipsRequest', [['reason',1000]]]
    ];
    for (const [schema, fields] of texts) for (const [field,max] of fields) {
        for (const [name, value] of [
            ['null',null], ['empty',''], ['space',' '], ['trim-set','\ufeff\u00a0x\u202f'], ['not-trim','\u0085x\u0085'],
            ['lone-high','\ud800'], ['lone-low','\udc00'], ['astral-at-limit','😀'.repeat(max)], ['astral-above-limit','😀'.repeat(max+1)],
            ['at-limit','x'.repeat(max)], ['above-limit','x'.repeat(max+1)], ['array',[]], ['long-array',Array(max+1).fill(null)],
            ['length-large',{length:max+1}], ['length-nan',{length:{}}], ['length-unconvertible',{length:{toString:null}}], ['nul','x\u0000']
        ]) add(schema,field+':'+name,{...seeds[schema],[field]:value});
    }
    for(const schema of ['CreatePlatformUserRequest','UpdatePlatformUserRequest','UpdateCurrentUserProfileRequest']) {
        for(const [name,value] of [
            ['null',null],['valid','a+b@example.invalid'],['space',' a@example.invalid '],['empty',''],['double-dot','a..b@example.invalid'],['leading-dot','.a@example.invalid'],
            ['newline','a@example.invalid\n'],['short-domain','a@example.x'],['local-domain','a@localhost'],['unicode','名字@example.invalid'],['unicode-domain','a@例子.invalid'],
            ['quoted','"a"@example.invalid'],['lone','\ud800'],['array',[]],['object',{}],['long','a'.repeat(260)+'@example.invalid'],['nul','a\u0000@example.invalid']
        ]) add(schema,'email:'+name,{...seeds[schema],email:value});
        for(const field of ['email','phone']) add(schema,field+':clear',{...seeds[schema],[field]:null});
    }
    for(const [name,value] of [
        ['null',null],['https','https://example.invalid/a'],['space',' https://example.invalid/a '],['opaque','mailto:a@example.invalid'],['custom','anything:value'],
        ['file','file:///C:/a'],['ftp','ftp://example.invalid/a'],['relative','/a'],['bare','example.invalid'],['http-colon','http:example.invalid'],
        ['bad-host','https://[invalid]/'],['unicode','https://例子.invalid/路'],['newline','https://example.invalid/\n'],['nul','https://example.invalid/\u0000'],
        ['lone','\ud800'],['object',{}],['empty',''],['long','https://example.invalid/'+'a'.repeat(550)]
    ]) add('UpdatePlatformUserRequest','avatarUrl:'+name,{avatarUrl:value});
    for(const schema of ['UpdateCurrentUserProfileRequest']) for(const key of ['username','avatarUrl','roles','permissions','orgUnits','primaryOrgUnitId','isActive','emailVerified','phoneVerified','password','passwordHash'])
        add(schema,'protected:'+key,{displayName:' Name ',[key]:key==='displayName'?'Name':false});
    const ids=[uuid,uuid.toUpperCase(),'00000000-0000-0000-0000-000000000000','ffffffff-ffff-ffff-ffff-ffffffffffff','FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF',
        'a0000000-0000-8000-8000-000000000001','a0000000-0000-0000-8000-000000000001','a0000000-0000-9000-8000-000000000001',
        'a0000000-0000-4000-0000-000000000001',' '+uuid+' ',uuid.replaceAll('-',''),'{'+uuid+'}','urn:uuid:'+uuid,1,null,'\ud800'];
    for(const [schema,field,array] of [
        ['CreatePlatformUserRequest','primaryOrgUnitId',false],['CreatePlatformUserRequest','initialRoleIds',true],
        ['AssignUserRolesRequest','roleIds',true],['AssignUserOrgMembershipsRequest','primaryOrgUnitId',false],['AssignUserOrgMembershipsRequest','secondaryOrgUnitIds',true]
    ]) {
        for(const [index,value] of ids.entries()) add(schema,field+':uuid-'+index,{...seeds[schema],[field]:array?[value]:value});
        if(array) for(const [name,value] of [['null',null],['scalar',uuid],['empty',[]],['duplicates',[uuid,uuid]],['case-duplicates',[uuid,uuid.toUpperCase()]],['mixed-invalid',[1,'bad',null]],['object',{}]])
            add(schema,field+':'+name,{...seeds[schema],[field]:value});
    }
    for(const schema of ['UpdatePlatformUserActivationRequest','AssignUserRolesRequest','AssignUserOrgMembershipsRequest'])
        for(const rawNumber of ['-1','-0','0','1','1.5','2147483648','9007199254740991','9007199254740992','-9007199254740992','1e999','1.00000000000000001','9007199254740990.9','"3"','true','null'])
            add(schema,'expectedVersion:'+rawNumber,null,JSON.stringify(seeds[schema]).slice(0,-1)+(Object.keys(seeds[schema]).length?',':'')+'"expectedVersion":'+rawNumber+'}');
    add('UpdatePlatformUserRequest','duplicate-last-wins',null,'{"displayName":"old","displayName":"new","email":"a@example.invalid","email":null}');
    add('UpdateCurrentUserProfileRequest','escaped-duplicate',null,'{"displayName":"old","\\u0064isplayName":" new "}');
    add('UpdateCurrentUserProfileRequest','prototype-and-index-keys',null,'{"10":true,"2":true,"__proto__":{},"constructor":false,"displayName":"ok"}');
    add('UpdatePlatformUserRequest','prototype-and-index-keys',null,'{"10":true,"2":true,"__proto__":{},"constructor":false,"displayName":"ok"}');
    add('AssignUserOrgMembershipsRequest','primary-in-secondary',{primaryOrgUnitId:uuid,secondaryOrgUnitIds:[uuid]});

    // Systematic WHATWG URL acceptance and Zod-specific output transformations.
    // This is a finite source-executed corpus, not a full-Unicode conformance claim.
    for (let unit=0;unit<=32;unit++) {
        const char=String.fromCharCode(unit);
        for(const [position,value] of [
            ['leading',char+'https://example.invalid/a'],
            ['scheme','ht'+char+'tps://example.invalid/a'],
            ['host','https://exa'+char+'mple.invalid/a'],
            ['path','https://example.invalid/a'+char+'b'],
            ['trailing','https://example.invalid/a'+char]
        ]) add('UpdatePlatformUserRequest','url-control:'+unit+':'+position,{avatarUrl:value});
    }
    for(const unit of [0x85,0xa0,0x1680,0x180e,0x2000,0x2001,0x2002,0x2003,0x2004,0x2005,0x2006,0x2007,0x2008,0x2009,0x200a,0x200b,0x2028,0x2029,0x202f,0x205f,0x3000,0xfeff]) {
        const char=String.fromCharCode(unit);
        add('UpdatePlatformUserRequest','url-unicode-edge:'+unit,{avatarUrl:char+'https://example.invalid/a'+char});
    }
    const urlHosts=['localhost','localhost.','example.invalid.','_service.example.invalid','-a.example.invalid','a-.example.invalid',
        '0x7f000001','127.1','0177.1','2130706433','4294967295','4294967296','256.1.1.1','1.2.3.4.5','[::1]','[::ffff:192.0.2.1]','[fe80::1%25eth0]',
        'user:pass@example.invalid','user@user@example.invalid','%65xample.invalid','exa%00mple.invalid','%FF.invalid','[v1.a]',
        '例子.invalid','faß.invalid','ＦＯＯ.invalid','K.invalid','é.invalid','e\u0301.invalid','☕.invalid','\ud800.invalid','a\u200db.invalid','א.invalid'];
    for(const [index,host] of urlHosts.entries())
        add('UpdatePlatformUserRequest','url-host:'+index,{avatarUrl:'https://'+host+'/a'});
    for(const port of ['0','00','80','443','65535','65536','-1','+80','00080','abc','1.5',''])
        add('UpdatePlatformUserRequest','url-port:'+port,{avatarUrl:'https://example.invalid:'+port+'/a'});
    for(const [index,value] of [
        'HTTP://EXAMPLE.INVALID/a/../b?x=1#f','https:///example.invalid','https:////example.invalid','https:\\example.invalid\\a',
        'http://','http://?x','https://#fragment','//example.invalid/a','/relative','relative',
        'custom:opaque data','custom:opaque\u0000data','custom:','custom:/','custom://','custom:///a','custom://host/a','custom://%FF/a',
        'data:text/plain,hello','javascript:alert(1)','mailto:a@example.invalid','about:blank','urn:uuid:'+uuid,
        'file:///C:/a','file://localhost/C:/a','file://server/share/a','file:C|/a','file:///C|/a',
        'https://example.invalid/%','https://example.invalid/%FF','https://example.invalid/%00','https://example.invalid/\ud800',
        'https://example.invalid/😀','https://example.invalid/?q=a\tb\nc\r','https://exa\nmple.invalid/ok'
    ].entries()) add('UpdatePlatformUserRequest','url-standard:'+index,{avatarUrl:value});
    add('UpdateCurrentUserProfileRequest','unknown-lone-key',null,'{"\\ud800":true}');
    add('UpdateCurrentUserProfileRequest','unknown-escaped-keys',{'a"b':true,'line\nkey':true,displayName:false});
    return {formatVersion:1,sourceHead,oracle:'Actual current original shared Zod4.6.1; parsed payload, own key order, complete issues; non-wire own undefined explicit',
        schemaKeys:Object.fromEntries(names.map(name=>[name,Object.keys(shared[name+'Schema'].shape)])),
        wireCases:cases.filter(entry=>!entry.nonWireOwnUndefined).length,nonWireCases:cases.filter(entry=>entry.nonWireOwnUndefined).length,cases};
}
