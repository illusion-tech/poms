import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { BusinessNumberSequence } from './business-number-sequence.entity';
import { BusinessNumberService } from './business-number.service';

@Module({
    imports: [MikroOrmModule.forFeature([BusinessNumberSequence])],
    providers: [BusinessNumberService],
    exports: [BusinessNumberService]
})
export class BusinessNumberModule {}
