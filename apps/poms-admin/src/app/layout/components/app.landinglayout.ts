import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopbarWidget } from '../../features/landing/components/topbarwidget';
import { RouterModule } from '@angular/router';
import { FooterWidget } from '../../features/landing/components/footerwidget';

@Component({
    selector: 'app-landing-layout',
    standalone: true,
    imports: [CommonModule, TopbarWidget, RouterModule, FooterWidget],
    template: ` <div class="w-full min-h-screen">
        <topbar-widget />
        <main>
            <router-outlet />
        </main>
        <footer-widget />
    </div>`
})
export class LandingLayout {}
