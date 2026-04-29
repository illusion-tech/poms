import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
    CreateCustomerAliasRequest,
    CreateCustomerRequest,
    CustomerAliasSummary,
    CustomerDetailView,
    CustomerListQuery,
    CustomerListView,
    CustomerSummary,
    UpdateCustomerRequest
} from '@poms/shared-contracts';
import { BusinessNumberService } from '../business-number/business-number.service';
import { OrgUnit } from '../platform/org-unit.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { Customer, CustomerAlias } from './customer.entity';
import { CustomerRepository } from './customer.repository';

@Injectable()
export class CustomerService {
    constructor(
        private readonly customerRepository: CustomerRepository,
        private readonly businessNumberService: BusinessNumberService
    ) {}

    async listCustomers(query: CustomerListQuery): Promise<CustomerListView[]> {
        const customers = await this.customerRepository.findMany(query);
        const context = await this.loadListContext(customers);

        return customers.map((customer) =>
            this.toListView(
                customer,
                customer.ownerUserId ? context.userMap.get(customer.ownerUserId) ?? null : null,
                customer.ownerOrgId ? context.orgUnitMap.get(customer.ownerOrgId) ?? null : null,
                context.leadCountByCustomerId.get(customer.id) ?? 0,
                context.projectCountByCustomerId.get(customer.id) ?? 0,
                context.contractCountByCustomerId.get(customer.id) ?? 0
            )
        );
    }

    async getCustomer(id: string): Promise<CustomerDetailView> {
        const customer = await this.requireCustomer(id);
        const [aliases, context] = await Promise.all([
            this.customerRepository.findAliasesByCustomerId(customer.id),
            this.loadListContext([customer])
        ]);

        return this.toDetailView(
            customer,
            customer.ownerUserId ? context.userMap.get(customer.ownerUserId) ?? null : null,
            customer.ownerOrgId ? context.orgUnitMap.get(customer.ownerOrgId) ?? null : null,
            context.leadCountByCustomerId.get(customer.id) ?? 0,
            context.projectCountByCustomerId.get(customer.id) ?? 0,
            context.contractCountByCustomerId.get(customer.id) ?? 0,
            aliases
        );
    }

    async createCustomer(input: CreateCustomerRequest, operatorUserId: string): Promise<CustomerSummary> {
        const operator = await this.customerRepository.findPlatformUserById(operatorUserId);
        if (!operator) {
            throw new NotFoundException(`Platform user ${operatorUserId} not found`);
        }

        const owner = await this.resolveOwner(input.ownerUserId, input.ownerOrgId, operator);
        const now = new Date();

        return this.customerRepository.getEntityManager().transactional(async (em) => {
            const customerNo = await this.businessNumberService.next('customer', now, em);
            const customer = em.create(Customer, {
                customerNo,
                displayName: input.displayName,
                legalName: input.legalName?.trim() || null,
                shortName: input.shortName?.trim() || null,
                status: 'active',
                ownerOrgId: owner.ownerOrgId,
                ownerUserId: owner.ownerUserId,
                sourceChannel: input.sourceChannel?.trim() || null,
                remark: input.remark?.trim() || null,
                mergedIntoCustomerId: null,
                createdBy: operator.id,
                updatedBy: operator.id
            });
            const primaryAlias = em.create(CustomerAlias, {
                customerId: customer.id,
                aliasName: customer.displayName,
                aliasType: 'alias',
                normalizedName: this.normalizeCustomerName(customer.displayName),
                isPrimary: true,
                createdBy: operator.id
            });

            em.persist([customer, primaryAlias]);
            await em.flush();
            return this.toSummary(customer);
        });
    }

