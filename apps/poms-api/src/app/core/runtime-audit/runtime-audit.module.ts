import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Global, Module } from '@nestjs/common';
import { AuditLog } from './audit-log.entity';
import { RuntimeAuditController } from './runtime-audit.controller';
import { RuntimeAuditRepository } from './runtime-audit.repository';
import { RuntimeAuditService } from './runtime-audit.service';
import { SecurityEvent } from './security-event.entity';

@Global()
@Module({
    imports: [MikroOrmModule.forFeature([AuditLog, SecurityEvent])],
    controllers: [RuntimeAuditController],
    providers: [RuntimeAuditRepository, RuntimeAuditService],
    exports: [RuntimeAuditService]
})
export class RuntimeAuditModule {}
