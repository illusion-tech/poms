import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ApprovalSummaryModule } from '../approval-summary/approval-summary.module';
import { Contract } from '../contract/contract.entity';
import { OrgUnit } from '../platform/org-unit.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { ProjectHandover } from '../project-handover/project-handover.entity';
import { ProjectController } from './project.controller';
import { Project } from './project.entity';
import { ProjectQueryService } from './project-query.service';
import { ProjectRepository } from './project.repository';
import { ProjectService } from './project.service';

@Module({
    imports: [MikroOrmModule.forFeature([Project, PlatformUser, OrgUnit, Contract, ProjectHandover]), ApprovalSummaryModule],
    controllers: [ProjectController],
    providers: [ProjectRepository, ProjectQueryService, ProjectService],
    exports: [ProjectQueryService, ProjectService],
})
export class ProjectModule {}
