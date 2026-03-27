import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { DEV_USERS } from '../app/core/platform/dev-platform.fixtures';
import { loadValidatedEnv } from '../config/load-env';
import { DEV_CONTRACT_SEEDS, DEV_PROJECT_SEEDS } from './dev-seed-data';

export class DatabaseSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const schema = loadValidatedEnv().DB_SCHEMA;
        const connection = em.getConnection();
        const seededPlatformUsernames = DEV_USERS.map((user) => sqlValue(user.username)).join(', ');
        const seededProjectCodes = DEV_PROJECT_SEEDS.map((project) => sqlValue(project.projectCode)).join(', ');

        await connection.execute(`
            delete from "${schema}"."role_permission_assignment"
            where "role_id" in (
                select "id" from "${schema}"."role"
                where "role_key" in ('platform-admin', 'project-viewer')
                    or "role_key" like 'e2e-%'
            );
        `);

        await connection.execute(`
            delete from "${schema}"."user_role_assignment"
            where "user_id" in (
                select "id" from "${schema}"."platform_user"
                where "username" in (${seededPlatformUsernames})
            )
            or "role_id" in (
                select "id" from "${schema}"."role"
                where "role_key" like 'e2e-%'
            );
        `);

        await connection.execute(`
            delete from "${schema}"."user_org_membership"
            where "user_id" in (
                select "id" from "${schema}"."platform_user"
                where "username" in (${seededPlatformUsernames})
            );
        `);

        await connection.execute(`
            delete from "${schema}"."platform_user"
            where "username" in (${seededPlatformUsernames});
        `);

        await connection.execute(`
            delete from "${schema}"."role"
            where "role_key" in ('platform-admin', 'project-viewer')
                or "role_key" like 'e2e-%';
        `);

        await connection.execute(`
            delete from "${schema}"."org_unit"
            where "code" in ('SALES-HQ', 'SALES-SOUTH-1');
        `);

        // 清理历史 e2e 脏数据，避免测试数据跨运行累积影响稳定性
        await connection.execute(`
            delete from "${schema}"."todo_item"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" like 'E2E-%'
            );
        `);

        await connection.execute(`
            delete from "${schema}"."approval_record"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" like 'E2E-%'
            );
        `);

        await connection.execute(`
            delete from "${schema}"."commission_adjustment"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" like 'E2E-%'
            );
        `);

        await connection.execute(`
            delete from "${schema}"."commission_payout"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" like 'E2E-%'
            );
        `);

        await connection.execute(`
            delete from "${schema}"."commission_calculation"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" like 'E2E-%'
            );
        `);

        await connection.execute(`
            delete from "${schema}"."commission_role_assignment"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" like 'E2E-%'
            );
        `);

        await connection.execute(`
            delete from "${schema}"."contract"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" like 'E2E-%'
            );
        `);

        await connection.execute(`
            delete from "${schema}"."project"
            where "project_code" like 'E2E-%';
        `);

        await connection.execute(`
            delete from "${schema}"."commission_rule_version"
            where "rule_code" like '000-E2E-%';
        `);

        // 级联清理所有引用种子项目的数据（不仅限于种子合同，避免测试期间 API 创建的数据阻塞删除）
        await connection.execute(`
            delete from "${schema}"."payment_record"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" in (${seededProjectCodes})
            );
        `);

        await connection.execute(`
            delete from "${schema}"."receipt_record"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" in (${seededProjectCodes})
            );
        `);

        await connection.execute(`
            delete from "${schema}"."todo_item"
            where "target_object_id" in (
                select "id" from "${schema}"."contract"
                where "project_id" in (
                    select "id" from "${schema}"."project"
                    where "project_code" in (${seededProjectCodes})
                )
            );
        `);

        await connection.execute(`
            delete from "${schema}"."approval_record"
            where "target_object_id" in (
                select "id" from "${schema}"."contract"
                where "project_id" in (
                    select "id" from "${schema}"."project"
                    where "project_code" in (${seededProjectCodes})
                )
            );
        `);

        await connection.execute(`
            delete from "${schema}"."contract"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" in (${seededProjectCodes})
            );
        `);

        await connection.execute(`
            delete from "${schema}"."project"
            where "project_code" in (${seededProjectCodes});
        `);

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

        await connection.execute(`
            insert into "${schema}"."org_unit" ("id", "name", "code", "description") values
            ('10000000-0000-4000-8000-000000000001', '销售管理中心', 'SALES-HQ', '开发环境默认平台组织单元'),
            ('10000000-0000-4000-8000-000000000002', '华南销售一部', 'SALES-SOUTH-1', '开发环境默认业务组织单元');
        `);

        await connection.execute(`
            insert into "${schema}"."role" ("id", "role_key", "name", "description", "is_system_role") values
            ('30000000-0000-4000-8000-000000000001', 'platform-admin', '平台管理员', '开发环境默认平台管理员角色', true),
            ('30000000-0000-4000-8000-000000000002', 'project-viewer', '项目只读角色', '开发环境默认项目只读角色', true);
        `);

        // password_hash values are bcrypt(cost=10) hashes of dev passwords: admin=admin123, viewer=viewer123
        await connection.execute(`
            insert into "${schema}"."platform_user" ("id", "username", "password_hash", "display_name", "primary_org_unit_id") values
            ('00000000-0000-4000-8000-000000000001', 'admin', '$2b$10$7RUdPn9mRzZHu8aQWDT5Zu0wrexzWNsIMcib8BtFqaM9SDz4.0LhW', '超级管理员', '10000000-0000-4000-8000-000000000001'),
            ('00000000-0000-4000-8000-000000000002', 'viewer', '$2b$10$F7jcXHdsWWNU..qTlkkcB.k9/4efsaoJmTI4.TMyCKfIsNJfq..cm', '只读用户', '10000000-0000-4000-8000-000000000002');
        `);

        await connection.execute(`
            insert into "${schema}"."user_org_membership" ("id", "user_id", "org_unit_id", "membership_type") values
            ('40000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'primary'),
            ('40000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'primary');
        `);

        await connection.execute(`
            insert into "${schema}"."user_role_assignment" ("id", "user_id", "role_id") values
            ('50000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001'),
            ('50000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002');
        `);

        await connection.execute(`
            insert into "${schema}"."role_permission_assignment" ("id", "role_id", "permission_key") values
            ('60000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'platform:users:manage'),
            ('60000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'platform:roles:manage'),
            ('60000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', 'platform:navigation:manage'),
            ('60000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000001', 'platform:org-units:manage'),
            ('60000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000001', 'commission:rule-versions:manage'),
            ('60000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000001', 'commission:assignments:manage'),
            ('60000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000001', 'commission:calculations:manage'),
            ('60000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000001', 'commission:payouts:manage'),
            ('60000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000001', 'commission:adjustments:manage'),
            ('60000000-0000-4000-8000-000000000010', '30000000-0000-4000-8000-000000000001', 'contract:finance:manage'),
            ('60000000-0000-4000-8000-000000000011', '30000000-0000-4000-8000-000000000001', 'project:read'),
            ('60000000-0000-4000-8000-000000000012', '30000000-0000-4000-8000-000000000001', 'project:write'),
            ('60000000-0000-4000-8000-000000000013', '30000000-0000-4000-8000-000000000001', 'project:delete'),
            ('60000000-0000-4000-8000-000000000014', '30000000-0000-4000-8000-000000000001', 'nav:dashboard:view'),
            ('60000000-0000-4000-8000-000000000015', '30000000-0000-4000-8000-000000000001', 'nav:platform:view'),
            ('60000000-0000-4000-8000-000000000016', '30000000-0000-4000-8000-000000000001', 'nav:projects:view'),
            ('60000000-0000-4000-8000-000000000017', '30000000-0000-4000-8000-000000000001', 'nav:contracts:view'),
            ('60000000-0000-4000-8000-000000000018', '30000000-0000-4000-8000-000000000001', 'nav:profile:view'),
            ('60000000-0000-4000-8000-000000000019', '30000000-0000-4000-8000-000000000002', 'project:read'),
            ('60000000-0000-4000-8000-000000000020', '30000000-0000-4000-8000-000000000002', 'nav:dashboard:view'),
            ('60000000-0000-4000-8000-000000000021', '30000000-0000-4000-8000-000000000002', 'nav:projects:view'),
            ('60000000-0000-4000-8000-000000000022', '30000000-0000-4000-8000-000000000002', 'nav:contracts:view'),
            ('60000000-0000-4000-8000-000000000023', '30000000-0000-4000-8000-000000000002', 'nav:profile:view');
        `);

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

        console.log(`Seeded ${DEV_PROJECT_SEEDS.length} projects, ${DEV_CONTRACT_SEEDS.length} contracts and ${DEV_USERS.length} platform users in schema "${schema}".`);
        console.log(`Login now uses real platform data (bcrypt password_hash). Dev fixture fallback remains for transition. Users: ${DEV_USERS.map((u) => u.username).join(', ')}.`);
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
