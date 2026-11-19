import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Customer } from '../customer/customer.entity';
import { Lead } from '../lead/lead.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { Project } from '../project/project.entity';
import { SalesFollowUpRecord } from '../sales-follow-up/sales-follow-up-record.entity';
import { CompetitorIntelligenceRecord, CustomerContact } from '../sales-intelligence/sales-intelligence.entity';
import { BusinessDiscussionController } from './business-discussion.controller';
import { BusinessDiscussionComment, BusinessDiscussionThread } from './business-discussion.entity';
import { BusinessDiscussionRepository } from './business-discussion.repository';
import { BusinessDiscussionService } from './business-discussion.service';

@Module({
    imports: [
        MikroOrmModule.forFeature([
            BusinessDiscussionThread,
            BusinessDiscussionComment,
            Customer,
            Lead,
            Project,
            PlatformUser,
            CustomerContact,
            CompetitorIntelligenceRecord,
            SalesFollowUpRecord
        ])
    ],
    controllers: [BusinessDiscussionController],
    providers: [BusinessDiscussionRepository, BusinessDiscussionService],
    exports: [BusinessDiscussionRepository, BusinessDiscussionService]
})
export class BusinessDiscussionModule {}
