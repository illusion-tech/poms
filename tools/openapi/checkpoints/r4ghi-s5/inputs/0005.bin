import { Injectable } from '@nestjs/common';
import { loadValidatedEnv } from '../../../config/load-env';

export const AUTH_SESSION_COOKIE_NAME = 'poms_session';
export const AUTH_CSRF_COOKIE_NAME = 'poms_csrf';
export const AUTH_CSRF_HEADER_NAME = 'X-CSRF-Token';

export type AuthCookieOptions = {
    secure?: boolean;
    path?: string;
    now?: Date;
};

@Injectable()
export class AuthSessionCookieService {
    createSessionCookieHeader(token: string, expiresAt: Date, options: AuthCookieOptions = {}): string {
        return this.#createCookieHeader(this.sessionCookieName, token, {
            expiresAt,
            httpOnly: true,
            options
        });
    }

    createCsrfCookieHeader(token: string, expiresAt: Date, options: AuthCookieOptions = {}): string {
        return this.#createCookieHeader(this.csrfCookieName, token, {
            expiresAt,
            httpOnly: false,
            options
        });
    }

    createClearSessionCookieHeader(options: AuthCookieOptions = {}): string {
        return this.#createClearCookieHeader(this.sessionCookieName, true, options);
    }

    createClearCsrfCookieHeader(options: AuthCookieOptions = {}): string {
        return this.#createClearCookieHeader(this.csrfCookieName, false, options);
    }

    getSessionTokenFromCookieHeader(cookieHeader: string | string[] | undefined): string | null {
        return this.#getCookieValue(cookieHeader, this.sessionCookieName);
    }

    getCsrfTokenFromCookieHeader(cookieHeader: string | string[] | undefined): string | null {
        return this.#getCookieValue(cookieHeader, this.csrfCookieName);
    }

    get sessionCookieName(): string {
        return AUTH_SESSION_COOKIE_NAME;
    }

    get csrfCookieName(): string {
        return AUTH_CSRF_COOKIE_NAME;
    }

    get csrfHeaderName(): string {
        return AUTH_CSRF_HEADER_NAME;
    }

    #createCookieHeader(
        name: string,
        value: string,
        {
            expiresAt,
            httpOnly,
            options
        }: {
            expiresAt: Date;
            httpOnly: boolean;
            options: AuthCookieOptions;
        }
    ): string {
        const now = options.now ?? new Date();
        const maxAgeSeconds = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
        return [
            `${name}=${encodeURIComponent(value)}`,
            `Max-Age=${maxAgeSeconds}`,
            `Expires=${expiresAt.toUTCString()}`,
            `Path=${this.#cookiePath(options)}`,
            'SameSite=Lax',
            ...(httpOnly ? ['HttpOnly'] : []),
            ...(this.#secureCookie(options) ? ['Secure'] : [])
        ].join('; ');
    }

    #createClearCookieHeader(name: string, httpOnly: boolean, options: AuthCookieOptions): string {
        return [
            `${name}=`,
            'Max-Age=0',
            'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
            `Path=${this.#cookiePath(options)}`,
            'SameSite=Lax',
            ...(httpOnly ? ['HttpOnly'] : []),
            ...(this.#secureCookie(options) ? ['Secure'] : [])
        ].join('; ');
    }

    #getCookieValue(cookieHeader: string | string[] | undefined, name: string): string | null {
        const header = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader;
        if (!header) {
            return null;
        }

        const prefix = `${name}=`;
        const pair = header
            .split(';')
            .map((part) => part.trim())
            .find((part) => part.startsWith(prefix));

        if (!pair) {
            return null;
        }

        const rawValue = pair.slice(prefix.length);
        return rawValue ? decodeURIComponent(rawValue) : null;
    }

    #cookiePath(options: AuthCookieOptions): string {
        return options.path ?? process.env['AUTH_COOKIE_PATH'] ?? '/api';
    }

    #secureCookie(options: AuthCookieOptions): boolean {
        if (options.secure !== undefined) {
            return options.secure;
        }

        const env = loadValidatedEnv();
        return env.AUTH_COOKIE_SECURE ?? env.NODE_ENV === 'production';
    }
}
