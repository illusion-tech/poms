import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Attachment } from '../attachment/attachment.entity';
import { ExpenseRecord } from '../project-cost/expense-record.entity';
import { SalesFollowUpRecord } from '../sales-follow-up/sales-follow-up-record.entity';
import { DictionaryController } from './dictionary.controller';
import { DictionaryItem } from './dictionary-item.entity';
import { DictionaryRepository } from './dictionary.repository';
import { DictionaryService } from './dictionary.service';

@Module({
    imports: [MikroOrmModule.forFeature([DictionaryItem, Attachment, SalesFollowUpRecord, ExpenseRecord])],
    controllers: [DictionaryController],
    providers: [DictionaryRepository, DictionaryService],
    exports: [DictionaryRepository, DictionaryService]
})
export class DictionaryModule {}
