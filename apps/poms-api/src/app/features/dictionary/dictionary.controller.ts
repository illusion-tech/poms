import { Body, Controller, Get, Param, Patch, Post, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
    CreateDictionaryItemRequestDto,
    DictionaryItemDto,
    DictionaryItemListDto,
    DictionaryItemListQueryDto,
    UpdateDictionaryItemRequestDto
} from '@poms/api-contracts';
import type { DictionaryItemListQuery, DictionaryItemSummary, UserPayload } from '@poms/shared-contracts';
import { HasAnyPermissions } from '../../core/auth/decorators/has-any-permissions.decorator';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { DictionaryService } from './dictionary.service';

@ApiTags('Dictionary')
@ApiBearerAuth()
@Controller('dictionaries')
export class DictionaryController {
    constructor(private readonly dictionaryService: DictionaryService) {}

    @Get()
    @HasAnyPermissions('lead:read', 'customer:read', 'project:read', 'contract:finance:manage', 'platform:dictionaries:manage')
    @ApiOperation({ summary: '获取业务配置字典项列表' })
    @ApiOkResponse({ type: DictionaryItemListDto })
    list(@Query() query: DictionaryItemListQueryDto): Promise<DictionaryItemSummary[]> {
        const listQuery: DictionaryItemListQuery = {
            domain: query.domain,
            status: query.status,
            keyword: query.keyword
        };

        return this.dictionaryService.listItems(listQuery);
    }

    @Post()
    @HasPermissions('platform:dictionaries:manage')
    @ApiOperation({ summary: '创建业务配置字典项' })
    @ApiCreatedResponse({ type: DictionaryItemDto })
    create(@Body() body: CreateDictionaryItemRequestDto, @Request() req: { user: UserPayload }): Promise<DictionaryItemSummary> {
        return this.dictionaryService.createItem(
            {
                domain: body.domain,
                code: body.code,
                name: body.name,
                description: body.description,
                sortOrder: body.sortOrder
            },
            req.user.sub
        );
    }

    @Patch(':id')
    @HasPermissions('platform:dictionaries:manage')
    @ApiOperation({ summary: '更新业务配置字典项' })
    @ApiOkResponse({ type: DictionaryItemDto })
    update(@Param('id') id: string, @Body() body: UpdateDictionaryItemRequestDto, @Request() req: { user: UserPayload }): Promise<DictionaryItemSummary> {
        return this.dictionaryService.updateItem(
            id,
            {
                name: body.name,
                description: body.description,
                status: body.status,
                sortOrder: body.sortOrder,
                expectedVersion: body.expectedVersion
            },
            req.user.sub
        );
    }
}
