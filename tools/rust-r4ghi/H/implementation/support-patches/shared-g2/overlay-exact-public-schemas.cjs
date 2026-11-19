// Root OpenAPI integration proposal. Zod validates frozen conditionals at
// runtime, while its JSON-schema renderer cannot retain every allOf/oneOf
// refinement. This raw2020-12 overlay is safe only for an explicit OAS3.1
// document. The existing product is OAS3.0: Root must use its versioned dialect
// normalization before publishing; this helper refuses a silent dialect change.
// This file is a library and performs no I/O or product mutation on import.
function object(value){return typeof value==='object'&&value!==null&&!Array.isArray(value);}
function overlayExactR4GhiPublicSchemas(document,source){
    if(!object(document)||!object(source)||!object(source.components)||!object(source.components.schemas))throw new Error('Expected structured OpenAPI/schema documents');
    if(typeof document.openapi!=='string'||!document.openapi.startsWith('3.1.'))throw new Error('Raw approved JSON Schema requires explicit OAS3.1; existing OAS3.0 needs Root dialect normalization');
    const schemas=source.components.schemas;if(Object.keys(schemas).length!==129)throw new Error('Expected exactly the approved129 public schemas');
    if(!object(document.components))document.components={};if(!object(document.components.schemas))document.components.schemas={};
    for(const[name,schema]of Object.entries(schemas)){if(!object(schema))throw new Error(`Invalid approved schema: ${name}`);document.components.schemas[name]=structuredClone(schema);}
    return document;
}
module.exports={overlayExactR4GhiPublicSchemas};
