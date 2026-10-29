import { provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { providePomsApiClient } from '@poms/admin-data-access/lib/poms-api/provide-poms-api-client';
import { KFixtureRoot } from './fixture-root';
import { MyPreset, POMS_PRIMENG_TRANSLATION_ZH_CN } from './original-theme';

const backend = new URLSearchParams(globalThis.location.search).get('backend') ?? globalThis.sessionStorage.getItem('r2kBackend');
if (backend !== 'nest' && backend !== 'rust') throw new Error('Explicit controlled backend is required');
globalThis.sessionStorage.setItem('r2kBackend', backend);

bootstrapApplication(KFixtureRoot, {
    providers: [
        provideZonelessChangeDetection(),
        providePomsApiClient({ basePath: '' }),
        provideRouter([]),
        providePrimeNG({ theme: { preset: MyPreset, options: { darkModeSelector: '.app-dark' } }, translation: POMS_PRIMENG_TRANSLATION_ZH_CN })
    ]
}).catch(() => { document.body.textContent = 'K 原片段验收宿主启动失败'; });
