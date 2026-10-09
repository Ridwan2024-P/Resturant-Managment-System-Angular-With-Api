import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { lucideHouse, lucideInbox, lucideSettings } from '@ng-icons/lucide';
import { lucideMoveRight } from '@ng-icons/lucide';
import { lucideMenu } from '@ng-icons/lucide';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { ChangeDetectorRef } from '@angular/core';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { DashboardService } from '../services/dashboard.service';

interface TopItem {
  name: string;
  qty: number;
  revenue: number;
  image?: string;
}

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
  activeView = 'POS';
  loading = true;
  errorMessage = '';
  successMessage = '';
  isSidebarOpen = true;
  todayOrders = 0;
  tablesOccupied = 0;
  totalTables = 0;

  tablesAvailable = 0;

  totalEmployees = 0;

  recentOrders: any[] = [];

  topItems: TopItem[] = [];

  private statsTopItems: TopItem[] = [];

  private statsHasToday = false;

  constructor(
    private router: Router,

    private cdr: ChangeDetectorRef,

    private dashboardService: DashboardService,
  ) {}

  ngOnInit(): void {
    this.loadDashboardStats();

    this.loadEmployees();

    this.loadOrders();
  }

  private loadDashboardStats(): void {
    const currentDate = new Date();

    const month = currentDate.getMonth() + 1;

    const year = currentDate.getFullYear();

    this.dashboardService.getDashboardStats(month, year).subscribe({
      next: (data) => {
        console.log('DASHBOARD STATS:', data);

        this.tablesOccupied = data?.tablesOccupied ?? data?.occupiedTables ?? 0;

        this.totalTables = data?.totalTables ?? data?.tablesCount ?? 0;

        this.tablesAvailable =
          data?.tablesAvailable ??
          data?.availableTables ??
          Math.max(this.totalTables - this.tablesOccupied, 0);

        const t = Number(
          data?.todayOrders ??
            data?.todaysOrders ??
            data?.ordersToday ??
            data?.totalOrdersToday ??
            data?.todayOrdersCount ??
            data?.data?.todayOrders ??
            NaN,
        );
        if (isFinite(t)) {
          this.statsHasToday = true;
          this.todayOrders = t;
        }

        const fromStats = this.parseStatsTopItems(data);
        if (fromStats.length && fromStats.every((i) => !i.qty)) {
          console.warn('Stats top items have no quantity field, using orders instead:', fromStats);
        } else if (fromStats.length) {
          this.statsTopItems = fromStats;
          this.topItems = fromStats;
          this.loading = false;
        }

        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('DASHBOARD STATS API ERROR:', error);
      },
    });
  }

  private loadEmployees(): void {
    this.dashboardService.getEmployees().subscribe({
      next: (data) => {
        console.log('EMPLOYEE API:', data);

        if (Array.isArray(data)) {
          this.totalEmployees = data.length;
        } else if (Array.isArray(data?.data)) {
          this.totalEmployees = data.data.length;
        } else if (Array.isArray(data?.employees)) {
          this.totalEmployees = data.employees.length;
        } else {
          this.totalEmployees = data?.totalCount ?? data?.count ?? 0;
        }

        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('EMPLOYEE API ERROR:', error);
      },
    });
  }

  private loadOrders(): void {
    this.dashboardService.getOrders().subscribe({
      next: (data) => {
        console.log('ORDER API:', data);

        const orders: any[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.orders)
              ? data.orders
              : Array.isArray(data?.data?.items)
                ? data.data.items
                : Array.isArray(data?.items)
                  ? data.items
                  : Array.isArray(data?.result)
                    ? data.result
                    : [];

        console.log('TOTAL ORDERS:', orders.length);
        console.log('ORDER SAMPLE:', orders[0]);

        const todayString = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Dhaka',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date());

        console.log('TODAY:', todayString);

        const countedToday = orders.filter((order: any) => this.isToday(order, todayString)).length;
        if (!this.statsHasToday) {
          this.todayOrders = countedToday;
        }

        console.log('TODAY ORDERS COUNT:', this.todayOrders);

        this.recentOrders = [...orders]
          .sort((a, b) => (this.orderDate(b)?.getTime() ?? 0) - (this.orderDate(a)?.getTime() ?? 0))
          .slice(0, 5);

        const hasItems = orders.some((o) => this.extractItems(o).length > 0);

        if (this.statsTopItems.length) {
          this.loading = false;
          this.cdr.detectChanges();
        } else if (hasItems) {
          this.topItems = this.buildTopItems(orders);
          this.loading = false;
          this.cdr.detectChanges();
        } else {
          console.warn('Orders have no items in list response, loading details...');
          this.loadItemsFromDetails(orders);
        }
      },

      error: (error) => {
        console.error('ORDER API ERROR:', error);

        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private rawOrderDate(order: any): any {
    const known =
      order?.createdAt ??
      order?.createdOn ??
      order?.orderDate ??
      order?.date ??
      order?.createdDate ??
      order?.orderCreatedAt ??
      order?.orderTime ??
      order?.dateTime ??
      order?.createdDateTime ??
      order?.creationDate ??
      order?.placedAt ??
      order?.time ??
      order?.timestamp;
    if (known) return known;

    if (order && typeof order === 'object') {
      for (const [k, v] of Object.entries(order)) {
        if (/date|created|time|placed/i.test(k) && v && !isNaN(new Date(v as any).getTime())) {
          return v;
        }
      }
    }
    return null;
  }

  orderDate(order: any): Date | null {
    const raw = this.rawOrderDate(order);
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  private isToday(order: any, todayString: string): boolean {
    const raw = this.rawOrderDate(order);
    if (!raw) return false;

    if (
      typeof raw === 'string' &&
      /^\d{4}-\d{2}-\d{2}/.test(raw) &&
      !/(Z|[+-]\d{2}:?\d{2})$/.test(raw)
    ) {
      return raw.substring(0, 10) === todayString;
    }

    const d = new Date(raw);
    if (isNaN(d.getTime())) return false;

    return (
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Dhaka',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d) === todayString
    );
  }

  private loadItemsFromDetails(orders: any[]): void {
    const latest = [...orders]
      .sort((a, b) => (this.orderDate(b)?.getTime() ?? 0) - (this.orderDate(a)?.getTime() ?? 0))
      .slice(0, 50)
      .filter((o) => this.orderId(o) !== '-');

    if (!latest.length) {
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    forkJoin(
      latest.map((o) =>
        this.dashboardService.getOrderById(this.orderId(o)).pipe(
          catchError((err) => {
            console.error('ORDER DETAIL ERROR:', this.orderId(o), err);
            return of(null);
          }),
        ),
      ),
    ).subscribe((details) => {
      const enriched = latest.map((o, i) => {
        const d = details[i];
        const detail = d?.data ?? d?.order ?? d;
        return detail && typeof detail === 'object' ? { ...o, ...detail } : o;
      });

      console.log('ORDER DETAIL SAMPLE:', enriched[0]);

      if (!this.statsTopItems.length) {
        this.topItems = this.buildTopItems(enriched);
      }

      const byId = new Map(enriched.map((o) => [String(this.orderId(o)), o]));
      this.recentOrders = this.recentOrders.map((o) => byId.get(String(this.orderId(o))) ?? o);

      this.loading = false;
      this.cdr.detectChanges();
    });
  }

  private extractItems(order: any): any[] {
    if (!order || typeof order !== 'object') return [];

    const known =
      order.orderItems ??
      order.items ??
      order.orderDetails ??
      order.orderItemDtos ??
      order.orderLines ??
      order.lines ??
      order.products ??
      order.menuItems;

    if (Array.isArray(known)) return known;

    for (const value of Object.values(order)) {
      if (Array.isArray(value) && value.length && typeof value[0] === 'object') {
        return value;
      }
    }
    return [];
  }

  private itemName(item: any): string | undefined {
    return (
      item?.itemName ??
      item?.menuItemName ??
      item?.productName ??
      item?.dishName ??
      item?.name ??
      item?.title ??
      item?.menuItem?.name ??
      item?.menuItem?.itemName ??
      item?.product?.name ??
      item?.item?.name
    );
  }

  private loggedItem = false;

  failedImages = new Set<string>();

  onImgError(name: string): void {
    this.failedImages.add(name);
    this.cdr.detectChanges();
  }

  private imageOf(it: any): string | undefined {
    const mi = it?.menuItem ?? it?.product ?? it?.item ?? {};
    let img: any =
      it?.imageUrl ??
      it?.image ??
      it?.imagePath ??
      it?.imageURL ??
      it?.img ??
      it?.photo ??
      it?.photoUrl ??
      it?.picture ??
      it?.pictureUrl ??
      it?.thumbnail ??
      mi?.imageUrl ??
      mi?.image ??
      mi?.imagePath ??
      mi?.photo ??
      mi?.picture;

    if (!img && it && typeof it === 'object') {
      for (const [k, v] of Object.entries(it)) {
        if (/image|img|photo|picture|thumb/i.test(k) && typeof v === 'string' && v) {
          img = v;
          break;
        }
      }
    }
    if (!img || typeof img !== 'string') return undefined;

    img = img.trim();
    if (/^(data:|blob:)/i.test(img)) return img;

    const parts = img
      .split(/(?=https?:\/\/)|[,;|]/)
      .map((x: string) => x.trim())
      .filter(Boolean);
    if (parts.length) img = parts[0];

    if (/^(https?:|data:|blob:)/i.test(img)) return img;

    const host = 'https://bssrms.runasp.net';
    img = img.replace(/[\\]/g, '/');

    if (!img.includes('/')) return `${host}/images/food/${img}`;

    return img.startsWith('/') ? host + img : host + '/' + img;
  }

  private statsQty(it: any): number {
    const named = this.pos(
      it?.quantity,
      it?.totalQuantity,
      it?.quantitySold,
      it?.soldQuantity,
      it?.totalQuantitySold,
      it?.totalSold,
      it?.soldCount,
      it?.sold,
      it?.count,
      it?.qty,
      it?.totalQty,
      it?.unitsSold,
      it?.timesSold,
      it?.timesOrdered,
      it?.orderedQuantity,
      it?.totalOrdered,
      it?.salesCount,
      it?.orderCount,
      it?.totalOrders,
      it?.orders,
      it?.numberOfOrders,
    );
    if (named) return named;

    if (it && typeof it === 'object') {
      for (const [k, v] of Object.entries(it)) {
        if (
          /qty|quantit|sold|count|units|times|ordered/i.test(k) &&
          !/price|revenue|amount|id$/i.test(k)
        ) {
          const n = this.pos(v);
          if (n) return n;
        }
      }
    }
    return 0;
  }

  /** Reads the best-sellers list out of /Dashboard/stats, whatever it is called. */
  private parseStatsTopItems(data: any): TopItem[] {
    const root = data?.data ?? data?.result ?? data ?? {};

    let list: any = [
      root?.topSellingItems,
      root?.topItems,
      root?.bestSellers,
      root?.bestSellingItems,
      root?.topSelling,
      root?.topProducts,
      root?.topMenuItems,
      root?.popularItems,
      root?.topSellingProducts,
      root?.mostSoldItems,
    ].find((v) => Array.isArray(v));

    if (!list && root && typeof root === 'object') {
      for (const [k, v] of Object.entries(root)) {
        if (/top|best|popular|selling|sold/i.test(k) && Array.isArray(v) && v.length) {
          list = v;
          break;
        }
      }
    }
    if (!Array.isArray(list)) return [];

    console.log('STATS TOP ITEMS RAW:', list);

    return list
      .map((it: any) => {
        const name = this.itemName(it) ?? it?.itemName ?? it?.menuItemName;
        const qty = this.statsQty(it);
        const { unit, line } = this.itemMoney(it);
        const revenue =
          this.pos(
            it?.revenue,
            it?.totalRevenue,
            it?.totalSales,
            it?.sales,
            it?.totalAmount,
            it?.totalPrice,
          ) ||
          line ||
          unit * qty;

        return {
          name,
          qty,
          revenue,
          image: this.imageOf(it),
        } as TopItem;
      })
      .filter((i: TopItem) => !!i.name)
      .sort((a: TopItem, b: TopItem) => b.qty - a.qty)
      .slice(0, 5);
  }

  private pos(...values: any[]): number {
    for (const v of values) {
      const n = Number(typeof v === 'string' ? v.replace(/[^0-9.\-]/g, '') : v);
      if (isFinite(n) && n > 0) return n;
    }
    return 0;
  }

  private itemMoney(item: any): { unit: number; line: number } {
    const mi = item?.menuItem ?? item?.product ?? item?.item ?? {};

    let unit = this.pos(
      item?.unitPrice,
      item?.price,
      item?.itemPrice,
      item?.sellingPrice,
      item?.pricePerUnit,
      item?.priceAtOrder,
      item?.menuItemPrice,
      mi?.price,
      mi?.unitPrice,
      mi?.sellingPrice,
    );
    let line = this.pos(
      item?.lineTotal,
      item?.totalPrice,
      item?.subTotal,
      item?.subtotal,
      item?.total,
      item?.totalAmount,
      item?.amount,
    );

    if (!unit && !line && item && typeof item === 'object') {
      for (const [k, v] of Object.entries(item)) {
        if (/price|cost|amount|total/i.test(k) && this.pos(v)) {
          if (/total|amount/i.test(k)) line = this.pos(v);
          else unit = this.pos(v);
        }
      }
    }
    return { unit, line };
  }

  private buildTopItems(orders: any[]): TopItem[] {
    const map = new Map<string, TopItem>();

    for (const order of orders) {
      for (const item of this.extractItems(order)) {
        const name = this.itemName(item);
        if (!name) continue;

        const qty = Number(item?.quantity ?? item?.qty ?? item?.count ?? 1) || 1;
        const { unit, line } = this.itemMoney(item);

        if (!this.loggedItem) {
          this.loggedItem = true;
          console.log('TOP ITEM SAMPLE:', item, '-> unit:', unit, 'line:', line);
        }

        const entry = map.get(name) ?? {
          name,
          qty: 0,
          revenue: 0,
          image: this.imageOf(item),
        };
        if (!entry.image) entry.image = this.imageOf(item);

        entry.qty += qty;
        entry.revenue += unit > 0 ? qty * unit : line;
        map.set(name, entry);
      }
    }

    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  }

  orderId(order: any): string {
    return order?.id ?? order?.orderId ?? order?.orderNumber ?? '-';
  }

  orderTable(order: any): string {
    return order?.tableNumber ?? order?.tableName ?? order?.tableId ?? '-';
  }

  orderTotal(order: any): number {
    const direct = this.pos(
      order?.totalPrice,
      order?.totalAmount,
      order?.total,
      order?.grandTotal,
      order?.finalAmount,
      order?.finalPrice,
      order?.netTotal,
      order?.netAmount,
      order?.amount,
      order?.price,
      order?.subTotal,
      order?.subtotal,
      order?.orderTotal,
      order?.totalCost,
      order?.billAmount,
      order?.paidAmount,
    );
    if (direct) return direct;

    const sum = this.extractItems(order).reduce((acc: number, it: any) => {
      const qty = Number(it?.quantity ?? it?.qty ?? it?.count ?? 1) || 1;
      const { unit, line } = this.itemMoney(it);
      return acc + (unit > 0 ? qty * unit : line);
    }, 0);
    if (sum) return sum;

    if (order && typeof order === 'object') {
      for (const [k, v] of Object.entries(order)) {
        if (/total|amount|price|bill/i.test(k) && this.pos(v)) return this.pos(v);
      }
    }
    return 0;
  }

  orderItemCount(order: any): number {
    return this.extractItems(order).length;
  }

  statusKey(order: any): string {
    return String(order?.status ?? '')
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
