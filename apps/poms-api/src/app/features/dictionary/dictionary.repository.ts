import { EntityRepository, type FilterQuery } from '@mikro-orm/postgresql';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import type { DictionaryDomain, DictionaryItemListQuery } from '@poms/shared-contracts';
import { Attachment } from '../attachment/attachment.entity';
import { Lead } from '../lead/lead.entity';
import { ExpenseRecord } from '../project-cost/expense-record.entity';
import { SalesFollowUpRecord } from '../sales-follow-up/sales-follow-up-record.entity';
import { DictionaryItem } from './dictionary-item.entity';

@Injectable()
export class DictionaryRepository {
    constructor(
        @InjectRepository(DictionaryItem)
        private readonly dictionaryItemRepository: EntityRepository<DictionaryItem>,
        @InjectRepository(Attachment)
        private readonly attachmentRepository: EntityRepository<Attachment>,
        @InjectRepository(SalesFollowUpRecord)
        private readonly salesFollowUpRepository: EntityRepository<SalesFollowUpRecord>,
        @InjectRepository(ExpenseRecord)
        private readonly expenseRecordRepository: EntityRepository<ExpenseRecord>,
        @InjectRepository(Lead)
        private readonly leadRepository: EntityRepository<Lead>
    ) {}

    async findItems(query: DictionaryItemListQuery = {}): Promise<DictionaryItem[]> {
        const where: FilterQuery<DictionaryItem> = {};

        if (query.domain) {
            where.domain = query.domain;
        }

        if (query.status) {
            where.status = query.status;
        }

        if (query.keyword) {
            const keyword = query.keyword.trim();
            (where as FilterQuery<DictionaryItem> & { $or?: FilterQuery<DictionaryItem>[] }).$or = [
                { code: { $ilike: `%${keyword}%` } },
                { name: { $ilike: `%${keyword}%` } },
                { description: { $ilike: `%${keyword}%` } }
            ];
        }

        return this.dictionaryItemRepository.find(where, {
            orderBy: [{ domain: 'asc' }, { sortOrder: 'asc' }, { code: 'asc' }]
        });
    }

    findById(id: string): Promise<DictionaryItem | null> {
        return this.dictionaryItemRepository.findOne({ id });
    }

    findByDomainCode(domain: DictionaryDomain, code: string): Promise<DictionaryItem | null> {
        return this.dictionaryItemRepository.findOne({ domain, code });
    }

    createItem(input: ConstructorParameters<typeof DictionaryItem>[0]): DictionaryItem {
        return this.dictionaryItemRepository.create(input);
    }

    async saveItem(item: DictionaryItem): Promise<void> {
        await this.dictionaryItemRepository.getEntityManager().persist(item).flush();
    }

    async countUsage(domain: DictionaryDomain, code: string): Promise<number> {
        switch (domain) {
            case 'attachment-category':
                return this.attachmentRepository.count({ category: code });
            case 'sales-follow-up-type':
                return this.salesFollowUpRepository.count({ followUpType: code });
            case 'expense-category':
                return this.expenseRecordRepository.count({ expenseCategory: code });
            case 'lead-source':
                return this.leadRepository.count({ sourceCode: code });
        }
    }
}