    async updateCustomer(id: string, input: UpdateCustomerRequest, operatorUserId: string): Promise<CustomerDetailView> {
        const customer = await this.requireCustomer(id);
        if (customer.status === 'merged') {
            throw new BadRequestException(`Customer ${id} is merged and cannot be edited directly`);
        }

        if (input.displayName !== undefined) {
            customer.displayName = input.displayName;
        }
        if (input.legalName !== undefined) {
            customer.legalName = input.legalName?.trim() || null;
        }
        if (input.shortName !== undefined) {
            customer.shortName = input.shortName?.trim() || null;
        }
        if (input.status !== undefined) {
            customer.status = input.status;
        }
        if (input.sourceChannel !== undefined) {
            customer.sourceChannel = input.sourceChannel?.trim() || null;
        }
        if (input.remark !== undefined) {
            customer.remark = input.remark?.trim() || null;
        }
        if (input.ownerUserId !== undefined || input.ownerOrgId !== undefined) {
            const owner = await this.resolveOwnerUpdate(customer, input.ownerUserId, input.ownerOrgId);
            customer.ownerUserId = owner.ownerUserId;
            customer.ownerOrgId = owner.ownerOrgId;
        }

        customer.updatedBy = operatorUserId;
        await this.customerRepository.save(customer);

        return this.getCustomer(id);
    }

    async listAliases(customerId: string): Promise<CustomerAliasSummary[]> {
        await this.requireCustomer(customerId);
        const aliases = await this.customerRepository.findAliasesByCustomerId(customerId);
        return aliases.map((alias) => this.toAliasSummary(alias));
    }

    async createAlias(customerId: string, input: CreateCustomerAliasRequest, operatorUserId: string): Promise<CustomerAliasSummary> {
        const customer = await this.requireCustomer(customerId);
        if (customer.status === 'merged') {
            throw new BadRequestException(`Customer ${customerId} is merged and cannot accept new aliases`);
        }

        const alias = this.customerRepository.createAlias({
            customerId: customer.id,
            aliasName: input.aliasName,
            aliasType: input.aliasType ?? 'alias',
            normalizedName: this.normalizeCustomerName(input.aliasName),
            isPrimary: false,
            createdBy: operatorUserId
        });

        await this.customerRepository.saveAlias(alias);
        return this.toAliasSummary(alias);
    }

    async requireActiveCustomer(id: string): Promise<Customer> {
        const customer = await this.requireCustomer(id);
        if (customer.status !== 'active') {
            throw new BadRequestException(`Customer ${id} is not active`);
        }

        return customer;
    }

    toSummary(customer: Customer): CustomerSummary {
        return {
            id: customer.id,
            customerNo: customer.customerNo,
            displayName: customer.displayName,
            legalName: customer.legalName ?? null,
            shortName: customer.shortName ?? null,
            status: customer.status,
            ownerOrgId: customer.ownerOrgId ?? null,
            ownerUserId: customer.ownerUserId ?? null,
            sourceChannel: customer.sourceChannel ?? null,
            remark: customer.remark ?? null,
            mergedIntoCustomerId: customer.mergedIntoCustomerId ?? null,
            rowVersion: customer.rowVersion,
            createdAt: customer.createdAt.toISOString(),
            createdBy: customer.createdBy ?? null,
            updatedAt: customer.updatedAt.toISOString(),
            updatedBy: customer.updatedBy ?? null
        };
    }

    private async requireCustomer(id: string): Promise<Customer> {
        const customer = await this.customerRepository.findById(id);
        if (!customer) {
            throw new NotFoundException(`Customer ${id} not found`);
        }

        return customer;
    }

    private async loadListContext(customers: Customer[]): Promise<{
        userMap: Map<string, PlatformUser>;
        orgUnitMap: Map<string, OrgUnit>;
        leadCountByCustomerId: Map<string, number>;
        projectCountByCustomerId: Map<string, number>;
        contractCountByCustomerId: Map<string, number>;
    }> {
        const customerIds = customers.map((customer) => customer.id);
        const ownerUserIds = [...new Set(customers.map((customer) => customer.ownerUserId).filter((id): id is string => Boolean(id)))];
        const ownerOrgIds = [...new Set(customers.map((customer) => customer.ownerOrgId).filter((id): id is string => Boolean(id)))];
        const [users, orgUnits, leadCountByCustomerId, projectCountByCustomerId, contractCountByCustomerId] = await Promise.all([
            this.customerRepository.findPlatformUsersByIds(ownerUserIds),
            this.customerRepository.findOrgUnitsByIds(ownerOrgIds),
            this.customerRepository.countLeadsByCustomerIds(customerIds),
            this.customerRepository.countProjectsByCustomerIds(customerIds),
            this.customerRepository.countContractsByCustomerIds(customerIds)
        ]);

        return {
            userMap: new Map(users.map((user) => [user.id, user])),
            orgUnitMap: new Map(orgUnits.map((orgUnit) => [orgUnit.id, orgUnit])),
            leadCountByCustomerId,
            projectCountByCustomerId,
            contractCountByCustomerId
        };
    }

