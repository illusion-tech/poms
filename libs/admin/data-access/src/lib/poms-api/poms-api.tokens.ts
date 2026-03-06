import { InjectionToken } from '@angular/core';

export type AuthTokenProvider = () => string | undefined;

export const POMS_AUTH_TOKEN_PROVIDER = new InjectionToken<AuthTokenProvider>('POMS_AUTH_TOKEN_PROVIDER');

