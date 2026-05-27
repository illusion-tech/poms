import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { hashSync } from 'bcryptjs';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { loadValidatedEnv } from '../config/load-env';
import { seedPlatformBootstrap } from './platform-bootstrap.seeder';
import { sqlDate, sqlText, sqlTimestamp, sqlUuid, sqlValue, stableUuid } from './seed-utils';

const TRIAL_USERS_CSV_ENV = 'POMS_TRIAL_USERS_CSV';
const CSV_HEADERS = ['username', 'displayName', 'email', 'phone', 'orgCode', 'roleKeys', 'password'] as const;
const FORBIDDEN_DEV_USERNAMES = new Set(['admin', 'viewer', 'sales_rep', 'sales_lead', 'presales', 'biz_admin', 'biz_lead', 'vp_owner', 'executive', 'project_mgr', 'sales_assistant', 'commission_policy', 'finance_ops', 'finance_mgr', 'auditor']);
const REQUIRED_TRIAL_ROLE_KEYS = ['platform-admin', 'sales-rep', 'business-admin'] as const;

type CsvHeader = (typeof CSV_HEADERS)[number];

type SqlConnection = {
    execute<T = unknown>(sql: string): Promise<T>;
};

interface TrialUserRecord extends Record<CsvHeader, string> {
    parsedRoleKeys: string[];
}

interface KeyIdRow {
    id: string;
    key: string;
}

interface TrialActorSet {
    platformAdminId: string;
    salesOwnerId: string;
    businessAdminId: string;
    salesOrgId: string;
    customerVisitSourceId: string;
    bidNoticeSourceId: string;
}

export class BusinessTrialSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const schema = loadValidatedEnv().DB_SCHEMA;
        const connection = em.getConnection();
        const users = readTrialUsersCsv();

        await seedPlatformBootstrap(connection, schema);
        await seedTrialUsers(connection, schema, users);
        await seedTrialDemoData(connection, schema, users);

        console.log(`Seeded ${users.length} business trial users and trial demo data in schema "${schema}".`);
    }
}

async function seedTrialUsers(connection: SqlConnection, schema: string, users: TrialUserRecord[]): Promise<void> {
    const orgIdByCode = await fetchOrgIds(connection, schema, [...new Set(users.map((user) => user.orgCode))]);
    const roleIdByKey = await fetchRoleIds(connection, schema, [...new Set(users.flatMap((user) => user.parsedRoleKeys))]);

    for (const user of users) {
        if (!orgIdByCode.has(user.orgCode)) {
            throw new Error(`Unknown orgCode in ${TRIAL_USERS_CSV_ENV}: ${user.orgCode}`);
        }

        for (const roleKey of user.parsedRoleKeys) {
            if (!roleIdByKey.has(roleKey)) {
                throw new Error(`Unknown roleKey in ${TRIAL_USERS_CSV_ENV}: ${roleKey}`);
            }
        }
    }

    await upsertPlatformUsers(connection, schema, users, orgIdByCode);
    const userIdByUsername = await fetchUserIds(
        connection,
        schema,
        users.map((user) => user.username)
    );
    await replaceTrialCredentials(connection, schema, users, userIdByUsername);
    await replaceTrialMemberships(connection, schema, users, userIdByUsername, orgIdByCode);
    await replaceTrialRoleAssignments(connection, schema, users, userIdByUsername, roleIdByKey);
}

