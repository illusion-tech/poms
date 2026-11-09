import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { TodoItem } from '../approval/todo-item.entity';
import { Customer, CustomerAlias } from '../customer/customer.entity';
import { CustomerModule } from '../customer/customer.module';
import { DictionaryModule } from '../dictionary/dictionary.module';
import { Lead } from '../lead/lead.entity';
import { OrgUnit } from '../platform/org-unit.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { Project } from '../project/project.entity';
import { SalesFollowUpController } from './sales-follow-up.controller';
import { SalesFollowUpRecord } from './sales-follow-up-record.entity';
import { SalesFollowUpRepository } from './sales-follow-up.repository';
import { SalesFollowUpService } from './sales-follow-up.service';

@Module({
    imports: [MikroOrmModule.forFeature([SalesFollowUpRecord, TodoItem, Customer, CustomerAlias, Lead, Project, PlatformUser, OrgUnit]), CustomerModule, DictionaryModule],
    controllers: [SalesFollowUpController],
    providers: [SalesFollowUpRepository, SalesFollowUpService],
    exports: [SalesFollowUpRepository, SalesFollowUpService]
})
export class SalesFollowUpModule {}
