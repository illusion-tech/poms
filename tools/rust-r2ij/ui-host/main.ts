import { provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { providePomsApiClient } from '@poms/admin-data-access/lib/poms-api/provide-poms-api-client';
import { FixtureRoot } from './fixture-root';
import { SourceNavigation } from './source-navigation';
import { MyPreset, POMS_PRIMENG_TRANSLATION_ZH_CN } from './original-theme';
const backend = new URLSearchParams(globalThis.location.search).get('backend') ?? globalThis.sessionStorage.getItem('r2ijBackend');
if (backend !== 'nest' && backend !== 'rust') throw new Error('Explicit controlled backend is required');
globalThis.sessionStorage.setItem('r2ijBackend', backend);
bootstrapApplication(FixtureRoot, {
    providers: [
        provideZonelessChangeDetection(),
        providePomsApiClient({ basePath: '' }),
        providePrimeNG({ theme: { preset: MyPreset, options: { darkModeSelector: '.app-dark' } }, translation: POMS_PRIMENG_TRANSLATION_ZH_CN }),
        provideRouter([
            { path: '', pathMatch: 'full', children: [] },
            { path: 'customers', component: SourceNavigation }, { path: 'leads', component: SourceNavigation },
            { path: 'projects/:id', component: SourceNavigation }, { path: 'contracts/:id', component: SourceNavigation }
        ])
    ]
}).catch(() => { document.body.textContent = '原组件测试宿主启动失败'; });
