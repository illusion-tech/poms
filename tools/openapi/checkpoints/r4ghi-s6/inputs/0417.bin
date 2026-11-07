// Strict, bounded JSON-Schema2020-12 -> OAS3.0 proposal. Pure library: no I/O.
// Reuses the existing canonical converter only on preflighted atomic nodes.
const ATOMIC=new Set(['type','const','enum','title','description','format','default','deprecated','readOnly','writeOnly','discriminator','externalDocs','xml','example','multipleOf','maximum','minimum','exclusiveMaximum','exclusiveMinimum','maxLength','minLength','pattern','maxItems','minItems','uniqueItems','maxProperties','minProperties','required']);
const CHILDREN=new Set(['properties','items','additionalProperties','not','allOf','anyOf','oneOf']);
const CONDITIONAL=new Set(['if','then','else']);
const TYPES=new Set(['string','number','integer','boolean','array','object','null']);
function object(value){return typeof value==='object'&&value!==null&&!Array.isArray(value);}
function clone(value){return structuredClone(value);}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
class NormalizationBlocked extends Error{constructor(code,pointer){super(`OAS3.0 normalization blocked: ${code} at ${pointer}`);this.code=code;this.pointer=pointer;}}
function stop(code,path){throw new NormalizationBlocked(code,path);}
function typed(value,type){return type==='null'?value===null:type==='integer'?typeof value==='number'&&Number.isInteger(value):type==='number'?typeof value==='number'&&Number.isFinite(value):type==='array'?Array.isArray(value):type==='object'?object(value):typeof value===type;}
function pointer(key){return String(key).replaceAll('~','~0').replaceAll('/','~1');}

