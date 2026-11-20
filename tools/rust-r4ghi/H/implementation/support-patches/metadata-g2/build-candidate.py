from pathlib import Path
import hashlib,json,difflib

here=Path(__file__).resolve().parent
root=Path('E:/projects/worktrees/poms-r3hijk-next28/poms')
changes=[]
def change(rel,mutate):
    raw=(root/rel).read_bytes();old=raw.decode('utf8');new=mutate(old)
    target=here/'proposed'/rel;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(new.encode('utf8'))
    changes.append({'path':rel,'originalSHA256':hashlib.sha256(raw).hexdigest(),'proposedSHA256':hashlib.sha256(new.encode()).hexdigest()})
    return ''.join(difflib.unified_diff(old.splitlines(True),new.splitlines(True),fromfile='a/'+rel,tofile='b/'+rel))
def once(text,old,new):
    assert text.count(old)==1,(old,text.count(old))
    return text.replace(old,new)
def const(s):
    eol='\r\n' if '\r\n' in s else '\n'
    return s+f"export const SELF_ORIGINAL_TYPE_KEY = `${{PREFIX}}-original-type`;{eol}"
def dto(s):
    eol='\r\n' if '\r\n' in s else '\n'
    s=once(s,'  SELF_REQUIRED_KEY,','  SELF_REQUIRED_KEY,'+eol+'  SELF_ORIGINAL_TYPE_KEY,')
    s=once(s,"    if (typeof propertySchema.type !== 'string') {",'''    // Swagger removes an explicitly declared type beside allOf/oneOf/anyOf.
    // Preserve the original JSON Schema type so cleanup restores its constraint.
    if (
      typeof propertySchema.type === 'string' &&
      ('allOf' in propertySchema || 'oneOf' in propertySchema || 'anyOf' in propertySchema)
    ) {
      newPropertySchema[SELF_ORIGINAL_TYPE_KEY] = propertySchema.type;
    }

    if (typeof propertySchema.type !== 'string') {'''.replace('\n',eol))
    s=once(s,"    if (typeof jsonSchema.additionalProperties === 'boolean') {",'''    if (
      typeof jsonSchema.additionalProperties === 'boolean' ||
      (jsonSchema.additionalProperties !== null &&
        typeof jsonSchema.additionalProperties === 'object')
    ) {'''.replace('\n',eol))
    return s
def cleanup(s):
    eol='\r\n' if '\r\n' in s else '\n'
    s=once(s,'  SELF_REQUIRED_KEY,','  SELF_REQUIRED_KEY,'+eol+'  SELF_ORIGINAL_TYPE_KEY,')
    s=once(s,'    // Remove `type` if we added `type: \'\'`', '''    // Restore the actual JSON Schema constraint lost by Swagger's combinator
    // metadata handling; this also keeps direct DTO and nested $defs identical.
    if (SELF_ORIGINAL_TYPE_KEY in propertySchema) {
      const originalType = propertySchema[SELF_ORIGINAL_TYPE_KEY];
      if (typeof originalType === 'string') {
        Object.assign(propertySchema, { type: originalType });
      }
      delete propertySchema[SELF_ORIGINAL_TYPE_KEY];
    }

    // Remove `type` if we added `type: ''`'''.replace('\n',eol))
    s=once(s,"      typeof propertySchema[PARENT_ADDITIONAL_PROPERTIES_KEY] === 'boolean'",'''      (typeof propertySchema[PARENT_ADDITIONAL_PROPERTIES_KEY] === 'boolean' ||
        (propertySchema[PARENT_ADDITIONAL_PROPERTIES_KEY] !== null &&
          typeof propertySchema[PARENT_ADDITIONAL_PROPERTIES_KEY] === 'object'))'''.replace('\n',eol))
    s=once(s,'  // nestjs seems to move some stuff out of the schema and into the root level of the parameter object 🤷','''  if (SELF_ORIGINAL_TYPE_KEY in parameter) {
    const originalType = parameter[SELF_ORIGINAL_TYPE_KEY];
    if (typeof originalType === 'string' && 'schema' in parameter && parameter.schema) {
      Object.assign(parameter.schema, { type: originalType });
    }
    delete parameter[SELF_ORIGINAL_TYPE_KEY];
  }

  // nestjs seems to move some stuff out of the schema and into the root level of the parameter object 🤷'''.replace('\n',eol))
    return s
patch=''
for name,mutate in [('const.ts',const),('dto.ts',dto),('cleanupOpenApiDoc.ts',cleanup)]:
    patch+=change('libs/vendor/nestjs-zod/src/'+name,mutate)
(here/'metadata-preservation.patch').write_bytes(patch.encode())
(here/'manifest.json').write_text(json.dumps({'status':'candidate-not-promoted','files':changes},indent=2)+'\n',encoding='utf8')
