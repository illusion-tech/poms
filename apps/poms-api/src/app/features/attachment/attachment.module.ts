import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Contract } from '../contract/contract.entity';
import { Customer } from '../customer/customer.entity';
import { DictionaryModule } from '../dictionary/dictionary.module';
import { Lead } from '../lead/lead.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { Project } from '../project/project.entity';
import { ProjectHandover } from '../project-handover/project-handover.entity';
import { SalesFollowUpRecord } from '../sales-follow-up/sales-follow-up-record.entity';
import { AttachmentHandoverController } from './attachment-handover.controller';
import { AttachmentController } from './attachment.controller';
import {
    Attachment,
    AttachmentDownloadPackage,
    AttachmentDownloadPackageItem,
    AttachmentLink,
    ProjectHandoverAttachmentSelection
} from './attachment.entity';
import { AttachmentRepository } from './attachment.repository';
import { AttachmentService } from './attachment.service';
import { AttachmentStorageService } from './attachment-storage.service';

@Module({
    imports: [
        MikroOrmModule.forFeature([
            Attachment,
            AttachmentLink,
            ProjectHandoverAttachmentSelection,
            AttachmentDownloadPackage,
            AttachmentDownloadPackageItem,
            Customer,
            Lead,
            Project,
            Contract,
            SalesFollowUpRecord,
            ProjectHandover,
            PlatformUser
        ]),
        DictionaryModule
    ],
    controllers: [AttachmentController, AttachmentHandoverController],
    providers: [AttachmentRepository, AttachmentService, AttachmentStorageService],
    exports: [AttachmentRepository, AttachmentService, AttachmentStorageService]
})
export class AttachmentModule {}
