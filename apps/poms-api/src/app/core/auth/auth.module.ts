import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { IdentityProviderModule } from '../../features/identity-provider/identity-provider.module';
import { PlatformModule } from '../../features/platform/platform.module';
import { AuthController } from './auth.controller';
import { AuthSession } from './auth-session.entity';
import { AuthSessionCookieService } from './auth-session-cookie.service';
import { AuthSessionRepository } from './auth-session.repository';
import { AuthSessionService } from './auth-session.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
    imports: [
        PassportModule,
        MikroOrmModule.forFeature([AuthSession]),
        JwtModule.register({
            secret: process.env['JWT_SECRET'] ?? 'poms-dev-secret-change-in-production',
            signOptions: { expiresIn: '15m' }
        }),
        PlatformModule,
        IdentityProviderModule
    ],
    controllers: [AuthController],
    providers: [
        JwtStrategy,
        AuthSessionRepository,
        AuthSessionService,
        AuthSessionCookieService,
        SessionAuthGuard,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: PermissionsGuard }
    ],
    exports: [JwtModule, AuthSessionService, AuthSessionCookieService, SessionAuthGuard]
})
export class AuthModule {}
