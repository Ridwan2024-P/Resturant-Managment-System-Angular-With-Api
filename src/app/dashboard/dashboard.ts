import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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

        const orders = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.orders)
              ? data.orders
              : [];

        const today = new Date();

        const todayDate = today.toISOString().split('T')[0];

        this.todayOrders = orders.filter((order: any) => {
          const orderDate =
            order?.createdAt ?? order?.orderDate ?? order?.date ?? order?.createdDate;

          if (!orderDate) {
            return false;
          }

          return new Date(orderDate).toISOString().split('T')[0] === todayDate;
        }).length;

        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('ORDER API ERROR:', error);
      },
    });
  }

  selectNav(id: string): void {
    this.activeView = id;
  }

  logout(): void {
    localStorage.clear();

    this.router.navigate(['/login']);
  }
}