    private toListView(
        customer: Customer,
        owner: PlatformUser | null,
        ownerOrg: OrgUnit | null,
        leadCount: number,
        projectCount: number,
        contractCount: number
    ): CustomerListView {
        return {
            ...this.toSummary(customer),
            ownerName: owner?.displayName ?? null,
            ownerOrgName: ownerOrg?.name ?? null,
            leadCount,
            projectCount,
            contractCount
        };
    }

    private toDetailView(
        customer: Customer,
        owner: PlatformUser | null,
        ownerOrg: OrgUnit | null,
        leadCount: number,
        projectCount: number,
        contractCount: number,
        aliases: CustomerAlias[]
    ): CustomerDetailView {
        return {
            ...this.toListView(customer, owner, ownerOrg, leadCount, projectCount, contractCount),
            aliases: aliases.map((alias) => this.toAliasSummary(alias))
        };
    }

    private toAliasSummary(alias: CustomerAlias): CustomerAliasSummary {
        return {
            id: alias.id,
            customerId: alias.customerId,
            aliasName: alias.aliasName,
            aliasType: alias.aliasType,
            normalizedName: alias.normalizedName,
            isPrimary: alias.isPrimary,
            createdAt: alias.createdAt.toISOString(),
            createdBy: alias.createdBy ?? null
        };
    }

    private async resolveOwner(
        ownerUserId: string | null | undefined,
        ownerOrgId: string | null | undefined,
        operator: PlatformUser
    ): Promise<{ ownerUserId: string | null; ownerOrgId: string | null }> {
        if (ownerUserId === undefined) {
            const resolvedOrgId = ownerOrgId === undefined ? operator.primaryOrgUnitId ?? null : ownerOrgId;
            await this.assertOrgExists(resolvedOrgId);
            return {
                ownerUserId: operator.id,
                ownerOrgId: resolvedOrgId
            };
        }

        const ownerUser = ownerUserId ? await this.customerRepository.findPlatformUserById(ownerUserId) : null;
        if (ownerUserId && !ownerUser) {
            throw new NotFoundException(`Platform user ${ownerUserId} not found`);
        }

        const resolvedOrgId = ownerOrgId === undefined ? ownerUser?.primaryOrgUnitId ?? null : ownerOrgId;
        await this.assertOrgExists(resolvedOrgId);

        return {
            ownerUserId: ownerUser?.id ?? null,
            ownerOrgId: resolvedOrgId
        };
    }

    private async resolveOwnerUpdate(
        customer: Customer,
        ownerUserId: string | null | undefined,
        ownerOrgId: string | null | undefined
    ): Promise<{ ownerUserId: string | null; ownerOrgId: string | null }> {
        if (ownerUserId === undefined) {
            const resolvedOrgId = ownerOrgId === undefined ? customer.ownerOrgId ?? null : ownerOrgId;
            await this.assertOrgExists(resolvedOrgId);
            return {
                ownerUserId: customer.ownerUserId ?? null,
                ownerOrgId: resolvedOrgId
            };
        }

        const ownerUser = ownerUserId ? await this.customerRepository.findPlatformUserById(ownerUserId) : null;
        if (ownerUserId && !ownerUser) {
            throw new NotFoundException(`Platform user ${ownerUserId} not found`);
        }

        const resolvedOrgId = ownerOrgId === undefined ? ownerUser?.primaryOrgUnitId ?? customer.ownerOrgId ?? null : ownerOrgId;
        await this.assertOrgExists(resolvedOrgId);

        return {
            ownerUserId: ownerUser?.id ?? null,
            ownerOrgId: resolvedOrgId
        };
    }

    private async assertOrgExists(orgUnitId: string | null): Promise<void> {
        if (!orgUnitId) {
            return;
        }

        const orgUnit = await this.customerRepository.findOrgUnitById(orgUnitId);
        if (!orgUnit) {
            throw new NotFoundException(`Org unit ${orgUnitId} not found`);
        }
    }

    private normalizeCustomerName(value: string): string {
        return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
    }
}