async function seedTrialDemoData(connection: SqlConnection, schema: string, users: TrialUserRecord[]): Promise<void> {
    const actors = await resolveTrialActors(connection, schema, users);

    await connection.execute(`
        insert into "${schema}"."customer" (
            "id",
            "customer_no",
            "display_name",
            "legal_name",
            "short_name",
            "status",
            "owner_org_id",
            "owner_user_id",
            "source_channel",
            "remark",
            "created_by",
            "updated_by"
        )
        values
            (${sqlValue('91000000-0000-4000-8000-000000000001')}, 'TRIAL-CUST-2026-0001', '南城轨道交通集团', '南城轨道交通集团有限公司', '南城轨交', 'active', ${sqlUuid(actors.salesOrgId)}, ${sqlUuid(actors.salesOwnerId)}, 'trial-demo', '业务试用演示客户，用于销售线索与项目转化流程。', ${sqlUuid(actors.platformAdminId)}, ${sqlUuid(actors.platformAdminId)}),
            (${sqlValue('91000000-0000-4000-8000-000000000002')}, 'TRIAL-CUST-2026-0002', '华东智慧园区发展有限公司', '华东智慧园区发展有限公司', '华东智慧园区', 'active', ${sqlUuid(actors.salesOrgId)}, ${sqlUuid(actors.salesOwnerId)}, 'trial-demo', '业务试用演示客户，用于合同与商务流程查看。', ${sqlUuid(actors.platformAdminId)}, ${sqlUuid(actors.platformAdminId)})
        on conflict ("customer_no") do update
        set
            "display_name" = excluded."display_name",
            "legal_name" = excluded."legal_name",
            "short_name" = excluded."short_name",
            "status" = excluded."status",
            "owner_org_id" = excluded."owner_org_id",
            "owner_user_id" = excluded."owner_user_id",
            "source_channel" = excluded."source_channel",
            "remark" = excluded."remark",
            "updated_by" = excluded."updated_by",
            "updated_at" = now();
    `);

    const customerIdByNo = await fetchCustomerIds(connection, schema, ['TRIAL-CUST-2026-0001', 'TRIAL-CUST-2026-0002']);

    await upsertPrimaryCustomerAlias(connection, schema, customerIdByNo.get('TRIAL-CUST-2026-0001'), '南城轨道交通集团', actors.platformAdminId);
    await upsertPrimaryCustomerAlias(connection, schema, customerIdByNo.get('TRIAL-CUST-2026-0002'), '华东智慧园区发展有限公司', actors.platformAdminId);

    await connection.execute(`
        insert into "${schema}"."lead" (
            "id",
            "lead_no",
            "lead_name",
            "customer_id",
            "customer_name",
            "source_id",
            "source_channel",
            "demand_description",
            "budget_status",
            "estimated_amount",
            "urgency",
            "expected_decision_date",
            "score",
            "rating",
            "score_reason",
            "status",
            "owner_org_id",
            "owner_user_id",
            "qualification_summary",
            "qualified_at",
            "qualified_by",
            "created_by",
            "updated_by"
        )
        values
            (${sqlValue('92000000-0000-4000-8000-000000000001')}, 'TRIAL-LD-2026-0001', '南城轨交综合运维平台线索', ${sqlUuid(customerIdByNo.get('TRIAL-CUST-2026-0001') ?? null)}, '南城轨道交通集团', ${sqlUuid(actors.customerVisitSourceId)}, '客户拜访', '客户计划统一运维项目立项，希望先评估售前范围、预算和交付风险。', 'rough-budget', '1800000.00', 'high', ${sqlDate('2026-06-30')}, 72, 'B', '试用演示数据：预算与需求已初步明确，等待售前补充范围。', 'qualified', ${sqlUuid(actors.salesOrgId)}, ${sqlUuid(actors.salesOwnerId)}, '客户已确认业务痛点和预算范围，进入有效线索。', ${sqlTimestamp('2026-05-20T09:30:00.000Z')}, ${sqlUuid(actors.salesOwnerId)}, ${sqlUuid(actors.salesOwnerId)}, ${sqlUuid(actors.salesOwnerId)}),
            (${sqlValue('92000000-0000-4000-8000-000000000002')}, 'TRIAL-LD-2026-0002', '智慧园区能源管理系统扩容', ${sqlUuid(customerIdByNo.get('TRIAL-CUST-2026-0002') ?? null)}, '华东智慧园区发展有限公司', ${sqlUuid(actors.bidNoticeSourceId)}, '招投标公告', '客户已有一期系统，二期扩容需要走商务竞标和合同流程。', 'budget-confirmed', '2600000.00', 'normal', ${sqlDate('2026-07-15')}, 81, 'A', '试用演示数据：预算已确认，已转入项目推进。', 'converted', ${sqlUuid(actors.salesOrgId)}, ${sqlUuid(actors.salesOwnerId)}, '公开招标信息匹配现有能力，已转项目。', ${sqlTimestamp('2026-05-18T10:00:00.000Z')}, ${sqlUuid(actors.salesOwnerId)}, ${sqlUuid(actors.salesOwnerId)}, ${sqlUuid(actors.salesOwnerId)})
        on conflict ("lead_no") do update
        set
            "lead_name" = excluded."lead_name",
            "customer_id" = excluded."customer_id",
            "customer_name" = excluded."customer_name",
            "source_id" = excluded."source_id",
            "source_channel" = excluded."source_channel",
            "demand_description" = excluded."demand_description",
            "budget_status" = excluded."budget_status",
            "estimated_amount" = excluded."estimated_amount",
            "urgency" = excluded."urgency",
            "expected_decision_date" = excluded."expected_decision_date",
            "score" = excluded."score",
            "rating" = excluded."rating",
            "score_reason" = excluded."score_reason",
            "status" = excluded."status",
            "owner_org_id" = excluded."owner_org_id",
            "owner_user_id" = excluded."owner_user_id",
            "qualification_summary" = excluded."qualification_summary",
            "qualified_at" = excluded."qualified_at",
            "qualified_by" = excluded."qualified_by",
            "updated_by" = excluded."updated_by",
            "updated_at" = now();
    `);

    const leadIdByNo = await fetchLeadIds(connection, schema, ['TRIAL-LD-2026-0001', 'TRIAL-LD-2026-0002']);

    await connection.execute(`
        insert into "${schema}"."project" (
            "id",
            "project_no",
            "project_name",
            "source_lead_id",
            "customer_id",
            "customer_name",
            "customer_project_no",
            "status",
            "current_stage",
            "owner_org_id",
            "owner_user_id",
            "planned_sign_at",
            "created_by",
            "updated_by"
        )
        values (
            ${sqlValue('93000000-0000-4000-8000-000000000001')},
            'TRIAL-PRJ-2026-0001',
            '智慧园区能源管理系统二期扩容',
            ${sqlUuid(leadIdByNo.get('TRIAL-LD-2026-0002') ?? null)},
            ${sqlUuid(customerIdByNo.get('TRIAL-CUST-2026-0002') ?? null)},
            '华东智慧园区发展有限公司',
            'HD-PARK-EMS-P2',
            'active',
            'contracting',
            ${sqlUuid(actors.salesOrgId)},
            ${sqlUuid(actors.salesOwnerId)},
            ${sqlTimestamp('2026-07-20T00:00:00.000Z')},
            ${sqlUuid(actors.salesOwnerId)},
            ${sqlUuid(actors.salesOwnerId)}
        )
        on conflict ("project_no") do update
        set
            "project_name" = excluded."project_name",
            "source_lead_id" = excluded."source_lead_id",
            "customer_id" = excluded."customer_id",
            "customer_name" = excluded."customer_name",
            "customer_project_no" = excluded."customer_project_no",
            "status" = excluded."status",
            "current_stage" = excluded."current_stage",
            "owner_org_id" = excluded."owner_org_id",
            "owner_user_id" = excluded."owner_user_id",
            "planned_sign_at" = excluded."planned_sign_at",
            "updated_by" = excluded."updated_by",
            "updated_at" = now();
    `);

    const projectIdByNo = await fetchProjectIds(connection, schema, ['TRIAL-PRJ-2026-0001']);

    await connection.execute(`
        update "${schema}"."lead"
        set
            "converted_project_id" = ${sqlUuid(projectIdByNo.get('TRIAL-PRJ-2026-0001') ?? null)},
            "converted_at" = ${sqlTimestamp('2026-05-21T11:00:00.000Z')},
            "converted_by" = ${sqlUuid(actors.salesOwnerId)},
            "updated_by" = ${sqlUuid(actors.salesOwnerId)},
            "updated_at" = now()
        where "lead_no" = 'TRIAL-LD-2026-0002';
    `);

    await connection.execute(`
        insert into "${schema}"."contract" (
            "id",
            "project_id",
            "contract_no",
            "customer_contract_no",
            "status",
            "signed_amount",
            "currency_code",
            "signed_at",
            "retention_due_date",
            "created_by",
            "updated_by"
        )
        values (
            ${sqlValue('94000000-0000-4000-8000-000000000001')},
            ${sqlUuid(projectIdByNo.get('TRIAL-PRJ-2026-0001') ?? null)},
            'TRIAL-CT-2026-0001',
            'HD-PARK-CT-P2',
            'draft',
            '2600000.00',
            'CNY',
            null,
            ${sqlDate('2027-08-31')},
            ${sqlUuid(actors.businessAdminId)},
            ${sqlUuid(actors.businessAdminId)}
        )
        on conflict ("contract_no") do update
        set
            "project_id" = excluded."project_id",
            "customer_contract_no" = excluded."customer_contract_no",
            "status" = excluded."status",
            "signed_amount" = excluded."signed_amount",
            "currency_code" = excluded."currency_code",
            "signed_at" = excluded."signed_at",
            "retention_due_date" = excluded."retention_due_date",
            "updated_by" = excluded."updated_by",
            "updated_at" = now();
    `);
}

