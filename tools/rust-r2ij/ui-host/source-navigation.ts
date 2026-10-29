import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
@Component({
    selector: 'app-source-navigation', changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<section aria-label="来源导航结果"><h2>来源导航已触发</h2><p data-testid="source-url">{{ router.url }}</p><p>此处只验证原组件生成的来源 URL，未加载业务详情。</p></section>`
})
export class SourceNavigation { readonly router = inject(Router); }
