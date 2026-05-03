import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
    ActiveInactiveStatusValue,
    type CreateDictionaryItemRequest,
    type DictionaryDomain,
    type DictionaryItemListQuery,
    type DictionaryItemSummary,
    type UpdateDictionaryItemRequest
} from '@poms/shared-contracts';
import { DictionaryItem } from './dictionary-item.entity';
import { DictionaryRepository } from './dictionary.repository';

@Injectable()
export class DictionaryService {
    constructor(private readonly dictionaryRepository: DictionaryRepository) {}

    async listItems(query: DictionaryItemListQuery = {}): Promise<DictionaryItemSummary[]> {
        const items = await this.dictionaryRepository.findItems(query);
        return Promise.all(items.map((item) => this.toSummary(item)));
    }

    async createItem(request: CreateDictionaryItemRequest, operatorId?: string | null): Promise<DictionaryItemSummary> {
        const existing = await this.dictionaryRepository.findByDomainCode(request.domain, request.code);
        if (existing) {
            throw new ConflictException(`Dictionary item already exists: ${request.domain}/${request.code}`);
        }

        const item = this.dictionaryRepository.createItem({
            domain: request.domain,
            code: request.code,
            name: request.name,
            description: request.description ?? null,
            status: ActiveInactiveStatusValue.Active,
            sortOrder: request.sortOrder ?? 100,
            isSystem: false,
            createdBy: operatorId ?? null,
            updatedBy: operatorId ?? null
        });

        await this.dictionaryRepository.saveItem(item);
        return this.toSummary(item);
    }

    async updateItem(id: string, request: UpdateDictionaryItemRequest, operatorId?: string | null): Promise<DictionaryItemSummary> {
        const item = await this.dictionaryRepository.findById(id);
        if (!item) {
            throw new NotFoundException(`Dictionary item not found: ${id}`);
        }

        if (request.expectedVersion !== undefined && item.rowVersion !== request.expectedVersion) {
            throw new ConflictException(`Dictionary item version conflict: expected ${request.expectedVersion}, actual ${item.rowVersion}`);
        }

        if (request.name !== undefined) {
            item.name = request.name;
        }
        if (request.description !== undefined) {
            item.description = request.description ?? null;
        }
        if (request.status !== undefined) {
            item.status = request.status;
        }
        if (request.sortOrder !== undefined) {
            item.sortOrder = request.sortOrder;
        }

        item.updatedBy = operatorId ?? null;

        await this.dictionaryRepository.saveItem(item);
        return this.toSummary(item);
    }

    async requireActiveItem(domain: DictionaryDomain, code: string): Promise<DictionaryItem> {
        const item = await this.dictionaryRepository.findByDomainCode(domain, code);
        if (!item) {
            throw new BadRequestException(`Dictionary item not found: ${domain}/${code}`);
        }

        if (item.status !== ActiveInactiveStatusValue.Active) {
            throw new BadRequestException(`Dictionary item is inactive: ${domain}/${code}`);
        }

        return item;
    }

    private async toSummary(item: DictionaryItem): Promise<DictionaryItemSummary> {
        return {
            id: item.id,
            domain: item.domain,
            code: item.code,
            name: item.name,
            description: item.description ?? null,
            status: item.status,
            sortOrder: item.sortOrder,
            isSystem: item.isSystem,
            usageCount: await this.dictionaryRepository.countUsage(item.domain, item.code),
            rowVersion: item.rowVersion,
            createdAt: item.createdAt.toISOString(),
            createdBy: item.createdBy ?? null,
            updatedAt: item.updatedAt.toISOString(),
            updatedBy: item.updatedBy ?? null
        };
    }
}