function readTrialUsersCsv(): TrialUserRecord[] {
    const csvPath = process.env[TRIAL_USERS_CSV_ENV]?.trim();

    if (!csvPath) {
        throw new Error(`${TRIAL_USERS_CSV_ENV} must point to a local business trial users CSV file.`);
    }

    const resolvedPath = isAbsolute(csvPath) ? csvPath : resolve(process.cwd(), csvPath);
    if (!existsSync(resolvedPath)) {
        throw new Error(`Business trial users CSV not found: ${resolvedPath}`);
    }

    const records = parseCsv(readFileSync(resolvedPath, 'utf8'));
    validateTrialUsers(records);

    return records;
}

function parseCsv(content: string): TrialUserRecord[] {
    const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '' && !line.trimStart().startsWith('#'));
    const headerLine = lines.shift();

    if (!headerLine) {
        throw new Error(`Business trial users CSV is empty.`);
    }

    const headers = parseCsvLine(headerLine).map((header) => header.trim());
    const missingHeaders = CSV_HEADERS.filter((header) => !headers.includes(header));

    if (missingHeaders.length > 0) {
        throw new Error(`Business trial users CSV missing headers: ${missingHeaders.join(', ')}`);
    }

    return lines.map((line, lineIndex) => {
        const values = parseCsvLine(line);
        if (values.length !== headers.length) {
            throw new Error(`Business trial users CSV line ${lineIndex + 2} has ${values.length} values, expected ${headers.length}.`);
        }

        const record = Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ''])) as Record<CsvHeader, string>;
        return {
            ...record,
            parsedRoleKeys: parseRoleKeys(record.roleKeys)
        };
    });
}

function parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        const next = line[index + 1];

        if (char === '"' && inQuotes && next === '"') {
            current += '"';
            index += 1;
            continue;
        }

        if (char === '"') {
            inQuotes = !inQuotes;
            continue;
        }

        if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
            continue;
        }

        current += char;
    }

    if (inQuotes) {
        throw new Error('Business trial users CSV contains an unterminated quoted field.');
    }

    values.push(current);
    return values;
}

function validateTrialUsers(users: TrialUserRecord[]): void {
    if (users.length === 0) {
        throw new Error('Business trial users CSV must contain at least one user.');
    }

    const seenUsernames = new Set<string>();
    for (const user of users) {
        for (const header of CSV_HEADERS) {
            if (!user[header]) {
                throw new Error(`Business trial user ${user.username || '<missing username>'} is missing ${header}.`);
            }
        }

        if (FORBIDDEN_DEV_USERNAMES.has(user.username)) {
            throw new Error(`Business trial user must not reuse development username: ${user.username}`);
        }

        if (seenUsernames.has(user.username)) {
            throw new Error(`Duplicate business trial username: ${user.username}`);
        }
        seenUsernames.add(user.username);

        if (user.password.length < 12 || /change[-_\s]?me|replace[-_\s]?me/i.test(user.password) || user.password === `${user.username}123`) {
            throw new Error(`Business trial user ${user.username} must use a non-placeholder password with at least 12 characters.`);
        }

        if (user.parsedRoleKeys.length === 0) {
            throw new Error(`Business trial user ${user.username} must have at least one roleKey.`);
        }
    }

    for (const requiredRole of REQUIRED_TRIAL_ROLE_KEYS) {
        if (!users.some((user) => user.parsedRoleKeys.includes(requiredRole))) {
            throw new Error(`Business trial users CSV must include at least one user with roleKey ${requiredRole}.`);
        }
    }
}

function parseRoleKeys(roleKeys: string): string[] {
    return roleKeys
        .split(/[|;]/)
        .map((roleKey) => roleKey.trim())
        .filter((roleKey) => roleKey.length > 0);
}

async function upsertPlatformUsers(connection: SqlConnection, schema: string, users: TrialUserRecord[], orgIdByCode: Map<string, string>): Promise<void> {
    const values = users
        .map((user) => {
            const orgId = requireMapValue(orgIdByCode, user.orgCode, 'orgCode');
            return `(${sqlValue(stableUuid(`trial-user:${user.username}`))}, ${sqlValue(user.username)}, ${sqlValue(user.displayName)}, ${sqlText(user.email)}, false, ${sqlText(user.phone)}, false, true, ${sqlUuid(orgId)})`;
        })
        .join(',\n            ');

    await connection.execute(`
        insert into "${schema}"."platform_user" (
            "id",
            "username",
            "display_name",
            "email",
            "email_verified",
            "phone",
            "phone_verified",
            "is_active",
            "primary_org_unit_id"
        )
        values
            ${values}
        on conflict ("username") do update
        set
            "display_name" = excluded."display_name",
            "email" = excluded."email",
            "phone" = excluded."phone",
            "primary_org_unit_id" = excluded."primary_org_unit_id",
            "is_active" = true,
            "updated_at" = now();
    `);
}

