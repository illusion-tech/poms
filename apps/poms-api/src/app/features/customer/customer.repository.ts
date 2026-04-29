import { EntityManager, EntityRepository, FilterQuery, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import type { CustomerListQuery } from '@poms/shared-contracts';
import { OrgUnit } from '../platform/org-unit.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { Customer, CustomerAlias } from './customer.entity';

interface CountRow {
    customer_id: string;
    count: number | string;
}

@Injectable()
export class CustomerRepository {
    constructor(
        @InjectRepository(Customer)
        private readonly customerRepository: EntityRepository<Customer>,
        @InjectRepository(CustomerAlias)
        private readonly customerAliasRepository: EntityRepository<CustomerAlias>,
        @InjectRepository(PlatformUser)
        private readonly platformUserRepository: EntityRepository<PlatformUser>,
        @InjectRepository(OrgUnit)
        private readonly orgUnitRepository: EntityRepository<OrgUnit>
    ) {}

    async findMany(input: CustomerListQuery): Promise<Customer[]> {
        const where: FilterQuery<Customer> = {};

        if (input.status) {
            where.status = input.status;
        }

        if (input.ownerOrgId) {
            where.ownerOrgId = input.ownerOrgId;
        }

        if (input.keyword) {
            (where as FilterQuery<Customer> & { $or?: FilterQuery<Customer>[] }).$or = [
                { customerNo: { $ilike: `%${input.keyword}%` } },
                { displayName: { $ilike: `%${input.keyword}%` } },
                { legalName: { $ilike: `%${input.keyword}%` } },
                { shortName: { $ilike: `%${input.keyword}%` } }
            ];
        }

        return this.customerRepository.find(where, {
            orderBy: { updatedAt: QueryOrder.DESC, createdAt: QueryOrder.DESC }
        });
    }

    async findById(id: string): Promise<Customer | null> {
        return this.customerRepository.findOne({ id });
    }

    async findAliasesByCustomerId(customerId: string): Promise<CustomerAlias[]> {
        return this.customerAliasRepository.find(
            { customerId },
            {
                orderBy: { isPrimary: QueryOrder.DESC, createdAt: QueryOrder.ASC }
            }
        );
    }

    async findPlatformUserById(id: string): Promise<PlatformUser | null> {
        return this.platformUserRepository.findOne({ id });
    }

    async findPlatformUsersByIds(ids: string[]): Promise<PlatformUser[]> {
        if (ids.length === 0) {
            return [];
        }

        return this.platformUserRepository.find({ id: { $in: ids } });
    }

    async findOrgUnitById(id: string): Promise<OrgUnit | null> {
        return this.orgUnitRepository.findOne({ id });
    }

    async findOrgUnitsByIds(ids: string[]): Promise<OrgUnit[]> {
        if (ids.length === 0) {
            return [];
        }

        return this.orgUnitRepository.find({ id: { $in: ids } });
    }

    create(input: ConstructorParameters<typeof Customer>[0]): Customer {
        return this.customerRepository.create(input);
    }

    createAlias(input: ConstructorParameters<typeof CustomerAlias>[0]): CustomerAlias {
        return this.customerAliasRepository.create(input);
    }

    async save(customer: Customer): Promise<void> {
        await this.customerRepository.getEntityManager().persist(customer).flush();
    }

    async saveAlias(alias: CustomerAlias): Promise<void> {
        await this.customerAliasRepository.getEntityManager().persist(alias).flush();
    }

    async countLeadsByCustomerIds(customerIds: string[]): Promise<Map<string, number>> {
        return this.countByCustomerIds(
            `select "customer_id", count(*)::int as "count" from "poms"."lead" where "customer_id" in (__IDS__) group by "customer_id"`,
            customerIds
        );
    }

    async countProjectsByCustomerIds(customerIds: string[]): Promise<Map<string, number>> {
        return this.countByCustomerIds(
            `select "customer_id", count(*)::int as "count" from "poms"."project" where "customer_id" in (__IDS__) group by "customer_id"`,
            customerIds
        );
    }

    async countContractsByCustomerIds(customerIds: string[]): Promise<Map<string, number>> {
        return this.countByCustomerIds(
            `
                select project."customer_id", count(contract."id")::int as "count"
                from "poms"."contract" contract
                inner join "poms"."project" project on project."id" = contract."project_id"
                where project."customer_id" in (__IDS__)
                group by project."customer_id"
            `,
            customerIds
        );
    }

    getEntityManager(): EntityManager {
        return this.customerRepository.getEntityManager();
    }

    private async countByCustomerIds(sqlTemplate: string, customerIds: string[]): Promise<Map<string, number>> {
        if (customerIds.length === 0) {
            return new Map();
        }

        const placeholders = customerIds.map(() => '?').join(', ');
        const rows = (await this.customerRepository
            .getEntityManager()
            .getConnection()
            .execute(sqlTemplate.replace('__IDS__', placeholders), customerIds)) as CountRow[];

        return new Map(rows.map((row) => [row.customer_id, Number(row.count)]));
    }
}
