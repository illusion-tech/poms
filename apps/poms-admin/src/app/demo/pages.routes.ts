import { Routes } from '@angular/router';

export default [
    {
        path: 'documentation',
        loadComponent: () => import('./documentation/documentation').then((c) => c.Documentation)
    },
    { path: 'crud', loadComponent: () => import('./crud/crud').then((c) => c.Crud), data: { breadcrumb: 'Crud' } },
    { path: 'empty', loadComponent: () => import('./misc/empty/empty').then((c) => c.Empty), data: { breadcrumb: 'Empty' } },
    {
        path: 'invoice',
        loadComponent: () => import('./invoice/invoice').then((c) => c.Invoice),
        data: { breadcrumb: 'Invoice' }
    },
    {
        path: 'aboutus',
        loadComponent: () => import('./aboutus/aboutus').then((c) => c.AboutUs),
        data: { breadcrumb: 'About' }
    },
    { path: 'help', loadComponent: () => import('../features/help-center/help/help').then((c) => c.Help), data: { breadcrumb: 'Help' } },
    { path: 'faq', loadComponent: () => import('../features/help-center/faq/faq').then((c) => c.Faq), data: { breadcrumb: 'FAQ' } },
    {
        path: 'contact',
        loadComponent: () => import('../features/help-center/contactus/contactus').then((c) => c.ContactUs),
        data: { breadcrumb: 'Contact Us' }
    },
    {
        path: 'error',
        redirectTo: '/notfound'
    },
    { path: '**', redirectTo: '/notfound' }
] as Routes;