function createStrictNormalizer(convertAtomic){
    if(typeof convertAtomic!=='function')throw new Error('Pass the real vendored convertToOpenApi3Point0 atomic adapter');
    function normalizeRegistry(registry){
        if(!object(registry))stop('registry_not_object','#/components/schemas');
        let jsonNodes=0;
        function json(value,path,stack=new Set()){
            if(++jsonNodes>100000)stop('json_complexity_exceeded',path);
            if(value===null||typeof value==='string'||typeof value==='boolean')return;
            if(typeof value==='number'){if(!Number.isFinite(value))stop('non_json_number',path);return;}
            if(typeof value!=='object')stop('non_json_value',path);
            if(stack.has(value))stop('cyclic_json_object',path);
            if(!Array.isArray(value)&&![Object.prototype,null].includes(Object.getPrototypeOf(value)))stop('non_plain_json_object',path);
            stack.add(value);for(const[key,child]of Object.entries(value))json(child,path+'/'+pointer(key),stack);stack.delete(value);
        }
        json(registry,'#/components/schemas');
        const report={constToEnum:0,nullOnly:[],conditionals:[],refSiblingConjunctions:[],reusedCanonicalAtomicConverter:true};let nodes=0;
        function predicate(schema,path){
            if(!object(schema))stop('conditional_predicate_not_object',path);
            const supported=new Set(['properties','required','type','const','enum','not']);
            for(const key of Object.keys(schema)){
                if(!supported.has(key))stop('conditional_predicate_requires_explicit_review',path+'/'+pointer(key));
                if(key==='properties'){
                    if(!object(schema.properties))stop('predicate_properties_not_object',path);
                    for(const[name,child]of Object.entries(schema.properties))predicate(child,path+'/properties/'+pointer(name));
                }else if(key==='not')predicate(schema.not,path+'/not');
            }
        }
        function normalize(schema,path,depth=0){
            if(++nodes>50000||depth>128)stop('schema_complexity_exceeded',path);
            if(!object(schema))stop('schema_not_object',path);
            for(const key of Object.keys(schema))if(!ATOMIC.has(key)&&!CHILDREN.has(key)&&!CONDITIONAL.has(key)&&key!=='$ref'&&!key.startsWith('x-'))stop('unsupported_keyword',path+'/'+pointer(key));
            if('type'in schema&&(typeof schema.type!=='string'||!TYPES.has(schema.type)))stop('unsupported_type_or_type_array',path+'/type');
            if(schema.readOnly===true||schema.writeOnly===true)stop('read_write_mode_requires_explicit_review',path);
            if(('then'in schema||'else'in schema)&&!('if'in schema))stop('dangling_conditional',path);
            if('if'in schema){
                if('oneOf'in schema||'anyOf'in schema||'$ref'in schema)stop('conditional_composition_requires_explicit_review',path);
                predicate(schema.if,path+'/if');
                const base=clone(schema);delete base.if;delete base.then;delete base.else;
                const a=normalize(schema.if,path+'/if',depth+1),yes=normalize(schema.then??{},path+'/then',depth+1),no=normalize(schema.else??{},path+'/else',depth+1);
                report.conditionals.push(path);
                // A and not(A) are disjoint. oneOf therefore selects exactly
                // the same branch as if/then/else, with no overlap heuristic.
                return{allOf:[normalize(base,path+'/base',depth+1),{oneOf:[{allOf:[a,yes]},{allOf:[{not:clone(a)},no]}]}]};
            }
            if('$ref'in schema){
                if(typeof schema.$ref!=='string'||!schema.$ref.startsWith('#/components/schemas/'))stop('external_or_invalid_ref',path+'/$ref');
                const name=schema.$ref.slice('#/components/schemas/'.length);
                if(!Object.prototype.hasOwnProperty.call(registry,name))stop('unregistered_ref',path+'/$ref');
                const sibling=clone(schema);delete sibling.$ref;
                if(Object.keys(sibling).length){report.refSiblingConjunctions.push(path);return{allOf:[{$ref:schema.$ref},normalize(sibling,path+'/ref-siblings',depth+1)]};}
                return{$ref:schema.$ref};
            }
            if('enum'in schema&&(!Array.isArray(schema.enum)||schema.enum.length===0))stop('invalid_enum',path+'/enum');
            if('const'in schema&&schema.const!==null&&typeof schema.const==='object')stop('compound_const_requires_explicit_review',path+'/const');
            if('const'in schema&&'enum'in schema&&!schema.enum.some((entry)=>same(entry,schema.const)))return{not:{}};
            if('const'in schema&&'type'in schema&&!typed(schema.const,schema.type))return{not:{}};
            const nullOnly=schema.type==='null'||('const'in schema&&schema.const===null);
            if(nullOnly){
                if('enum'in schema&&!schema.enum.some((entry)=>entry===null))return{not:{}};
                if('default'in schema&&schema.default!==null)stop('default_not_representable_in_target',path+'/default');
                const rest=clone(schema);delete rest.type;delete rest.const;delete rest.enum;
                const base=normalize(rest,path+'/null-constraints',depth+1);report.nullOnly.push(path);
                // OAS3.0 nullable only affects an explicit same-object type.
                // (object OR null) AND enum[null] admits exactly null, not {}.
                return{...base,type:'object',nullable:true,enum:[null]};
            }
            if(schema.enum?.some((value)=>value===null))stop('mixed_null_enum_requires_explicit_review',path+'/enum');
            for(const[exclusive,inclusive]of[['exclusiveMinimum','minimum'],['exclusiveMaximum','maximum']]){
                if(exclusive in schema){if(typeof schema[exclusive]!=='number'||!Number.isFinite(schema[exclusive]))stop('invalid_exclusive_bound',path+'/'+exclusive);if(inclusive in schema)stop('overlapping_numeric_bounds_requires_explicit_review',path);}
            }
            if('default'in schema&&schema.type&&!typed(schema.default,schema.type))stop('default_not_representable_in_target',path+'/default');
            const atomic={};for(const[key,value]of Object.entries(schema))if(ATOMIC.has(key)||key.startsWith('x-'))atomic[key]=clone(value);
            const output=convertAtomic(atomic);
            if(!object(output)||'const'in output||'if'in output||'type'in output&&output.type==='null')stop('canonical_atomic_adapter_failed',path);
            if('const'in schema)report.constToEnum+=1;
            if(schema.properties!==undefined){if(!object(schema.properties))stop('properties_not_object',path);output.properties=Object.fromEntries(Object.entries(schema.properties).map(([key,value])=>[key,normalize(value,path+'/properties/'+pointer(key),depth+1)]));}
            if(schema.items!==undefined){if(Array.isArray(schema.items))stop('tuple_items_not_supported',path+'/items');output.items=normalize(schema.items,path+'/items',depth+1);}
            if(schema.type==='array'&&schema.items===undefined)stop('array_items_missing',path);
            if(schema.additionalProperties!==undefined)output.additionalProperties=typeof schema.additionalProperties==='boolean'?schema.additionalProperties:normalize(schema.additionalProperties,path+'/additionalProperties',depth+1);
            if(schema.not!==undefined)output.not=normalize(schema.not,path+'/not',depth+1);
            for(const key of['allOf','anyOf','oneOf'])if(schema[key]!==undefined){if(!Array.isArray(schema[key])||schema[key].length===0)stop('empty_or_invalid_composition',path+'/'+key);output[key]=schema[key].map((child,index)=>normalize(child,path+'/'+key+'/'+index,depth+1));}
            return output;
        }
        const schemas={};for(const[name,schema]of Object.entries(registry)){if(!/^[A-Za-z][A-Za-z0-9_]*$/.test(name))stop('unsupported_component_name','#/components/schemas/'+pointer(name));schemas[name]=normalize(schema,'#/components/schemas/'+pointer(name));}
        return{schemas,report:{...report,schemaCount:Object.keys(schemas).length,nodes}};
    }
    function overlay(document,source){
        if(!object(document)||typeof document.openapi!=='string'||!document.openapi.startsWith('3.0.'))stop('target_must_remain_oas30','#/openapi');
        const registry=source?.components?.schemas;if(!object(registry)||Object.keys(registry).length!==129)stop('approved_registry_must_have_129','#/components/schemas');
        const result=normalizeRegistry(registry); // all preflight/normalization before mutation
        if(document.components!==undefined&&!object(document.components))stop('target_components_not_object','#/components');
        if(document.components?.schemas!==undefined&&!object(document.components.schemas))stop('target_schemas_not_object','#/components/schemas');
        document.components??={};document.components.schemas??={};Object.assign(document.components.schemas,result.schemas);return result.report;
    }
    return{normalizeRegistry,overlay};
}
module.exports={createStrictNormalizer,NormalizationBlocked};
