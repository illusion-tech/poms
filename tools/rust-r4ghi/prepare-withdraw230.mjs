// Bind the exact independent withdrawal review and immutable actual originals.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const R = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', P = '/home/wangzishi/.local/share/poms-r4ghi/private', D = P + '/business/g2-business13/main01';
const sha = value => createHash('sha256').update(value).digest('hex');
assert.equal(process.platform, 'linux'); assert.equal(process.version, 'v24.19.0'); assert.deepEqual([process.argv[2],process.argv[4]], ['--review','--approved-review-sha']); assert.equal(process.argv.length,6); assert(!fs.existsSync(D+'/driver.lock'));
const pin = (file, expected) => { const rawBytesSha256 = sha(fs.readFileSync(file)); if (expected) assert.equal(rawBytesSha256,expected); return {file,rawBytesSha256}; };
const json = p => { pin(p.file,p.rawBytesSha256); return JSON.parse(fs.readFileSync(p.file)); };
const withdrawalReview = pin(process.argv[3],process.argv[5]), review = json(withdrawalReview);
assert.equal(review.allowsMetadataWithdrawal,true); assert.equal(review.onlyCounterPreservingUnconsumed119Withdrawal,true); assert.equal(review.script.rawBytesSha256,pin(R+'/tools/rust-r4ghi/withdraw-unconsumed119-232.mjs').rawBytesSha256);
const state = JSON.parse(fs.readFileSync(D+'/state.json')); assert.equal(pin(D+'/state.json').rawBytesSha256,'b079c3644934ebdcd3a5167c975139704782e37147aa92b418dd391d5570f358');
const command = json(pin(P+'/tool119-226-publish/command226.json','b2bf1c4aab2de38db2f023555dc4f971c903fc522880b1f74a49db77b5834d89')), result = json(command.stdout);
const plan = { kind:'Root-approved-unconsumed-domain-tool119-metadata-withdrawal232',
 currentState:pin(D+'/tool119-prewithdraw233/published-state-before-withdraw233.json','b079c3644934ebdcd3a5167c975139704782e37147aa92b418dd391d5570f358'),
 registry:state.toolAdmission119.registry,approved119Plan:state.toolAdmission119.approvedPlan,publication:result.publication,
 B2:pin(D+'/B2-Source13-tool119-admitted226.json','9f8a6c533eec86cb15b51a4a21f8f6ef79ab8363e30dcab5b428828742dee7b6'),
 post228:pin(D+'/tool119-post228/receipt228.json','93ce215b48eaae4d118a4bd3e723698b2ebb53410cd91ee0939757d30e2cef46'),
 preWithdrawal233:pin(D+'/tool119-prewithdraw233/receipt233.json','b2817ce2186c0b8c0c9b9542508ef2dfacf18a6f3a11389273bfc621a7795799'),
 failed227:pin(P+'/source13-H1-helper227/receipt227.json','907dce9e2cf7a29728d5e310cf4233461dead50d77f8270c9c95b538c03b80fa'),
 fixtureProposal:pin(R+'/tools/rust-r4ghi/helper-fixture231/manifest231.json','803166aa0ae9a7dd409f047b3a69ad0961f0dad13b394dec000ba7bf9e096daa'),
 fixtureReview:pin(R+'/tools/rust-r4ghi/independent/review05/helper-fixture-review129/review129.json','60f8334ce3c2efa3ae67062ede2549f2aae1ff16130ceab1fdf9991b1270325f'),
 withdrawalReview,sourcePins:pin(P+'/source13-preparation193/sourcePins.json','e95a9c8e3cabf30095c463a577d2d70eb681eb7b22d6c7ee31375dbdcf55e22c'),
 currentH1:pin(D+'/tool119-tax225/H1-actual225.json','092483fc8fa018d425d765889f4389d8c136ec28aa8463acf92e8e5369781343'), outputDirectory:D+'/tool119-withdraw232' };
const out=D+'/tool119-withdraw-plan230';fs.mkdirSync(out,{mode:0o700});const file=out+'/plan232.json';fs.writeFileSync(file,JSON.stringify(plan,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({actualPlan:pin(file),stateChanged:false,SQLOrHTTP:false}));
