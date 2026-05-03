import { EntityRepository, FilterQuery, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import type { OpportunityContextQuery } from '@poms/shared-contracts';
import { Customer } from '../customer/customer.entity';
import { Lead } from '../lead/lead.entity';
import { Project } from '../project/project.entity';
import { CompetitorIntelligenceRecord, CustomerContact, OpportunityStakeholder, SalesDiscoveryRecord } from './sales-intelligence.entity';

@Injectable()
export class SalesIntelligenceRepository {
    constructor(
        @InjectRepository(CustomerContact)
        private readonly contactRepository: EntityRepository<CustomerContact>,
        @InjectRepository(OpportunityStakeholder)
        private readonly stakeholderRepository: EntityRepository<OpportunityStakeholder>,
        @InjectRepository(CompetitorIntelligenceRecord)
        private readonly competitorRepository: EntityRepository<CompetitorIntelligenceRecord>,
        @InjectRepository(SalesDiscoveryRecord)
        private readonly discoveryRepository: EntityRepository<SalesDiscoveryRecord>,
        @InjectRepository(Customer)
        private readonly customerRepository: EntityRepository<Customer>,
        @InjectRepository(Lead)
        private readonly leadRepository: EntityRepository<Lead>,
        @InjectRepository(Project)
        private readonly projectRepository: EntityRepository<Project>
    ) {}

    async findCustomerById(id: string): Promise<Customer | null> {
        return this.customerRepository.findOne({ id });
    }

    async findCustomersByIds(ids: string[]): Promise<Customer[]> {
        if (ids.length === 0) {
            return [];
        }
        return this.customerRepository.find({ id: { $in: ids } });
    }

    async findLeadById(id: string): Promise<Lead | null> {
        return this.leadRepository.findOne({ id });
    }

    async findLeadsByIds(ids: string[]): Promise<Lead[]> {
        if (ids.length === 0) {
            return [];
        }
        return this.leadRepository.find({ id: { $in: ids } });
    }

    async findProjectById(id: string): Promise<Project | null> {
        return this.projectRepository.findOne({ id });
    }

    async findProjectsByIds(ids: string[]): Promise<Project[]> {
        if (ids.length === 0) {
            return [];
        }
        return this.projectRepository.find({ id: { $in: ids } });
    }

    async listCustomerContacts(customerId: string): Promise<CustomerContact[]> {
        return this.contactRepository.find({ customerId }, { orderBy: { updatedAt: QueryOrder.DESC, createdAt: QueryOrder.DESC } });
    }

    async findCustomerContactById(id: string): Promise<CustomerContact | null> {
        return this.contactRepository.findOne({ id });
    }

    createCustomerContact(input: ConstructorParameters<typeof CustomerContact>[0]): CustomerContact {
        return this.contactRepository.create(input);
    }

    async saveCustomerContact(contact: CustomerContact): Promise<void> {
        await this.contactRepository.getEntityManager().persist(contact).flush();
    }

    async listOpportunityStakeholders(query: OpportunityContextQuery): Promise<OpportunityStakeholder[]> {
        return this.stakeholderRepository.find(this.buildOpportunityWhere<OpportunityStakeholder>(query), {
            orderBy: { isPrimary: QueryOrder.DESC, updatedAt: QueryOrder.DESC, createdAt: QueryOrder.DESC }
        });
    }

    async findOpportunityStakeholderById(id: string): Promise<OpportunityStakeholder | null> {
        return this.stakeholderRepository.findOne({ id });
    }

    createOpportunityStakeholder(input: ConstructorParameters<typeof OpportunityStakeholder>[0]): OpportunityStakeholder {
        return this.stakeholderRepository.create(input);
    }

    async saveOpportunityStakeholder(stakeholder: OpportunityStakeholder): Promise<void> {
        await this.stakeholderRepository.getEntityManager().persist(stakeholder).flush();
    }

    async listCompetitorRecords(query: OpportunityContextQuery): Promise<CompetitorIntelligenceRecord[]> {
        return this.competitorRepository.find(this.buildOpportunityWhere<CompetitorIntelligenceRecord>(query), {
            orderBy: { updatedAt: QueryOrder.DESC, createdAt: QueryOrder.DESC }
        });
    }

    async findCompetitorRecordById(id: string): Promise<CompetitorIntelligenceRecord | null> {
        return this.competitorRepository.findOne({ id });
    }

    createCompetitorRecord(input: ConstructorParameters<typeof CompetitorIntelligenceRecord>[0]): CompetitorIntelligenceRecord {
        return this.competitorRepository.create(input);
    }

    async saveCompetitorRecord(record: CompetitorIntelligenceRecord): Promise<void> {
        await this.competitorRepository.getEntityManager().persist(record).flush();
    }

    async listDiscoveryRecords(query: OpportunityContextQuery): Promise<SalesDiscoveryRecord[]> {
        return this.discoveryRepository.find(this.buildOpportunityWhere<SalesDiscoveryRecord>(query), {
            orderBy: { updatedAt: QueryOrder.DESC, createdAt: QueryOrder.DESC }
        });
    }

    async findDiscoveryRecordById(id: string): Promise<SalesDiscoveryRecord | null> {
        return this.discoveryRepository.findOne({ id });
    }

    createDiscoveryRecord(input: ConstructorParameters<typeof SalesDiscoveryRecord>[0]): SalesDiscoveryRecord {
        return this.discoveryRepository.create(input);
    }

    async saveDiscoveryRecord(record: SalesDiscoveryRecord): Promise<void> {
        await this.discoveryRepository.getEntityManager().persist(record).flush();
    }

    private buildOpportunityWhere<T extends { leadId?: string | null; projectId?: string | null }>(query: OpportunityContextQuery): FilterQuery<T> {
        const anchors: FilterQuery<T>[] = [];

        if (query.leadId) {
            anchors.push({ leadId: query.leadId } as FilterQuery<T>);
        }
        if (query.projectId) {
            anchors.push({ projectId: query.projectId } as FilterQuery<T>);
        }

        return anchors.length === 1 ? anchors[0] : ({ $or: anchors } as FilterQuery<T>);
    }
}