async function replaceTrialCredentials(connection: SqlConnection, schema: string, users: TrialUserRecord[], userIdByUsername: Map<string, string>): Promise<void> {
    const values = users
        .map((user) => {
            const userId = requireMapValue(userIdByUsername, user.username, 'username');
            return `(${sqlValue(stableUuid(`trial-credential:${user.username}`))}, ${sqlValue(userId)}, ${sqlValue(hashSync(user.password, 10))})`;
        })
        .join(',\n            ');

    await connection.execute(`
        insert into "${schema}"."local_credential" (
            "id",
            "user_id",
            "password_hash"
        )
        values
            ${values}
        on conflict ("user_id") do update
        set
            "password_hash" = excluded."password_hash",
            "updated_at" = now();
    `);
}

async function replaceTrialMemberships(connection: SqlConnection, schema: string, users: TrialUserRecord[], userIdByUsername: Map<string, string>, orgIdByCode: Map<string, string>): Promise<void> {
    const userIds = users.map((user) => sqlValue(requireMapValue(userIdByUsername, user.username, 'username'))).join(', ');

    await connection.execute(`
        delete from "${schema}"."user_org_membership"
        where "user_id" in (${userIds});
    `);

    const values = users
        .map((user) => {
            const userId = requireMapValue(userIdByUsername, user.username, 'username');
            const orgId = requireMapValue(orgIdByCode, user.orgCode, 'orgCode');
            return `(${sqlValue(stableUuid(`trial-membership:${user.username}:${user.orgCode}`))}, ${sqlValue(userId)}, ${sqlValue(orgId)}, 'primary')`;
        })
        .join(',\n            ');

    await connection.execute(`
        insert into "${schema}"."user_org_membership" (
            "id",
            "user_id",
            "org_unit_id",
            "membership_type"
        )
        values
            ${values};
    `);
}

async function replaceTrialRoleAssignments(connection: SqlConnection, schema: string, users: TrialUserRecord[], userIdByUsername: Map<string, string>, roleIdByKey: Map<string, string>): Promise<void> {
    const userIds = users.map((user) => sqlValue(requireMapValue(userIdByUsername, user.username, 'username'))).join(', ');

    await connection.execute(`
        delete from "${schema}"."user_role_assignment"
        where "user_id" in (${userIds});
    `);

    const values = users
        .flatMap((user) => {
            const userId = requireMapValue(userIdByUsername, user.username, 'username');
            return user.parsedRoleKeys.map((roleKey) => {
                const roleId = requireMapValue(roleIdByKey, roleKey, 'roleKey');
                return `(${sqlValue(stableUuid(`trial-role:${user.username}:${roleKey}`))}, ${sqlValue(userId)}, ${sqlValue(roleId)})`;
            });
        })
        .join(',\n            ');

    await connection.execute(`
        insert into "${schema}"."user_role_assignment" (
            "id",
            "user_id",
            "role_id"
        )
        values
            ${values};
    `);
}

async function resolveTrialActors(connection: SqlConnection, schema: string, users: TrialUserRecord[]): Promise<TrialActorSet> {
    const platformAdmin = requireUserWithRole(users, 'platform-admin');
    const salesOwner = requireUserWithRole(users, 'sales-rep');
    const businessAdmin = requireUserWithRole(users, 'business-admin');
    const userIdByUsername = await fetchUserIds(connection, schema, [platformAdmin.username, salesOwner.username, businessAdmin.username]);
    const orgIdByCode = await fetchOrgIds(connection, schema, [salesOwner.orgCode]);
    const sourceIdByCode = await fetchLeadSourceIds(connection, schema, ['customer-visit', 'bid-notice']);

    return {
        platformAdminId: requireMapValue(userIdByUsername, platformAdmin.username, 'username'),
        salesOwnerId: requireMapValue(userIdByUsername, salesOwner.username, 'username'),
        businessAdminId: requireMapValue(userIdByUsername, businessAdmin.username, 'username'),
        salesOrgId: requireMapValue(orgIdByCode, salesOwner.orgCode, 'orgCode'),
        customerVisitSourceId: requireMapValue(sourceIdByCode, 'customer-visit', 'leadSource'),
        bidNoticeSourceId: requireMapValue(sourceIdByCode, 'bid-notice', 'leadSource')
    };
}

