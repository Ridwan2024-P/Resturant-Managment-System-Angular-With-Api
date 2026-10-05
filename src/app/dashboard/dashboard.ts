import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { lucideHouse, lucideInbox, lucideSettings } from '@ng-icons/lucide';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { ChangeDetectorRef } from '@angular/core';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { lucideMoveRight } from '@ng-icons/lucide';
import { lucideMenu } from '@ng-icons/lucide';
@Component({
  selector: 'app-dashboard',

  imports: [
    CommonModule,
    FormsModule,
    HlmSidebarImports,
    HlmButtonImports,
    HlmCardImports,
    HlmTableImports,
    HlmAlertImports,
    Sidebar,
    NgIcon,
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
export class Dashboard {
  activeView = 'POS';
  loading = true;

  customerName = '';

  customerPhone = '';

  customerEmail = '';
  errorMessage = '';

  successMessage = '';

  orderType: 'dine-in' | 'parcel' = 'dine-in';

  isSidebarOpen = true;

  tabs = ['Monthly', 'Weekly', 'Today'];
  orderTab = 'Monthly';
  mapTab = 'Monthly';

  periodOpen = false;
  period = 'Monthly';
  periods = [
    { label: 'Month', value: 'Monthly' },
    { label: 'Day', value: 'Daily' },
    { label: 'Week', value: 'Weekly' },
    { label: 'Year', value: 'Yearly' },
  ];
  foodFilters = ['All Food', 'Food', 'Beverages'];
  foodFilter = 'All Food';

  readonly chartW = 760;
  readonly chartH = 340;
  readonly padL = 45;
  readonly padR = 15;
  private readonly padT = 15;
  private readonly padB = 35;
  private readonly months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  private readonly revenueData = [50, 75, 33, 55, 25, 70, 50, 80, 60, 90, 44, 65];

  private yOf(v: number): number {
    return this.padT + ((100 - v) / 80) * (this.chartH - this.padT - this.padB);
  }
  private xOf(i: number): number {
    return this.padL + i * ((this.chartW - this.padL - this.padR) / (this.months.length - 1));
  }

  yTicks = [20, 40, 60, 80, 100].map((v) => ({ v, y: this.yOf(v) }));
  xLabels = this.months.map((t, i) => ({ t, x: this.xOf(i) }));
  linePath = this.smooth(this.revenueData.map((v, i) => ({ x: this.xOf(i), y: this.yOf(v) })));
  areaPath =
    this.linePath +
    ` L${this.xOf(this.months.length - 1)},${this.yOf(20)} L${this.xOf(0)},${this.yOf(20)} Z`;

  private smooth(p: { x: number; y: number }[]): string {
    let d = `M${p[0].x},${p[0].y}`;
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i - 1] ?? p[i],
        p1 = p[i],
        p2 = p[i + 1],
        p3 = p[i + 2] ?? p2;
      d +=
        ` C${p1.x + (p2.x - p0.x) / 6},${p1.y + (p2.y - p0.y) / 6}` +
        ` ${p2.x - (p3.x - p1.x) / 6},${p2.y - (p3.y - p1.y) / 6} ${p2.x},${p2.y}`;
    }
    return d;
  }

  selectPeriod(value: string): void {
    this.period = value;
    this.periodOpen = false;
  }


  mapTicks = [100, 50, 0, -50, -100];
  customerBars = [
    [70, 60],
    [20, 10],
    [75, 50],
    [20, 25],
    [50, 30],
    [40, 65],
    [65, 22],
    [15, 10],
    [40, 50],
    [55, 20],
    [60, 70],
    [20, 35],
    [75, 60],
    [40, 20],
    [25, 30],
    [70, 45],
    [20, 70],
    [40, 50],
    [65, 45],
    [50, 10],
    [35, 20],
    [70, 55],
    [45, 25],
    [40, 45],
    [35, 35],
    [55, 15],
    [60, 40],
  ].map(([pos, neg], i) => ({ day: String(i + 1).padStart(2, '0'), pos, neg }));


  avgBars = [18, 40, 62, 38, 26, 30, 38, 45, 70, 95, 100, 65, 42];


  trending = [
    { rank: 1, name: 'Medium Spicy Spagethi Italiano', price: '$5.6', orders: '89x' },
    { rank: 2, name: 'Watermelon juice with ice', price: '$5.6', orders: '89x' },
    { rank: 3, name: 'Chicken curry special with cucumber', price: '$5.6', orders: '89x' },
    { rank: 4, name: 'Italiano Pizza With Garlic', price: '$5.6', orders: '89x' },
    { rank: 5, name: 'Tuna Soup spinach with himalaya salt', price: '$5.6', orders: '89x' },
  ];

  constructor(
    private router: Router,

    private cdr: ChangeDetectorRef,
  ) {}
  selectNav(id: string): void {
    this.activeView = id;
  }

  logout(): void {
    localStorage.clear();

    this.router.navigate(['/login']);
  }
}
