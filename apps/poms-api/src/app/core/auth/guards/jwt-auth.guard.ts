import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    readonly #reflector: Reflector;

    constructor(reflector: Reflector) {
        super();
        this.#reflector = reflector;
    }

    override canActivate(context: ExecutionContext) {
        const isPublic = this.#reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
        if (isPublic) return true;
        return super.canActivate(context);
    }

    override handleRequest<TUser = unknown>(err: unknown, user: unknown): TUser {
        if (err || !user) {
            throw err ?? new UnauthorizedException('Authentication required');
        }
        return user as TUser;
    }
}
