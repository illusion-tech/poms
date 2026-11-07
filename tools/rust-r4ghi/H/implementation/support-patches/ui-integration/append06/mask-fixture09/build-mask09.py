import pathlib,hashlib,difflib,json
own=pathlib.Path(__file__).resolve().parent
before=(own.parent/'mask-fixture08/mask-fixture08.mjs').read_bytes()
assert hashlib.sha256(before).hexdigest()=='1ab29d00b62867a5f17ca314e4a457d9ae8f15ddda905f420ab06cfb73367fda'
source=before.decode('utf-8')
def replace(old,new):
 global source
 assert source.count(old)==1,old[:100]
 source=source.replace(old,new)
replace("import { MAX, maxExpenseRequest } from '../max-fixture06.mjs';", "import { MAX, maxExpenseRequest } from '../max-fixture06.mjs';\nimport { getSingleOwnedRoleUser } from './user-proof09.mjs';")
replace("""  const personUser = await call('PlatformController_getUser', { id: person.id });
  assert(personUser.isActive); assert.deepEqual(personUser.roles, [role.roleKey], 'Person has additional role assignments');""", """  const personUserAttempt = await api.request('PlatformController_getUser', { id: person.id }, null, 'manager');
  const beforeUser = getSingleOwnedRoleUser(ctx, personUserAttempt, { userId: person.id, role });
  const personUser = beforeUser.user; f.maskUserRoleProofBefore = beforeUser.proof; ctx.persist();""")
replace("  const finalUser = await call('PlatformController_getUser', { id: person.id }); assert.deepEqual(finalUser.roles, [role.roleKey]); exactPermissions(finalUser.permissions, PERSON_PERMISSIONS);", """  const finalUserAttempt = await api.request('PlatformController_getUser', { id: person.id }, null, 'manager');
  const afterUser = getSingleOwnedRoleUser(ctx, finalUserAttempt, { userId: person.id, role: finalRole });
  f.maskUserRoleProofAfter = afterUser.proof; ctx.persist();""")
source=source.replace('mask-fixture08.mjs','mask-fixture09.mjs').replace('H-mask-fixture08','H-mask-fixture09')
target=own/'mask-fixture09.mjs';assert not target.exists();target.write_bytes(source.encode('utf-8'))
patch=''.join(difflib.unified_diff(before.decode().splitlines(True),source.splitlines(True),fromfile='a/tools/rust-r4ghi/H/implementation/support-patches/ui-integration/append06/mask-fixture08/mask-fixture08.mjs',tofile='b/tools/rust-r4ghi/H/implementation/support-patches/ui-integration/append06/mask-fixture08/mask-fixture08.mjs'))
(own/'mask09.patch').write_text(patch,encoding='utf-8',newline='')
print(json.dumps({'candidateSHA256':hashlib.sha256(target.read_bytes()).hexdigest(),'sealedOriginalUnchanged':hashlib.sha256((own.parent/'mask-fixture08/mask-fixture08.mjs').read_bytes()).hexdigest()}))