async function upsertPrimaryCustomerAlias(connection: SqlConnection, schema: string, customerId: string | undefined, aliasName: string, actorId: string): Promise<void> {
    if (!customerId) {
        throw new Error(`Trial customer was not found for alias ${aliasName}.`);
    }

    await connection.execute(`
        insert into "${schema}"."customer_alias" (
            "id",
            "customer_id",
            "alias_name",
            "alias_type",
            "normalized_name",
            "is_primary",
            "created_by"
        )
        values (
            ${sqlValue(stableUuid(`trial-customer-alias:${customerId}`))},
            ${sqlValue(customerId)},
            ${sqlValue(aliasName)},
            'alias',
            lower(${sqlValue(aliasName)}),
            true,
            ${sqlUuid(actorId)}
        )
        on conflict ("customer_id", "normalized_name", "alias_type") do update
        set
            "alias_name" = excluded."alias_name",
            "is_primary" = excluded."is_primary";
    `);
}

async function fetchOrgIds(connection: SqlConnection, schema: string, codes: string[]): Promise<Map<string, string>> {
    const rows = await connection.execute<KeyIdRow[]>(`
        select "id", "code" as "key"
        from "${schema}"."org_unit"
        where "code" in (${codes.map(sqlValue).join(', ')});
    `);
    return new Map(rows.map((row) => [row.key, row.id]));
}

async function fetchRoleIds(connection: SqlConnection, schema: string, roleKeys: string[]): Promise<Map<string, string>> {
    const rows = await connection.execute<KeyIdRow[]>(`
        select "id", "role_key" as "key"
        from "${schema}"."role"
        where "role_key" in (${roleKeys.map(sqlValue).join(', ')});
    `);
    return new Map(rows.map((row) => [row.key, row.id]));
}

async function fetchUserIds(connection: SqlConnection, schema: string, usernames: string[]): Promise<Map<string, string>> {
    const rows = await connection.execute<KeyIdRow[]>(`
        select "id", "username" as "key"
        from "${schema}"."platform_user"
        where "username" in (${usernames.map(sqlValue).join(', ')});
    `);
    return new Map(rows.map((row) => [row.key, row.id]));
}

async function fetchLeadSourceIds(connection: SqlConnection, schema: string, codes: string[]): Promise<Map<string, string>> {
    const rows = await connection.execute<KeyIdRow[]>(`
        select "id", "code" as "key"
        from "${schema}"."lead_source"
        where "code" in (${codes.map(sqlValue).join(', ')});
    `);
    return new Map(rows.map((row) => [row.key, row.id]));
}

async function fetchCustomerIds(connection: SqlConnection, schema: string, customerNos: string[]): Promise<Map<string, string>> {
    const rows = await connection.execute<KeyIdRow[]>(`
        select "id", "customer_no" as "key"
        from "${schema}"."customer"
        where "customer_no" in (${customerNos.map(sqlValue).join(', ')});
    `);
    return new Map(rows.map((row) => [row.key, row.id]));
}

async function fetchLeadIds(connection: SqlConnection, schema: string, leadNos: string[]): Promise<Map<string, string>> {
    const rows = await connection.execute<KeyIdRow[]>(`
        select "id", "lead_no" as "key"
        from "${schema}"."lead"
        where "lead_no" in (${leadNos.map(sqlValue).join(', ')});
    `);
    return new Map(rows.map((row) => [row.key, row.id]));
}

async function fetchProjectIds(connection: SqlConnection, schema: string, projectNos: string[]): Promise<Map<string, string>> {
    const rows = await connection.execute<KeyIdRow[]>(`
        select "id", "project_no" as "key"
        from "${schema}"."project"
        where "project_no" in (${projectNos.map(sqlValue).join(', ')});
    `);
    return new Map(rows.map((row) => [row.key, row.id]));
}

function requireUserWithRole(users: TrialUserRecord[], roleKey: string): TrialUserRecord {
    const user = users.find((candidate) => candidate.parsedRoleKeys.includes(roleKey));
    if (!user) {
        throw new Error(`Business trial users CSV must include a user with roleKey ${roleKey}.`);
    }

    return user;
}

function requireMapValue(values: Map<string, string>, key: string, kind: string): string {
    const value = values.get(key);
    if (!value) {
        throw new Error(`Unknown ${kind}: ${key}`);
    }

    return value;
}
