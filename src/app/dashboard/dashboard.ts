import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { lucideHouse, lucideInbox, lucideSettings } from '@ng-icons/lucide';
import { lucideMoveRight } from '@ng-icons/lucide';
import { lucideMenu } from '@ng-icons/lucide';
import { provideIcons } from '@ng-icons/core';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { DashboardService, DashboardStats, RecentOrder } from '../services/dashboard.service';

interface TopItem {
  id: number;
  name: string;
  qty: number;
  revenue: number;
  image?: string;
}

const API_HOST = 'https://bssrms.runasp.net';

const IMAGE_FOLDER = '/images/food/';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HlmSidebarImports,
    HlmButtonImports,
    HlmCardImports,
    HlmTableImports,
    HlmAlertImports,
    Sidebar,
    Header,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',

  providers: [
    provideIcons({
      lucideHouse,
      lucideInbox,
      lucideSettings,
      lucideMoveRight,
      lucideMenu,
    }),
  ],
})
export class Dashboard implements OnInit {
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly dashboardService = inject(DashboardService);

  activeView = 'POS';
  loading = true;
  errorMessage = '';

  // top cards
  todayOrders = 0;
  tablesOccupied = 0;
  totalTables = 0;
  tablesAvailable = 0;
  totalEmployees = 0;

  recentOrders: RecentOrder[] = [];
  topItems: TopItem[] = [];

  failedImages = new Set<string>();

  ngOnInit(): void {
    this.loadDashboardStats();
  }

  private num(value: unknown): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  loadDashboardStats(): void {
    const now = new Date();

    this.loading = true;
    this.errorMessage = '';

    this.dashboardService.getDashboardStats(now.getMonth() + 1, now.getFullYear()).subscribe({
      next: (data: DashboardStats) => {
        this.applyStats(data);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        console.error('DASHBOARD STATS API ERROR:', error);

        this.errorMessage =
          error.status === 401
            ? 'Unauthorized. Please log in again.'
            : 'Could not load dashboard data. Please try again.';

        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private applyStats(data: DashboardStats): void {
    this.todayOrders = this.num(data?.todaysOrders);
    this.totalEmployees = this.num(data?.totalEmployees);

    this.totalTables = this.num(data?.totalTables);
    this.tablesOccupied = this.num(data?.occupiedTables);
    this.tablesAvailable = Math.max(this.totalTables - this.tablesOccupied, 0);

    this.recentOrders = Array.isArray(data?.recentOrders) ? data.recentOrders.slice(0, 5) : [];

    this.failedImages.clear();
    this.topItems = (Array.isArray(data?.topSellingFoods) ? data.topSellingFoods : [])
      .map((f) => ({
        id: f.id,
        name: f.name,
        qty: this.num(f.totalQuantitySold),
        revenue: this.num(f.totalRevenue),
        image: this.imageUrl(f.image),
      }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }

  private imageUrl(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;

    const image = value.trim().replace(/\\/g, '/');
    if (!image) return undefined;

    if (/^(https?:\/\/|data:image\/|blob:)/i.test(image)) return image;
    if (!image.includes('/')) return `${API_HOST}${IMAGE_FOLDER}${encodeURIComponent(image)}`;

    return image.startsWith('/') ? `${API_HOST}${image}` : `${API_HOST}/${image}`;
  }

  onImgError(key: string | number): void {
    this.failedImages.add(String(key));
    this.cdr.detectChanges();
  }

  orderDate(order: RecentOrder): Date | null {
    const raw = order?.orderTime;
    if (!raw) return null;

    const d = new Date(raw.replace(/(\.\d{3})\d+/, '$1'));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  statusKey(order: RecentOrder): string {
    return String(order?.orderStatus ?? '')
      .toLowerCase()
      .replace(/\s+/g, '-');
  }

  get maxQty(): number {
    return Math.max(...this.topItems.map((i) => i.qty), 1);
  }

  initial(name: string): string {
    return (name ?? '?').trim().charAt(0).toUpperCase();
  }

  selectNav(id: string): void {
    this.activeView = id;
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
