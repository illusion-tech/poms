import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { DEV_USERS } from '../app/core/platform/dev-platform.fixtures';
import { loadValidatedEnv } from '../config/load-env';
import { DEV_CONTRACT_SEEDS, DEV_PROJECT_SEEDS } from './dev-seed-data';

export class DatabaseSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const schema = loadValidatedEnv().DB_SCHEMA;
        const connection = em.getConnection();

        for (const project of DEV_PROJECT_SEEDS) {
            await connection.execute(`
                insert into "${schema}"."project" (
                    "id",
                    "project_code",
                    "project_name",
                    "customer_id",
                    "status",
                    "current_stage",
                    "owner_org_id",
                    "owner_user_id",
                    "planned_sign_at",
                    "created_by",
                    "updated_by"
                )
                values (
                    ${sqlValue(project.id)},
                    ${sqlValue(project.projectCode)},
                    ${sqlValue(project.projectName)},
                    ${sqlUuid(project.customerId)},
                    ${sqlValue(project.status)},
                    ${sqlValue(project.currentStage)},
                    ${sqlUuid(project.ownerOrgId)},
                    ${sqlUuid(project.ownerUserId)},
                    ${sqlTimestamp(project.plannedSignAt)},
                    ${sqlUuid(project.createdBy)},
                    ${sqlUuid(project.updatedBy)}
                )
                on conflict ("project_code") do update
                set
                    "project_name" = excluded."project_name",
                    "customer_id" = excluded."customer_id",
                    "status" = excluded."status",
                    "current_stage" = excluded."current_stage",
                    "owner_org_id" = excluded."owner_org_id",
                    "owner_user_id" = excluded."owner_user_id",
                    "planned_sign_at" = excluded."planned_sign_at",
                    "updated_by" = excluded."updated_by",
                    "updated_at" = now();
            `);
        }

        for (const contract of DEV_CONTRACT_SEEDS) {
            await connection.execute(`
                insert into "${schema}"."contract" (
                    "id",
                    "project_id",
                    "contract_no",
                    "status",
                    "signed_amount",
                    "currency_code",
                    "current_snapshot_id",
                    "signed_at",
                    "created_by",
                    "updated_by"
                )
                values (
                    ${sqlValue(contract.id)},
                    ${sqlValue(contract.projectId)},
                    ${sqlValue(contract.contractNo)},
                    ${sqlValue(contract.status)},
                    ${sqlValue(contract.signedAmount)},
                    ${sqlValue(contract.currencyCode)},
                    ${sqlUuid(contract.currentSnapshotId)},
                    ${sqlTimestamp(contract.signedAt)},
                    ${sqlUuid(contract.createdBy)},
                    ${sqlUuid(contract.updatedBy)}
                )
                on conflict ("contract_no") do update
                set
                    "project_id" = excluded."project_id",
                    "status" = excluded."status",
                    "signed_amount" = excluded."signed_amount",
                    "currency_code" = excluded."currency_code",
                    "current_snapshot_id" = excluded."current_snapshot_id",
                    "signed_at" = excluded."signed_at",
                    "updated_by" = excluded."updated_by",
                    "updated_at" = now();
            `);
        }

        console.log(
            `Seeded ${DEV_PROJECT_SEEDS.length} projects and ${DEV_CONTRACT_SEEDS.length} contracts in schema "${schema}".`
        );
        console.log(
            `Dev auth fixtures remain in-memory until platform tables land: ${DEV_USERS.map((user) => user.username).join(', ')}.`
        );
    }
}

function sqlValue(value: string): string {
    return `'${value.replaceAll("'", "''")}'`;
}

function sqlUuid(value: string | null): string {
    return value === null ? 'null' : sqlValue(value);
}

function sqlTimestamp(value: string | null): string {
    return value === null ? 'null' : `${sqlValue(value)}::timestamptz`;
}
