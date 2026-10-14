import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';

import { DashboardService, SalesRevenue } from '../services/dashboard.service';

interface Bar {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  label: string;
  value: number;
}

interface Tick {
  y: number;
  label: string;
}

interface Group {
  label: string;
  x: number;
  width: number;
  shaded: boolean;
}

interface DonutSlice {
  label: string;
  value: number;
  color: string;
  dash: string;
  offset: number;
  percent: number;
}

const COLORS = { sales: '#66bb6a', expenses: '#e91e63', revenue: '#26a69a' };

const W = 900;
const H = 380;
const M = { left: 74, right: 16, top: 16, bottom: 42 };

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, HlmSidebarImports, Sidebar, Header],
  templateUrl: './report.html',
  styleUrl: './report.css',
})
export class Reports implements OnInit {
  private readonly service = inject(DashboardService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly colors = COLORS;
  readonly chartW = W;
  readonly chartH = H;
  readonly plotLeft = M.left;
  readonly plotRight = W - M.right;
  readonly plotTop = M.top;
  readonly plotBottom = H - M.bottom;

  readonly months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  years: number[] = [];

  month = new Date().getMonth() + 1;
  year = new Date().getFullYear();

  loading = true;
  errorMessage = '';

  data: SalesRevenue = this.emptyData();

  bars: Bar[] = [];
  ticks: Tick[] = [];
  groups: Group[] = [];
  zeroY = 0;
  slices: DonutSlice[] = [];

  readonly donutR = 100;
  readonly donutC = 2 * Math.PI * this.donutR;

  ngOnInit(): void {
    const current = new Date().getFullYear();
    this.years = Array.from({ length: 6 }, (_, i) => current - i);
    this.load();
  }

  private emptyData(): SalesRevenue {
    return {
      todaysSales: 0,
      monthlySales: 0,
      yearlySales: 0,
      totalSales: 0,
      todaysSalesAmount: 0,
      monthlySalesAmount: 0,
      yearlySalesAmount: 0,
      totalSalesAmount: 0,
      todaysExpenses: 0,
      monthlyExpenses: 0,
      yearlyExpenses: 0,
      totalExpenses: 0,
      todaysRevenue: 0,
      monthlyRevenue: 0,
      yearlyRevenue: 0,
      totalRevenue: 0,
    };
  }

  private num(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';

    this.service.getDashboardStats(Number(this.month), Number(this.year)).subscribe({
      next: (stats) => {
        const s: any = stats?.salesRevenue ?? {};
        const clean = this.emptyData() as any;
        for (const key of Object.keys(clean)) clean[key] = this.num(s[key]);

        this.data = clean;
        this.buildBarChart();
        this.buildDonut();

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        console.error('REPORT STATS ERROR:', error);
        this.errorMessage =
          error.status === 401
            ? 'Unauthorized. Please log in again.'
            : 'Could not load report data. Please try again.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private niceStep(range: number): number {
    const raw = range / 5;
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / pow;
    const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
    return nice * pow;
  }

  private buildBarChart(): void {
    const d = this.data;

    const sets = [
      {
        label: 'Today',
        sales: d.todaysSalesAmount,
        expenses: d.todaysExpenses,
        revenue: d.todaysRevenue,
      },
      {
        label: 'Monthly',
        sales: d.monthlySalesAmount,
        expenses: d.monthlyExpenses,
        revenue: d.monthlyRevenue,
      },
      {
        label: 'Yearly',
        sales: d.yearlySalesAmount,
        expenses: d.yearlyExpenses,
        revenue: d.yearlyRevenue,
      },
    ];

    const values = sets.flatMap((s) => [s.sales, s.expenses, s.revenue]);
    const rawMax = Math.max(0, ...values);
    const rawMin = Math.min(0, ...values);
    const step = this.niceStep(Math.max(rawMax - rawMin, 1));

    const max = Math.ceil(rawMax / step) * step || step;
    const min = Math.floor(rawMin / step) * step;

    const plotH = this.plotBottom - this.plotTop;
    const yOf = (v: number) => this.plotTop + ((max - v) / (max - min)) * plotH;

    this.zeroY = yOf(0);

    this.ticks = [];
    for (let v = min; v <= max + step / 2; v += step) {
      this.ticks.push({ y: yOf(v), label: Math.round(v).toLocaleString('en-US') });
    }

    const plotW = this.plotRight - this.plotLeft;
    const groupW = plotW / sets.length;
    const barW = Math.min(groupW * 0.26, 72);
    const gap = barW * 0.12;
    const total = barW * 3 + gap * 2;

    this.groups = [];
    this.bars = [];

    sets.forEach((set, gi) => {
      const gx = this.plotLeft + gi * groupW;
      this.groups.push({ label: set.label, x: gx, width: groupW, shaded: gi % 2 === 0 });

      const start = gx + (groupW - total) / 2;
      const items: [string, number, string][] = [
        ['Sales', set.sales, COLORS.sales],
        ['Expenses', set.expenses, COLORS.expenses],
        ['Revenue', set.revenue, COLORS.revenue],
      ];

      items.forEach(([label, value, color], bi) => {
        const y = yOf(value);
        this.bars.push({
          x: start + bi * (barW + gap),
          y: Math.min(y, this.zeroY),
          w: barW,
          h: Math.max(Math.abs(y - this.zeroY), value !== 0 ? 1 : 0),
          color,
          label: `${set.label} ${label}: ৳${Math.round(value).toLocaleString('en-US')}`,
          value,
        });
      });
    });
  }

  private buildDonut(): void {
    const sales = Math.max(this.data.totalSalesAmount, 0);
    const expenses = Math.max(this.data.totalExpenses, 0);
    const total = sales + expenses;

    this.slices = [];
    if (total <= 0) return;

    let offset = 0;
    for (const [label, value, color] of [
      ['Total Sales', sales, COLORS.sales],
      ['Total Expenses', expenses, COLORS.expenses],
    ] as [string, number, string][]) {
      const len = (value / total) * this.donutC;
      this.slices.push({
        label,
        value,
        color,
        dash: `${len} ${this.donutC - len}`,
        offset: -offset,
        percent: Math.round((value / total) * 1000) / 10,
      });
      offset += len;
    }
  }

  onPeriodChange(): void {
    this.load();
  }

  selectNav(_id: string): void {}
}
