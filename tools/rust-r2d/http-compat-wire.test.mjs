
import assert from 'node:assert/strict';
import test from 'node:test';
import { wireRequest } from './http-compat-wire.mjs';
const session={origin:'http://127.0.0.1:5500',identity:{userAgent:'pure-test',requestId:'pure-test'},cookies:new Map([['poms_session','synthetic-session'],['poms_csrf','synthetic-csrf']])};
test('raw transport retains encoded colon, duplicate JSON and exact bytes without URL normalizing the route',()=>{
    const raw='{"displayName":"first","displayName":"last","unknown":"\\ud800"}';
    const wire=wireRequest(session,'PATCH','/API/PLATFORM/USERS/ABC%44/?x=1',{body:raw,contentType:'application/json'});
    assert.equal(wire.options.path,'/API/PLATFORM/USERS/ABC%44/?x=1');
    assert.equal(wire.body.toString(),raw);
    assert.equal(wire.options.headers[wire.options.headers.indexOf('Content-Length')+1],String(Buffer.byteLength(raw)));
    assert(wire.options.headers.includes('X-CSRF-Token'));
    assert.equal(wire.options.headers[wire.options.headers.indexOf('X-Forwarded-For')+1],'192.0.2.25');
    assert.equal(wire.options.headers.filter(header=>header==='X-Forwarded-For').length,1);
    assert.equal(wireRequest(session,'POST','/api/platform/users/id%3Aactivate',{json:{}}).options.path,'/api/platform/users/id%3Aactivate');
});
test('transport admits only the local explicit API request boundary',()=>{
    for(const [origin,route]of [['https://example.invalid','/api/platform/users'],['http://127.0.0.1:5500','/outside'],['http://127.0.0.1:5500','/api/\r\ninjection']])
        assert.throws(()=>wireRequest({...session,origin},'GET',route));
    assert.throws(()=>wireRequest(session,'CONNECT','/api/platform/users'));
});
