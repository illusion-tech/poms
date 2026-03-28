import type { UserPayload } from '@poms/shared-contracts';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { findDevUserById } from '../../platform/dev-platform.fixtures';
import { PlatformService } from '../../../features/platform/platform.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly platformService: PlatformService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env['JWT_SECRET'] ?? 'poms-dev-secret-change-in-production'
        });
    }

    async validate(payload: UserPayload): Promise<UserPayload> {
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
            throw new UnauthorizedException('User is inactive or no longer exists');
        }

        const fixtureUser = findDevUserById(payload.sub);
        if (fixtureUser) {
            return payload;
        }

        throw new UnauthorizedException('User is inactive or no longer exists');
    }
}
