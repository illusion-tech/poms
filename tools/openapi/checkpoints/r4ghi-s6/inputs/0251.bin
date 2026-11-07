import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { SystemSettingController } from './system-setting.controller';
import { SystemSetting } from './system-setting.entity';
import { SystemSettingRepository } from './system-setting.repository';
import { SystemSettingService } from './system-setting.service';

@Module({
    imports: [MikroOrmModule.forFeature([SystemSetting])],
    controllers: [SystemSettingController],
    providers: [SystemSettingRepository, SystemSettingService],
    exports: [SystemSettingService]
})
export class SystemSettingModule {}
