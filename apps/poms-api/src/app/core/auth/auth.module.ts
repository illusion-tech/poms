import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { APP_GUARD } from '@nestjs/core';
import { IdentityProviderModule } from '../../features/identity-provider/identity-provider.module';
import { PlatformModule } from '../../features/platform/platform.module';
import { AuthController } from './auth.controller';
import { AuthSession } from './auth-session.entity';
import { AuthSessionCookieService } from './auth-session-cookie.service';
import { AuthSessionRepository } from './auth-session.repository';
import { AuthSessionService } from './auth-session.service';
import { PermissionsGuard } from './guards/permissions.guard';
import { SessionAuthGuard } from './guards/session-auth.guard';

@Module({
    imports: [
        MikroOrmModule.forFeature([AuthSession]),
        PlatformModule,
        IdentityProviderModule
    ],
    controllers: [AuthController],
    providers: [
        AuthSessionRepository,
        AuthSessionService,
        AuthSessionCookieService,
        SessionAuthGuard,
        { provide: APP_GUARD, useClass: SessionAuthGuard },
        { provide: APP_GUARD, useClass: PermissionsGuard }
    ],
    exports: [AuthSessionService, AuthSessionCookieService, SessionAuthGuard]
})
export class AuthModule {}
