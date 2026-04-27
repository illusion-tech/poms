import { Global, Module } from '@nestjs/common';
import { SensitiveFieldProjectionService } from './sensitive-field-projection.service';

@Global()
@Module({
    providers: [SensitiveFieldProjectionService],
    exports: [SensitiveFieldProjectionService]
})
export class SensitiveFieldProjectionModule {}
