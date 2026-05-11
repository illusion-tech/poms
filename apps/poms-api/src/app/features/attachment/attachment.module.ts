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
import { AttachmentStorageProviderConfig } from './attachment-storage-provider-config.entity';
import { AttachmentStorageProviderController } from './attachment-storage-provider.controller';
import { AttachmentStorageProviderRegistry } from './attachment-storage-provider-registry.service';
import { AttachmentStorageProviderRepository } from './attachment-storage-provider.repository';
import { AttachmentStorageProviderService } from './attachment-storage-provider.service';
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
import { HuaweiObsS3AttachmentObjectStorageProvider } from './huawei-obs-s3-attachment-object-storage.provider';
import { LocalAttachmentObjectStorageProvider } from './local-attachment-object-storage.provider';

@Module({
    imports: [
        MikroOrmModule.forFeature([
            Attachment,
            AttachmentStorageProviderConfig,
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
    controllers: [AttachmentController, AttachmentHandoverController, AttachmentStorageProviderController],
    providers: [
        AttachmentRepository,
        AttachmentService,
        AttachmentStorageService,
        AttachmentStorageProviderRepository,
        AttachmentStorageProviderService,
        AttachmentStorageProviderRegistry,
        LocalAttachmentObjectStorageProvider,
        HuaweiObsS3AttachmentObjectStorageProvider
    ],
    exports: [AttachmentRepository, AttachmentService, AttachmentStorageService, AttachmentStorageProviderService, AttachmentStorageProviderRegistry]
})
export class AttachmentModule {}
