import { Routes } from '@angular/router';

export default [
    {
        path: 'documentation',
        loadComponent: () => import('@poms/admin/demo/documentation/documentation').then((c) => c.Documentation)
    },
    { path: 'crud', loadComponent: () => import('@poms/admin/demo/crud/crud').then((c) => c.Crud), data: { breadcrumb: 'Crud' } },
    { path: 'empty', loadComponent: () => import('@poms/admin/demo/misc/empty/empty').then((c) => c.Empty), data: { breadcrumb: 'Empty' } },
    {
        path: 'invoice',
        loadComponent: () => import('@poms/admin/demo/invoice/invoice').then((c) => c.Invoice),
        data: { breadcrumb: 'Invoice' }
    },
    {
        path: 'aboutus',
        loadComponent: () => import('@poms/admin/demo/aboutus/aboutus').then((c) => c.AboutUs),
        data: { breadcrumb: 'About' }
    },
    { path: 'help', loadComponent: () => import('@poms/admin/features/help-center/help/help').then((c) => c.Help), data: { breadcrumb: 'Help' } },
    { path: 'faq', loadComponent: () => import('@poms/admin/features/help-center/faq/faq').then((c) => c.Faq), data: { breadcrumb: 'FAQ' } },
    {
        path: 'contact',
        loadComponent: () => import('@poms/admin/features/help-center/contactus/contactus').then((c) => c.ContactUs),
        data: { breadcrumb: 'Contact Us' }
    },
    {
        path: 'error',
        redirectTo: '/notfound'
    },
    { path: '**', redirectTo: '/notfound' }
] as Routes;
