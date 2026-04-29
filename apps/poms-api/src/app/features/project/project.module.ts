import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ApprovalSummaryModule } from '../approval-summary/approval-summary.module';
import { BusinessNumberModule } from '../business-number/business-number.module';
import { Contract } from '../contract/contract.entity';
import { CustomerModule } from '../customer/customer.module';
import { Lead } from '../lead/lead.entity';
import { OrgUnit } from '../platform/org-unit.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { ProjectHandover } from '../project-handover/project-handover.entity';
import { AcceptanceRecord } from './acceptance-record.entity';
import { ProjectArchiveRecord } from './project-archive-record.entity';
import { ProjectCompletionRecord } from './project-completion-record.entity';
import { ProjectOwnerReassignmentRecord } from './project-owner-reassignment-record.entity';
import { ProjectPricingMarginConditionItem, ProjectPricingMarginReview } from './project-pricing-margin-review.entity';
import { ProjectBidCommercialMaterialItem, ProjectBidCommercialProcess, ProjectBidCommercialTimelineItem } from './project-bid-commercial-process.entity';
import { ProjectTechnicalCostItem, ProjectTechnicalCostPackage, ProjectTechnicalRiskItem, ProjectTechnicalScopeItem } from './project-technical-cost-package.entity';
import { ProjectArchiveRecordController, ProjectController } from './project.controller';
import { Project } from './project.entity';
import { ProjectQueryService } from './project-query.service';
import { ProjectRepository } from './project.repository';
import { ProjectService } from './project.service';

@Module({
    imports: [
        MikroOrmModule.forFeature([
            Project,
            Lead,
            PlatformUser,
            OrgUnit,
            Contract,
            ProjectHandover,
            AcceptanceRecord,
            ProjectCompletionRecord,
            ProjectArchiveRecord,
            ProjectOwnerReassignmentRecord,
            ProjectBidCommercialProcess,
            ProjectBidCommercialMaterialItem,
            ProjectBidCommercialTimelineItem,
            ProjectPricingMarginReview,
            ProjectPricingMarginConditionItem,
            ProjectTechnicalCostPackage,
            ProjectTechnicalScopeItem,
            ProjectTechnicalRiskItem,
            ProjectTechnicalCostItem
        ]),
        ApprovalSummaryModule,
        BusinessNumberModule,
        CustomerModule
    ],
    controllers: [ProjectController, ProjectArchiveRecordController],
    providers: [ProjectRepository, ProjectQueryService, ProjectService],
    exports: [ProjectQueryService, ProjectService]
})
export class ProjectModule {}
