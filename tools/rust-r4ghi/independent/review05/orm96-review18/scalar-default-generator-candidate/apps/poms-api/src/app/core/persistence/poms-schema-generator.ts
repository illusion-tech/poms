import { ReferenceKind, type MikroORM } from '@mikro-orm/core';
import { DatabaseTable, EntityManager, SqlSchemaGenerator, type DatabaseSchema } from '@mikro-orm/postgresql';

/** Keep scalar defaults authoritative when a constraint-only relation reuses a column. */
export class PomsSchemaGenerator extends SqlSchemaGenerator {
    static override register(orm: MikroORM): void {
        orm.config.registerExtension('@mikro-orm/schema-generator', () => {
            if (!(orm.em instanceof EntityManager)) {
                throw new Error('PomsSchemaGenerator requires the PostgreSQL entity manager');
            }
            return new PomsSchemaGenerator(orm.em);
        });
    }

    override getTargetSchema(schema?: string): DatabaseSchema {
        const target = super.getTargetSchema(schema);
        const schemaName = schema ?? this.config.get('schema') ?? this.platform.getDefaultSchemaName();

        for (const meta of this.getOrderedMetadata(schema)) {
            if (meta.view || meta.embeddable) {
                continue;
            }
            const tableSchema = (meta.schema === '*' ? schemaName : meta.schema) ?? this.config.get('schema') ?? schemaName;
            const table = target.getTables().find((candidate) => candidate.name === meta.tableName && candidate.schema === tableSchema);
            if (!table) {
                continue;
            }

            for (const relation of meta.props) {
                if (
                    (relation.kind !== ReferenceKind.MANY_TO_ONE && relation.kind !== ReferenceKind.ONE_TO_ONE) ||
                    relation.persist === false ||
                    relation.fieldNames.length < 2 ||
                    relation.ownColumns?.length !== 0
                ) {
                    continue;
                }
                if (relation.defaultRaw !== undefined) {
                    throw new Error(`Constraint-only relation cannot declare a column default: ${meta.className}.${relation.name}`);
                }

                for (const field of relation.fieldNames) {
                    const scalars = meta.props.filter(
                        (property) =>
                            property.kind === ReferenceKind.SCALAR &&
                            property.persist !== false &&
                            !property.formula &&
                            !property.generated &&
                            property.fieldNames.length === 1 &&
                            property.fieldNames[0] === field
                    );
                    if (scalars.length > 1) {
                        throw new Error(`Ambiguous scalar column default: ${meta.className}.${field}`);
                    }
                    const scalar = scalars[0];
                    if (!scalar || scalar.defaultRaw === undefined) {
                        continue;
                    }
                    if (typeof scalar.defaultRaw !== 'string') {
                        throw new Error(`Unsupported scalar default representation: ${meta.className}.${field}`);
                    }
                    const column = table.getColumn(field);
                    if (!column) {
                        throw new Error(`Missing shared scalar target column: ${meta.className}.${field}`);
                    }
                    // Use the framework's exact scalar projection/normalization in an
                    // isolated table, then restore this field's default alone.
                    const scalarTable = new DatabaseTable(this.platform, meta.tableName, tableSchema);
                    scalarTable.addColumnFromProperty(scalar, meta, this.config);
                    const scalarColumn = scalarTable.getColumn(field);
                    if (!scalarColumn) {
                        throw new Error(`Missing scalar default projection: ${meta.className}.${field}`);
                    }
                    column.default = scalarColumn.default;
                }
            }
        }
        return target;
    }
}
