import type { UserPayload } from '@poms/shared-contracts';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RuntimeAuditService } from '../../runtime-audit/runtime-audit.service';
import { getRequestId, getRequestIp, getRequestMethod, getRequestPath, getRequestUserAgent, type RuntimeAuditRequestLike } from '../../runtime-audit/runtime-audit-request.utils';
import { findDevUserById } from '../../platform/dev-platform.fixtures';
import { PlatformService } from '../../../features/platform/platform.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly platformService: PlatformService,
        private readonly runtimeAuditService: RuntimeAuditService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env['JWT_SECRET'] ?? 'poms-dev-secret-change-in-production',
            passReqToCallback: true
        });
    }

    async validate(request: RuntimeAuditRequestLike, payload: UserPayload): Promise<UserPayload> {
        const platformUser = await this.platformService.resolveActiveAuthUser(payload.sub);
        if (platformUser) {
            return {
                sub: platformUser.userId,
                username: platformUser.username,
                permissions: platformUser.permissions
            };
        }

        const isKnownPlatformUser = await this.platformService.isKnownPlatformUser(payload.sub);
        if (isKnownPlatformUser) {
            await this.#recordTokenRejection(request, payload, 'inactive_or_removed_user');
            throw new UnauthorizedException('User is inactive or no longer exists');
        }

        const fixtureUser = findDevUserById(payload.sub);
        if (fixtureUser) {
            return payload;
        }

        await this.#recordTokenRejection(request, payload, 'unknown_principal');
        throw new UnauthorizedException('User is inactive or no longer exists');
    }

    async #recordTokenRejection(request: RuntimeAuditRequestLike, payload: UserPayload, reason: string): Promise<void> {
        await this.runtimeAuditService.recordSecurityEvent({
            eventType: 'auth.token.rejected',
            severity: 'warning',
            actorId: payload.sub,
            principal: payload.username,
            requestId: getRequestId(request),
            path: getRequestPath(request),
            method: getRequestMethod(request),
            result: 'expired',
            ip: getRequestIp(request),
            userAgent: getRequestUserAgent(request),
            details: {
                reason
            }
        });
    }
}
