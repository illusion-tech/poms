import { IdentityProvider } from '@poms/admin-data-access';

interface IdentityProviderPresentation {
    label: string;
    icon: string;
    logoSrc?: string;
}

const IDENTITY_PROVIDER_PRESENTATION: Record<IdentityProvider, IdentityProviderPresentation> = {
    [IdentityProvider.Feishu]: {
        label: '飞书',
        icon: 'pi pi-send',
        logoSrc: '/identity-providers/feishu.svg'
    }
};

export function identityProviderLabel(provider: IdentityProvider): string {
    return IDENTITY_PROVIDER_PRESENTATION[provider]?.label ?? provider;
}

export function identityProviderIcon(provider: IdentityProvider): string {
    return IDENTITY_PROVIDER_PRESENTATION[provider]?.icon ?? 'pi pi-id-card';
}

export function identityProviderLogo(provider: IdentityProvider): string | null {
    return IDENTITY_PROVIDER_PRESENTATION[provider]?.logoSrc ?? null;
}
