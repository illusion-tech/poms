import { Inject, Body, Controller, Get, Param, Patch, Post, Query, Request } from '@nestjs/common';
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
    CreateCustomerAliasRequestDto,
    CreateCustomerRequestDto,
    CustomerAliasDto,
    CustomerAliasListDto,
    CustomerDetailViewDto,
    CustomerDto,
    CustomerListDto,
    CustomerListQueryDto,
    CustomerWorkspaceOverviewViewDto,
    UpdateCustomerRequestDto
} from '@poms/api-contracts';
import type { CustomerAliasSummary, CustomerDetailView, CustomerListQuery, CustomerListView, CustomerSummary, CustomerWorkspaceOverviewView, UserPayload } from '@poms/shared-contracts';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { CustomerService } from './customer.service';

@ApiTags('customer')
@ApiCookieAuth('pomsSession')
@Controller('customers')
export class CustomerController {
    constructor(@Inject(CustomerService) private readonly customerService: CustomerService) {}

    @Get()
    @HasPermissions('customer:read')
    @ApiOperation({ summary: '获取客户列表' })
    @ApiOkResponse({ type: CustomerListDto })
    list(@Query() query: CustomerListQueryDto): Promise<CustomerListView[]> {
        const listQuery: CustomerListQuery = {
            status: query.status,
            ownerOrgId: query.ownerOrgId,
            keyword: query.keyword
        };

        return this.customerService.listCustomers(listQuery);
    }

    @Post()
    @HasPermissions('customer:write')
    @ApiOperation({ summary: '创建客户主数据' })
    @ApiCreatedResponse({ type: CustomerDto })
    create(@Body() body: CreateCustomerRequestDto, @Request() req: { user: UserPayload }): Promise<CustomerSummary> {
        return this.customerService.createCustomer(body, req.user.sub);
    }

    @Get(':id/aliases')
    @HasPermissions('customer:read')
    @ApiOperation({ summary: '获取客户别名列表' })
    @ApiOkResponse({ type: CustomerAliasListDto })
    listAliases(@Param('id') id: string): Promise<CustomerAliasSummary[]> {
        return this.customerService.listAliases(id);
    }

    @Post(':id/aliases')
    @HasPermissions('customer:write')
    @ApiOperation({ summary: '创建客户别名' })
    @ApiCreatedResponse({ type: CustomerAliasDto })
    createAlias(@Param('id') id: string, @Body() body: CreateCustomerAliasRequestDto, @Request() req: { user: UserPayload }): Promise<CustomerAliasSummary> {
        return this.customerService.createAlias(id, body, req.user.sub);
    }

    @Get(':id/workspace-overview')
    @HasPermissions('customer:read')
    @ApiOperation({ summary: '获取客户工作台聚合概览' })
    @ApiOkResponse({ type: CustomerWorkspaceOverviewViewDto })
    getWorkspaceOverview(@Param('id') id: string): Promise<CustomerWorkspaceOverviewView> {
        return this.customerService.getCustomerWorkspaceOverview(id);
    }

    @Get(':id')
    @HasPermissions('customer:read')
    @ApiOperation({ summary: '获取客户详情' })
    @ApiOkResponse({ type: CustomerDetailViewDto })
    getById(@Param('id') id: string): Promise<CustomerDetailView> {
        return this.customerService.getCustomer(id);
    }

    @Patch(':id')
    @HasPermissions('customer:write')
    @ApiOperation({ summary: '更新客户基础信息' })
    @ApiOkResponse({ type: CustomerDetailViewDto })
    update(@Param('id') id: string, @Body() body: UpdateCustomerRequestDto, @Request() req: { user: UserPayload }): Promise<CustomerDetailView> {
        return this.customerService.updateCustomer(id, body, req.user.sub);
    }
}
