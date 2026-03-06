import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { StatsWidget } from '@poms/admin/features/dashboard/ecommerce/components/statswidget';
import { TopProductsWidget } from '@poms/admin/features/dashboard/ecommerce/components/topproductswidget';
import { TrafficWidget } from '@poms/admin/features/dashboard/ecommerce/components/trafficwidget';
import { LeaderBoardWidget } from '@poms/admin/features/dashboard/ecommerce/components/leaderboardwidget';
import { ProductListWidget } from '@poms/admin/features/dashboard/ecommerce/components/productlistwidget';
import { SellersWidget } from '@poms/admin/features/dashboard/ecommerce/components/sellerswidget';

@Component({
    selector: 'app-ecommerce-dashboard',
    standalone: true,
    imports: [CommonModule, TagModule, StatsWidget, TopProductsWidget, TrafficWidget, LeaderBoardWidget, ProductListWidget, SellersWidget],
    template: ` <div class="flex flex-col gap-6">
        <stats-widget />
        <div class="w-full grid grid-cols-1 xl:grid-cols-3 gap-6">
            <top-products-widget />
            <traffic-widget />
        </div>
        <div class="w-full grid grid-cols-1 xl:grid-cols-3 gap-6">
            <leader-board-widget />
            <product-list-widget />
            <sellers-widget />
        </div>
    </div>`
})
export class EcommerceDashboard {}
