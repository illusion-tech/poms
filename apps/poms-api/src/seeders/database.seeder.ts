import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { hashSync } from 'bcryptjs';
import { DEV_USERS } from '../app/core/platform/dev-platform.fixtures';
import { loadValidatedEnv } from '../config/load-env';
import { DEV_CONTRACT_SEEDS, DEV_PROJECT_SEEDS } from './dev-seed-data';

export class DatabaseSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const schema = loadValidatedEnv().DB_SCHEMA;
        const connection = em.getConnection();
        const seededPlatformUsernames = DEV_USERS.map((user) => sqlValue(user.username)).join(', ');
        const seededProjectCodes = DEV_PROJECT_SEEDS.map((project) => sqlValue(project.projectCode)).join(', ');
        const localCredentialValues = DEV_USERS.map((user, index) => {
            const credentialId = `70000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
            const passwordHash = hashSync(user.password, 10);
            return `(${sqlValue(credentialId)}, ${sqlValue(user.id)}, ${sqlValue(passwordHash)})`;
        }).join(',\n            ');

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
            delete from "${schema}"."commission_freeze_change_request"
            where "dispute_record_id" in (
                select "id" from "${schema}"."commission_freeze_dispute_record"
                where "project_id" in (
                    select "id" from "${schema}"."project"
                    where "project_code" like 'E2E-%'
                )
            );
        `);

        await connection.execute(`
            delete from "${schema}"."commission_freeze_dispute_record"
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
            delete from "${schema}"."commission_freeze_change_request"
            where "dispute_record_id" in (
                select "id" from "${schema}"."commission_freeze_dispute_record"
                where "project_id" in (
                    select "id" from "${schema}"."project"
                    where "project_code" in (${seededProjectCodes})
                )
            );
        `);

        await connection.execute(`
            delete from "${schema}"."commission_freeze_dispute_record"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" in (${seededProjectCodes})
            );
        `);

        await connection.execute(`
            delete from "${schema}"."commission_adjustment"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" in (${seededProjectCodes})
            );
        `);

        await connection.execute(`
            delete from "${schema}"."commission_payout"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" in (${seededProjectCodes})
            );
        `);

        await connection.execute(`
            delete from "${schema}"."commission_calculation"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" in (${seededProjectCodes})
            );
        `);

        await connection.execute(`
            delete from "${schema}"."commission_role_assignment"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" in (${seededProjectCodes})
            );
        `);

        await connection.execute(`
            delete from "${schema}"."project_receipt_judgment_freeze"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" like 'E2E-%'
            );
        `);

        await connection.execute(`
            delete from "${schema}"."confirmation_participant"
            where "confirmation_record_id" in (
                select "id" from "${schema}"."confirmation_record"
                where "project_id" in (
                    select "id" from "${schema}"."project"
                    where "project_code" like 'E2E-%'
                )
                or (
                    "target_type" = 'ProjectHandover'
                    and "target_id" in (
                        select "id" from "${schema}"."project_handover"
                        where "project_id" in (
                            select "id" from "${schema}"."project"
                            where "project_code" like 'E2E-%'
                        )
                    )
                )
            );
        `);

        await connection.execute(`
            delete from "${schema}"."confirmation_record"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" like 'E2E-%'
            )
            or (
                "target_type" = 'ProjectHandover'
                and "target_id" in (
                    select "id" from "${schema}"."project_handover"
                    where "project_id" in (
                        select "id" from "${schema}"."project"
                        where "project_code" like 'E2E-%'
                    )
                )
            );
        `);

        await connection.execute(`
            delete from "${schema}"."handover_baseline_impact_item"
            where "rebaseline_record_id" in (
                select "id" from "${schema}"."contract_handover_rebaseline_record"
                where "project_id" in (
                    select "id" from "${schema}"."project"
                    where "project_code" like 'E2E-%'
                )
            );
        `);

        await connection.execute(`
            delete from "${schema}"."project_handover"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" like 'E2E-%'
            );
        `);

        await connection.execute(`
            delete from "${schema}"."approval_summary_field_projection"
            where "summary_snapshot_id" in (
                select "id" from "${schema}"."approval_summary_snapshot"
                where (
                    "target_type" = 'Project'
                    and "target_id" in (
                        select "id" from "${schema}"."project"
                        where "project_code" like 'E2E-%'
                    )
                )
                or (
                    "target_type" = 'ProjectHandover'
                    and "summary_package_key" = 'project-handover-confirmation'
                )
            );
        `);

        await connection.execute(`
            delete from "${schema}"."approval_summary_snapshot"
            where (
                "target_type" = 'Project'
                and "target_id" in (
                    select "id" from "${schema}"."project"
                    where "project_code" like 'E2E-%'
                )
            )
            or (
                "target_type" = 'ProjectHandover'
                and "summary_package_key" = 'project-handover-confirmation'
            );
        `);

        await connection.execute(`
            delete from "${schema}"."operating_restatement_record"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" like 'E2E-%'
            );
        `);

        await connection.execute(`
            delete from "${schema}"."project_operating_snapshot"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" like 'E2E-%'
            );
        `);

        await connection.execute(`
            delete from "${schema}"."period_closing_snapshot"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" like 'E2E-%'
            );
        `);

        await connection.execute(`
            delete from "${schema}"."change_package_baseline"
            where "baseline_package_id" in (
                select "id" from "${schema}"."operating_baseline_package"
                where "project_id" in (
                    select "id" from "${schema}"."project"
                    where "project_code" like 'E2E-%'
                )
            );
        `);

        await connection.execute(`
            delete from "${schema}"."operating_baseline_package"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" like 'E2E-%'
            );
        `);

        await connection.execute(`
            delete from "${schema}"."shared_cost_allocation_result"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" like 'E2E-%'
            );
        `);

        await connection.execute(`
            delete from "${schema}"."accounting_tax_treatment_snapshot"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" like 'E2E-%'
            );
        `);

        await connection.execute(`
            delete from "${schema}"."cost_stage_attribution_snapshot"
            where "cost_record_id" in (
                select "id" from "${schema}"."project_actual_cost_record"
                where "project_id" in (
                    select "id" from "${schema}"."project"
                    where "project_code" like 'E2E-%'
                )
            );
        `);

        await connection.execute(`
            delete from "${schema}"."project_actual_cost_record"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" like 'E2E-%'
            );
        `);

        await connection.execute(`
            delete from "${schema}"."contract_handover_rebaseline_record"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" like 'E2E-%'
            );
        `);

        await connection.execute(`
            delete from "${schema}"."contract_amendment"
            where "contract_id" in (
                select "id" from "${schema}"."contract"
                where "project_id" in (
                    select "id" from "${schema}"."project"
                    where "project_code" like 'E2E-%'
                )
            );
        `);

        await connection.execute(`
            delete from "${schema}"."contract_term_snapshot"
            where "contract_id" in (
                select "id" from "${schema}"."contract"
                where "project_id" in (
                    select "id" from "${schema}"."project"
                    where "project_code" like 'E2E-%'
                )
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

        await connection.execute(`
            delete from "${schema}"."internal_cost_rate_version"
            where "role_code" like 'dev-%'
                or "role_code" like 'qa-%'
                or "rate_key" like 'ROLE:dev-%'
                or "rate_key" like 'ROLE:qa-%';
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
            delete from "${schema}"."project_receipt_judgment_freeze"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" in (${seededProjectCodes})
            );
        `);

        await connection.execute(`
            delete from "${schema}"."confirmation_participant"
            where "confirmation_record_id" in (
                select "id" from "${schema}"."confirmation_record"
                where "project_id" in (
                    select "id" from "${schema}"."project"
                    where "project_code" in (${seededProjectCodes})
                )
                or (
                    "target_type" = 'ProjectHandover'
                    and "target_id" in (
                        select "id" from "${schema}"."project_handover"
                        where "project_id" in (
                            select "id" from "${schema}"."project"
                            where "project_code" in (${seededProjectCodes})
                        )
                    )
                )
            );
        `);

        await connection.execute(`
            delete from "${schema}"."confirmation_record"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" in (${seededProjectCodes})
            )
            or (
                "target_type" = 'ProjectHandover'
                and "target_id" in (
                    select "id" from "${schema}"."project_handover"
                    where "project_id" in (
                        select "id" from "${schema}"."project"
                        where "project_code" in (${seededProjectCodes})
                    )
                )
            );
        `);

        await connection.execute(`
            delete from "${schema}"."handover_baseline_impact_item"
            where "rebaseline_record_id" in (
                select "id" from "${schema}"."contract_handover_rebaseline_record"
                where "project_id" in (
                    select "id" from "${schema}"."project"
                    where "project_code" in (${seededProjectCodes})
                )
            );
        `);

        await connection.execute(`
            delete from "${schema}"."project_handover"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" in (${seededProjectCodes})
            );
        `);

        await connection.execute(`
            delete from "${schema}"."approval_summary_field_projection"
            where "summary_snapshot_id" in (
                select "id" from "${schema}"."approval_summary_snapshot"
                where (
                    "target_type" = 'Project'
                    and "target_id" in (
                        select "id" from "${schema}"."project"
                        where "project_code" in (${seededProjectCodes})
                    )
                )
                or (
                    "target_type" = 'ProjectHandover'
                    and "summary_package_key" = 'project-handover-confirmation'
                )
            );
        `);

        await connection.execute(`
            delete from "${schema}"."approval_summary_snapshot"
            where (
                "target_type" = 'Project'
                and "target_id" in (
                    select "id" from "${schema}"."project"
                    where "project_code" in (${seededProjectCodes})
                )
            )
            or (
                "target_type" = 'ProjectHandover'
                and "summary_package_key" = 'project-handover-confirmation'
            );
        `);

        await connection.execute(`
            delete from "${schema}"."operating_restatement_record"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" in (${seededProjectCodes})
            );
        `);

        await connection.execute(`
            delete from "${schema}"."project_operating_snapshot"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" in (${seededProjectCodes})
            );
        `);

        await connection.execute(`
            delete from "${schema}"."period_closing_snapshot"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" in (${seededProjectCodes})
            );
        `);

        await connection.execute(`
            delete from "${schema}"."change_package_baseline"
            where "baseline_package_id" in (
                select "id" from "${schema}"."operating_baseline_package"
                where "project_id" in (
                    select "id" from "${schema}"."project"
                    where "project_code" in (${seededProjectCodes})
                )
            );
        `);

        await connection.execute(`
            delete from "${schema}"."operating_baseline_package"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" in (${seededProjectCodes})
            );
        `);

        await connection.execute(`
            delete from "${schema}"."shared_cost_allocation_result"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" in (${seededProjectCodes})
            );
        `);

        await connection.execute(`
            delete from "${schema}"."accounting_tax_treatment_snapshot"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" in (${seededProjectCodes})
            );
        `);

        await connection.execute(`
            delete from "${schema}"."cost_stage_attribution_snapshot"
            where "cost_record_id" in (
                select "id" from "${schema}"."project_actual_cost_record"
                where "project_id" in (
                    select "id" from "${schema}"."project"
                    where "project_code" in (${seededProjectCodes})
                )
            );
        `);

        await connection.execute(`
            delete from "${schema}"."project_actual_cost_record"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" in (${seededProjectCodes})
            );
        `);

        await connection.execute(`
            delete from "${schema}"."contract_handover_rebaseline_record"
            where "project_id" in (
                select "id" from "${schema}"."project"
                where "project_code" in (${seededProjectCodes})
            );
        `);

        await connection.execute(`
            delete from "${schema}"."contract_amendment"
            where "contract_id" in (
                select "id" from "${schema}"."contract"
                where "project_id" in (
                    select "id" from "${schema}"."project"
                    where "project_code" in (${seededProjectCodes})
                )
            );
        `);

        await connection.execute(`
            delete from "${schema}"."contract_term_snapshot"
            where "contract_id" in (
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

        await connection.execute(`
            insert into "${schema}"."platform_user" ("id", "username", "display_name", "is_active", "primary_org_unit_id") values
            ('00000000-0000-4000-8000-000000000001', 'admin', '超级管理员', true, '10000000-0000-4000-8000-000000000001'),
            ('00000000-0000-4000-8000-000000000002', 'viewer', '只读用户', true, '10000000-0000-4000-8000-000000000002');
        `);

        // local_credential.user_id has ON DELETE CASCADE, so delete from platform_user cleans these up automatically
        await connection.execute(`
            insert into "${schema}"."local_credential" ("id", "user_id", "password_hash") values
            ${localCredentialValues};
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

        await seedProjectHandoverE2EFixtures(connection, schema);

        console.log(`Seeded ${DEV_PROJECT_SEEDS.length} projects, ${DEV_CONTRACT_SEEDS.length} contracts and ${DEV_USERS.length} platform users in schema "${schema}".`);
        console.log(`Credentials stored in local_credential (separate from platform_user). Users: ${DEV_USERS.map((u) => u.username).join(', ')}.`);
    }
}

interface HandoverE2EFixture {
    key: string;
    projectId: string;
    projectCode: string;
    projectName: string;
    contractId: string;
    contractNo: string;
    contractSnapshotId: string;
    baselineId: string;
    diffResultId: string;
    readinessPackageId: string;
    receivablePlanVersionId: string;
    contractSummarySnapshotId?: string;
    handoverSummarySnapshotId?: string;
    handoverId?: string;
    confirmationRecordId?: string;
    processingRebaselineRecordId?: string;
    amendmentId?: string;
    contractStatus?: string;
    confirmedReceiptAmount?: string;
    confirmedPaymentAmountExcludingTax?: string;
    receiptRecordId?: string;
    paymentRecordId?: string;
    handoverStatus?: 'draft' | 'confirmed';
    receiptJudgmentFreezeId?: string;
    receiptJudgmentMode?: string;
}

interface HandoverE2EFixtureOptions {
    contractStatus?: string;
    confirmedReceiptAmount?: string;
    confirmedPaymentAmountExcludingTax?: string;
    handoverStatus?: 'draft' | 'confirmed';
    receiptJudgmentMode?: string;
}

type PreparedHandoverE2EFixture = HandoverE2EFixture &
    Required<Pick<HandoverE2EFixture, 'contractSummarySnapshotId' | 'handoverSummarySnapshotId' | 'handoverId' | 'confirmationRecordId'>>;

type ProcessingRebaselineFixture = PreparedHandoverE2EFixture &
    Required<Pick<HandoverE2EFixture, 'processingRebaselineRecordId' | 'amendmentId'>>;

const E2E_ACTOR_ID = '00000000-0000-4000-8000-000000000001';
const E2E_VIEWER_ID = '00000000-0000-4000-8000-000000000002';
const CONTRACT_HANDOVER_SUMMARY_PACKAGE_ID = '68000000-0000-4000-8000-000000000001';
const PROJECT_HANDOVER_SUMMARY_PACKAGE_ID = '68000000-0000-4000-8000-000000000002';

const HANDOVER_E2E_FIXTURES: HandoverE2EFixture[] = [
    makeHandoverE2EFixture(1, 'summary-missing', false),
    makeHandoverE2EFixture(2, 'main', true),
    makeHandoverE2EFixture(3, 'stale-version', true),
    makeHandoverE2EFixture(4, 'missing-participant', true),
    makeHandoverE2EFixture(5, 'processing-rebaseline', true, true)
];

const COMMISSION_E2E_FIXTURES: HandoverE2EFixture[] = [
    {
        ...makeHandoverE2EFixture(101, 'commission-main', true, false, {
            confirmedReceiptAmount: '100000.00',
            confirmedPaymentAmountExcludingTax: '70000.00',
            handoverStatus: 'confirmed',
            receiptJudgmentMode: 'net-receipt'
        }),
        projectCode: 'E2E-CMS-FXT-MAIN',
        projectName: 'E2E 提成正式冻结 main',
        contractNo: 'E2E-CMS-HT-MAIN'
    },
    {
        ...makeHandoverE2EFixture(102, 'commission-no-active-contract', true, false, {
            contractStatus: 'pending-review',
            handoverStatus: 'confirmed',
            receiptJudgmentMode: 'net-receipt'
        }),
        projectCode: 'E2E-CMS-FXT-NO-ACTIVE-CONTRACT',
        projectName: 'E2E 提成正式冻结 no-active-contract',
        contractNo: 'E2E-CMS-HT-NO-ACTIVE-CONTRACT'
    }
];

async function seedProjectHandoverE2EFixtures(
    connection: { execute(sql: string): Promise<unknown> },
    schema: string
): Promise<void> {
    await connection.execute(`
        insert into "${schema}"."approval_summary_package_definition" (
            "id",
            "approval_scenario_key",
            "summary_package_key",
            "projection_level",
            "export_policy",
            "field_rule_version",
            "status",
            "created_by",
            "updated_by"
        )
        values
            (${sqlValue(CONTRACT_HANDOVER_SUMMARY_PACKAGE_ID)}, 'handover-confirmation', 'contract-handover-summary', 'handover-confirmation', 'handover-controlled', 'e2e-v1', 'active', ${sqlUuid(E2E_ACTOR_ID)}, ${sqlUuid(E2E_ACTOR_ID)}),
            (${sqlValue(PROJECT_HANDOVER_SUMMARY_PACKAGE_ID)}, 'project-handover', 'project-handover-confirmation', 'handover-confirmation', 'handover-controlled', 'e2e-v1', 'active', ${sqlUuid(E2E_ACTOR_ID)}, ${sqlUuid(E2E_ACTOR_ID)})
        on conflict ("id") do update
        set
            "status" = excluded."status",
            "updated_by" = excluded."updated_by",
            "updated_at" = now();
    `);

    for (const fixture of [...HANDOVER_E2E_FIXTURES, ...COMMISSION_E2E_FIXTURES]) {
        await seedProjectHandoverE2EFixture(connection, schema, fixture);
    }
}

function hasPreparedHandoverFixture(fixture: HandoverE2EFixture): fixture is PreparedHandoverE2EFixture {
    return Boolean(fixture.handoverId && fixture.contractSummarySnapshotId && fixture.handoverSummarySnapshotId && fixture.confirmationRecordId);
}

function hasProcessingRebaselineFixture(fixture: PreparedHandoverE2EFixture): fixture is ProcessingRebaselineFixture {
    return Boolean(fixture.processingRebaselineRecordId && fixture.amendmentId);
}

async function seedProjectHandoverE2EFixture(
    connection: { execute(sql: string): Promise<unknown> },
    schema: string,
    fixture: HandoverE2EFixture
): Promise<void> {
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
            ${sqlValue(fixture.projectId)},
            ${sqlValue(fixture.projectCode)},
            ${sqlValue(fixture.projectName)},
            null,
            'active',
            'handover',
            ${sqlUuid('10000000-0000-4000-8000-000000000001')},
            ${sqlUuid(E2E_ACTOR_ID)},
            null,
            ${sqlUuid(E2E_ACTOR_ID)},
            ${sqlUuid(E2E_ACTOR_ID)}
        );
    `);

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
            ${sqlValue(fixture.contractId)},
            ${sqlValue(fixture.projectId)},
            ${sqlValue(fixture.contractNo)},
            ${sqlValue(fixture.contractStatus ?? 'active')},
            '188000.00',
            'CNY',
            ${sqlUuid(fixture.contractSnapshotId)},
            ${sqlTimestamp('2026-04-15T00:00:00.000Z')},
            ${sqlUuid(E2E_ACTOR_ID)},
            ${sqlUuid(E2E_ACTOR_ID)}
        );
    `);

    await connection.execute(`
        insert into "${schema}"."contract_term_snapshot" (
            "id",
            "contract_id",
            "effective_by",
            "snapshot_status",
            "created_by"
        )
        values (
            ${sqlValue(fixture.contractSnapshotId)},
            ${sqlValue(fixture.contractId)},
            ${sqlUuid(E2E_ACTOR_ID)},
            'active',
            ${sqlUuid(E2E_ACTOR_ID)}
        );
    `);

    if (fixture.confirmedReceiptAmount && fixture.receiptRecordId) {
        await connection.execute(`
            insert into "${schema}"."receipt_record" (
                "id",
                "contract_id",
                "project_id",
                "receipt_amount",
                "receipt_date",
                "source_type",
                "status",
                "confirmed_at",
                "confirmed_by"
            )
            values (
                ${sqlValue(fixture.receiptRecordId)},
                ${sqlValue(fixture.contractId)},
                ${sqlValue(fixture.projectId)},
                ${sqlValue(fixture.confirmedReceiptAmount)},
                ${sqlTimestamp('2026-04-15T00:20:00.000Z')},
                'manual',
                'confirmed',
                ${sqlTimestamp('2026-04-15T00:21:00.000Z')},
                ${sqlUuid(E2E_ACTOR_ID)}
            );
        `);
    }

    if (fixture.confirmedPaymentAmountExcludingTax && fixture.paymentRecordId) {
        await connection.execute(`
            insert into "${schema}"."payment_record" (
                "id",
                "project_id",
                "contract_id",
                "payable_record_id",
                "currency",
                "amount_excluding_tax",
                "tax_amount",
                "amount_including_tax",
                "payment_date",
                "cost_category",
                "source_type",
                "status",
                "confirmed_at",
                "confirmed_by"
            )
            values (
                ${sqlValue(fixture.paymentRecordId)},
                ${sqlValue(fixture.projectId)},
                ${sqlValue(fixture.contractId)},
                null,
                'CNY',
                ${sqlValue(fixture.confirmedPaymentAmountExcludingTax)},
                null,
                null,
                ${sqlTimestamp('2026-04-15T00:22:00.000Z')},
                'implementation',
                'manual',
                'confirmed',
                ${sqlTimestamp('2026-04-15T00:23:00.000Z')},
                ${sqlUuid(E2E_ACTOR_ID)}
            );
        `);
    }

    await connection.execute(`
        insert into "${schema}"."commercial_release_baseline" (
            "id",
            "project_id",
            "baseline_code",
            "quotation_review_id",
            "baseline_status",
            "is_current",
            "gross_margin_summary",
            "payment_terms_summary",
            "latest_diff_result_id",
            "created_by",
            "updated_by"
        )
        values (
            ${sqlValue(fixture.baselineId)},
            ${sqlValue(fixture.projectId)},
            ${sqlValue(`BL-EX08-${fixture.key}`.slice(0, 64))},
            null,
            'effective',
            true,
            'e2e 毛利结论已放行',
            'e2e 回款条款已初始化',
            null,
            ${sqlUuid(E2E_ACTOR_ID)},
            ${sqlUuid(E2E_ACTOR_ID)}
        );
    `);

    await connection.execute(`
        insert into "${schema}"."commercial_baseline_diff_result" (
            "id",
            "baseline_id",
            "project_id",
            "diff_level",
            "review_status",
            "diff_summary",
            "current_review_decision",
            "reviewed_at"
        )
        values (
            ${sqlValue(fixture.diffResultId)},
            ${sqlValue(fixture.baselineId)},
            ${sqlValue(fixture.projectId)},
            'prompt',
            'not-required',
            'e2e 无阻断差异',
            'approved',
            ${sqlTimestamp('2026-04-15T00:00:00.000Z')}
        );
    `);

    await connection.execute(`
        update "${schema}"."commercial_release_baseline"
        set "latest_diff_result_id" = ${sqlValue(fixture.diffResultId)}
        where "id" = ${sqlValue(fixture.baselineId)};
    `);

    await connection.execute(`
        insert into "${schema}"."contract_readiness_package" (
            "id",
            "project_id",
            "source_baseline_id",
            "latest_diff_result_id",
            "package_status",
            "guard_decision",
            "current_effective_decision_summary",
            "blocking_reason_summary",
            "missing_prerequisite_count",
            "initialized_contract_snapshot_id",
            "initialized_receivable_plan_version_id",
            "contract_snapshot_initialized_at",
            "receivable_plan_initialized_at",
            "is_current",
            "created_by",
            "updated_by"
        )
        values (
            ${sqlValue(fixture.readinessPackageId)},
            ${sqlValue(fixture.projectId)},
            ${sqlValue(fixture.baselineId)},
            ${sqlValue(fixture.diffResultId)},
            'ready',
            'allowed',
            'e2e 前置事项已收口',
            null,
            0,
            ${sqlUuid(fixture.contractSnapshotId)},
            ${sqlUuid(fixture.receivablePlanVersionId)},
            ${sqlTimestamp('2026-04-15T00:00:00.000Z')},
            ${sqlTimestamp('2026-04-15T00:05:00.000Z')},
            true,
            ${sqlUuid(E2E_ACTOR_ID)},
            ${sqlUuid(E2E_ACTOR_ID)}
        );
    `);

    if (!hasPreparedHandoverFixture(fixture)) {
        return;
    }

    await seedProjectHandoverPreparedState(connection, schema, fixture);
}

async function seedProjectHandoverPreparedState(
    connection: { execute(sql: string): Promise<unknown> },
    schema: string,
    fixture: PreparedHandoverE2EFixture
): Promise<void> {
    await connection.execute(`
        insert into "${schema}"."approval_summary_snapshot" (
            "id",
            "target_type",
            "target_id",
            "approval_scenario_key",
            "summary_package_id",
            "summary_package_key",
            "projection_level",
            "export_policy",
            "business_status_at_snapshot",
            "generated_at",
            "status",
            "created_by",
            "updated_by"
        )
        values
            (${sqlValue(fixture.contractSummarySnapshotId)}, 'Project', ${sqlValue(fixture.projectId)}, 'handover-confirmation', ${sqlValue(CONTRACT_HANDOVER_SUMMARY_PACKAGE_ID)}, 'contract-handover-summary', 'handover-confirmation', 'handover-controlled', 'ready-for-handover', ${sqlTimestamp('2026-04-15T00:10:00.000Z')}, 'active', ${sqlUuid(E2E_ACTOR_ID)}, ${sqlUuid(E2E_ACTOR_ID)}),
            (${sqlValue(fixture.handoverSummarySnapshotId)}, 'ProjectHandover', ${sqlValue(fixture.handoverId)}, 'project-handover', ${sqlValue(PROJECT_HANDOVER_SUMMARY_PACKAGE_ID)}, 'project-handover-confirmation', 'handover-confirmation', 'handover-controlled', 'draft', ${sqlTimestamp('2026-04-15T00:11:00.000Z')}, 'active', ${sqlUuid(E2E_ACTOR_ID)}, ${sqlUuid(E2E_ACTOR_ID)});
    `);

    await connection.execute(`
        insert into "${schema}"."project_handover" (
            "id",
            "project_id",
            "contract_summary_snapshot_id",
            "effective_handover_baseline_snapshot_id",
            "summary_snapshot_id",
            "handover_rebaseline_record_id",
            "status",
            "confirmed_at",
            "confirmed_by",
            "comment",
            "created_by",
            "updated_by"
        )
        values (
            ${sqlValue(fixture.handoverId)},
            ${sqlValue(fixture.projectId)},
            ${sqlValue(fixture.contractSummarySnapshotId)},
            ${sqlValue(fixture.contractSnapshotId)},
            ${sqlValue(fixture.handoverSummarySnapshotId)},
            null,
            ${sqlValue(fixture.handoverStatus ?? 'draft')},
            ${sqlTimestamp((fixture.handoverStatus ?? 'draft') === 'confirmed' ? '2026-04-15T00:14:00.000Z' : null)},
            ${sqlUuid((fixture.handoverStatus ?? 'draft') === 'confirmed' ? E2E_ACTOR_ID : null)},
            ${sqlText((fixture.handoverStatus ?? 'draft') === 'confirmed' ? 'e2e 项目移交已确认' : null)},
            ${sqlUuid(E2E_ACTOR_ID)},
            ${sqlUuid(E2E_ACTOR_ID)}
        );
    `);

    await connection.execute(`
        insert into "${schema}"."confirmation_record" (
            "id",
            "confirmation_type",
            "business_domain",
            "target_type",
            "target_id",
            "project_id",
            "status",
            "required_count",
            "confirmed_count",
            "confirmation_comment",
            "submitted_at",
            "confirmed_at",
            "created_by",
            "updated_by"
        )
        values (
            ${sqlValue(fixture.confirmationRecordId)},
            'project-handover',
            'project-handover',
            'ProjectHandover',
            ${sqlValue(fixture.handoverId)},
            ${sqlValue(fixture.projectId)},
            'confirmed',
            2,
            2,
            'e2e 项目移交确认准备',
            ${sqlTimestamp('2026-04-15T00:12:00.000Z')},
            ${sqlTimestamp('2026-04-15T00:13:00.000Z')},
            ${sqlUuid(E2E_ACTOR_ID)},
            ${sqlUuid(E2E_ACTOR_ID)}
        );
    `);

    await connection.execute(`
        insert into "${schema}"."confirmation_participant" (
            "id",
            "confirmation_record_id",
            "participant_id",
            "participant_role_key",
            "participant_display_name",
            "participant_status",
            "confirmed_at",
            "confirmed_comment",
            "created_by",
            "updated_by"
        )
        values
            (${sqlValue(handoverParticipantId(fixture, 1))}, ${sqlValue(fixture.confirmationRecordId)}, ${sqlUuid(E2E_ACTOR_ID)}, 'execution-owner', '执行负责人', 'confirmed', ${sqlTimestamp('2026-04-15T00:13:00.000Z')}, '已确认执行责任', ${sqlUuid(E2E_ACTOR_ID)}, ${sqlUuid(E2E_ACTOR_ID)}),
            (${sqlValue(handoverParticipantId(fixture, 2))}, ${sqlValue(fixture.confirmationRecordId)}, ${sqlUuid(E2E_VIEWER_ID)}, 'sales-owner', '销售负责人', 'confirmed', ${sqlTimestamp('2026-04-15T00:13:00.000Z')}, '已确认商务移交', ${sqlUuid(E2E_ACTOR_ID)}, ${sqlUuid(E2E_ACTOR_ID)});
    `);

    if (hasProcessingRebaselineFixture(fixture)) {
        await seedProcessingRebaseline(connection, schema, fixture);
    }

    if (fixture.receiptJudgmentFreezeId && fixture.receiptJudgmentMode) {
        await connection.execute(`
            insert into "${schema}"."project_receipt_judgment_freeze" (
                "id",
                "project_id",
                "receipt_judgment_mode",
                "source_type",
                "source_id",
                "source_handover_id",
                "source_handover_summary_snapshot_id",
                "source_handover_rebaseline_record_id",
                "is_current",
                "frozen_at",
                "frozen_by",
                "supersedes_id",
                "created_by",
                "updated_by"
            )
            values (
                ${sqlValue(fixture.receiptJudgmentFreezeId)},
                ${sqlValue(fixture.projectId)},
                ${sqlValue(fixture.receiptJudgmentMode)},
                'project-handover',
                ${sqlValue(fixture.handoverId)},
                ${sqlValue(fixture.handoverId)},
                ${sqlValue(fixture.handoverSummarySnapshotId)},
                ${sqlUuid(fixture.processingRebaselineRecordId ?? null)},
                true,
                ${sqlTimestamp('2026-04-15T00:15:00.000Z')},
                ${sqlUuid(E2E_ACTOR_ID)},
                null,
                ${sqlUuid(E2E_ACTOR_ID)},
                ${sqlUuid(E2E_ACTOR_ID)}
            );
        `);
    }
}

async function seedProcessingRebaseline(
    connection: { execute(sql: string): Promise<unknown> },
    schema: string,
    fixture: ProcessingRebaselineFixture
): Promise<void> {
    await connection.execute(`
        insert into "${schema}"."contract_amendment" (
            "id",
            "contract_id",
            "version",
            "is_current",
            "status",
            "created_by",
            "updated_by"
        )
        values (
            ${sqlValue(fixture.amendmentId)},
            ${sqlValue(fixture.contractId)},
            1,
            true,
            'effective',
            ${sqlUuid(E2E_ACTOR_ID)},
            ${sqlUuid(E2E_ACTOR_ID)}
        );
    `);

    await connection.execute(`
        insert into "${schema}"."contract_handover_rebaseline_record" (
            "id",
            "contract_amendment_id",
            "project_id",
            "rebaseline_reason",
            "effective_baseline_after_id",
            "status",
            "handled_by",
            "created_by",
            "updated_by"
        )
        values (
            ${sqlValue(fixture.processingRebaselineRecordId)},
            ${sqlValue(fixture.amendmentId)},
            ${sqlValue(fixture.projectId)},
            'e2e 未收口再基线化',
            ${sqlValue(fixture.contractSnapshotId)},
            'processing',
            ${sqlUuid(E2E_ACTOR_ID)},
            ${sqlUuid(E2E_ACTOR_ID)},
            ${sqlUuid(E2E_ACTOR_ID)}
        );
    `);
}

function makeHandoverE2EFixture(
    index: number,
    key: string,
    withHandover: boolean,
    withProcessingRebaseline = false,
    options: HandoverE2EFixtureOptions = {}
): HandoverE2EFixture {
    const suffix = String(index).padStart(12, '0');

    return {
        key,
        projectId: `21000000-0000-4000-8000-${suffix}`,
        projectCode: `E2E-HO-${key.toUpperCase()}`,
        projectName: `E2E 项目移交 ${key}`,
        contractId: `31000000-0000-4000-8000-${suffix}`,
        contractNo: `E2E-HO-HT-${key.toUpperCase()}`,
        contractSnapshotId: `51000000-0000-4000-8000-${suffix}`,
        baselineId: `52000000-0000-4000-8000-${suffix}`,
        diffResultId: `53000000-0000-4000-8000-${suffix}`,
        readinessPackageId: `54000000-0000-4000-8000-${suffix}`,
        receivablePlanVersionId: `55000000-0000-4000-8000-${suffix}`,
        contractSummarySnapshotId: withHandover ? `61000000-0000-4000-8000-${suffix}` : undefined,
        handoverSummarySnapshotId: withHandover ? `62000000-0000-4000-8000-${suffix}` : undefined,
        handoverId: withHandover ? `71000000-0000-4000-8000-${suffix}` : undefined,
        confirmationRecordId: withHandover ? `41000000-0000-4000-8000-${suffix}` : undefined,
        processingRebaselineRecordId: withProcessingRebaseline ? `72000000-0000-4000-8000-${suffix}` : undefined,
        amendmentId: withProcessingRebaseline ? `73000000-0000-4000-8000-${suffix}` : undefined,
        contractStatus: options.contractStatus ?? 'active',
        confirmedReceiptAmount: options.confirmedReceiptAmount,
        confirmedPaymentAmountExcludingTax: options.confirmedPaymentAmountExcludingTax,
        receiptRecordId: options.confirmedReceiptAmount ? `81000000-0000-4000-8000-${suffix}` : undefined,
        paymentRecordId: options.confirmedPaymentAmountExcludingTax ? `82000000-0000-4000-8000-${suffix}` : undefined,
        handoverStatus: withHandover ? options.handoverStatus ?? 'draft' : undefined,
        receiptJudgmentFreezeId: withHandover && options.receiptJudgmentMode ? `83000000-0000-4000-8000-${suffix}` : undefined,
        receiptJudgmentMode: options.receiptJudgmentMode
    };
}

function handoverParticipantId(fixture: HandoverE2EFixture, sequence: number): string {
    return `71000000-0000-4000-8000-000000${fixture.projectId.slice(-3)}80${sequence}`;
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

function sqlText(value: string | null): string {
    return value === null ? 'null' : sqlValue(value);
}
