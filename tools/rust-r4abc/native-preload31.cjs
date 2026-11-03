// Test-only deployment adapter: restrict the original Native listener and retain app.close().
const fs=require('node:fs'),net=require('node:net'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const file=process.env.POMS_R4_NATIVE_CONTROL_FILE,entry=process.env.POMS_R4_NATIVE_ENTRY;
assert(file&&entry);const control=JSON.parse(fs.readFileSync(file,'utf8'));assert.equal(control.namespace,'poms-r4abc');assert(/^[a-f0-9]{64}$/.test(control.nonce));
const{NestFactory}=createRequire(entry)('@nestjs/core'),original=NestFactory.create.bind(NestFactory);let app=null;
NestFactory.create=async(...args)=>{app=await original(...args);const listen=app.listen.bind(app);app.listen=(port,...rest)=>listen(port,'127.0.0.1',...rest);return app;};
const server=net.createServer(socket=>{let raw='';socket.on('data',b=>{raw+=b.toString('utf8');if(raw.length>512)socket.destroy()});socket.on('end',async()=>{try{const input=JSON.parse(raw);assert(typeof input.nonce==='string'&&input.nonce.length===64);assert(crypto.timingSafeEqual(Buffer.from(input.nonce),Buffer.from(control.nonce)));assert(app);await app.close();fs.writeFileSync(control.closeAck,JSON.stringify({namespace:control.namespace,pid:process.pid,appCloseAcknowledged:true,closedAt:new Date().toISOString()})+'\n',{flag:'wx',mode:0o600});socket.end('closed');server.close();}catch{socket.destroy()}})});
server.listen(control.endpoint);
