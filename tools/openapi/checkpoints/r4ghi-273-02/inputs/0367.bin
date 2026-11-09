// MikroORM 7 exposes this entry through package exports. The Native app's
// legacy Node module resolver needs the same declarations forwarded explicitly.
declare module '@mikro-orm/core/schema' {
    export const AbstractSchemaGenerator: typeof import('../../../../node_modules/@mikro-orm/core/utils/AbstractSchemaGenerator').AbstractSchemaGenerator;
    export type AbstractSchemaGenerator<D extends import('@mikro-orm/core').IDatabaseDriver> =
        import('../../../../node_modules/@mikro-orm/core/utils/AbstractSchemaGenerator').AbstractSchemaGenerator<D>;
}
