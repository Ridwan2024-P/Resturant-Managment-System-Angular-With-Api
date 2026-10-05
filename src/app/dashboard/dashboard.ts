import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
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
