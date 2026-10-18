import { Component, EventEmitter, Output, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSidebarImports, HlmSidebarService } from '@spartan-ng/helm/sidebar';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { ChangeDetectorRef } from '@angular/core';
import {
  lucidePanelsTopLeft,
  lucideAppWindow,
  lucideDatabase,
  lucideSlidersHorizontal,
  lucideGlobe,
  lucideHeart,
  lucideSettings,
  lucideClipboardList,
  lucideTable2,
  lucideLayers3,
  lucideChevronRight,
  lucideHeadphones,
  lucideShoppingCart,
  lucideUsers,
  lucideUtensils,
} from '@ng-icons/lucide';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  adminOnly: boolean;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, HlmButtonImports, HlmSidebarImports, NgIcon],
  providers: [
    provideIcons({
      lucidePanelsTopLeft,
      lucideAppWindow,
      lucideDatabase,
      lucideSlidersHorizontal,
      lucideGlobe,
      lucideHeart,
      lucideSettings,
      lucideClipboardList,
      lucideTable2,
      lucideLayers3,
      lucideChevronRight,
      lucideHeadphones,
      lucideShoppingCart,
      lucideUsers,
      lucideUtensils,
    }),
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  host: { '[class.no-anim]': '!ready', '[class.is-mobile]': 'isMobile()' },
})
export class Sidebar {
  @Output()
  navSelected = new EventEmitter<string>();

  // Each page creates its own sidebar. Without this, the sidebar animates from
  // expanded to collapsed on every route change. Transitions stay off for the
  // first frames, then are enabled so the toggle button still animates.
  ready = false;

  /** True for a moment after the user opens/closes the sidebar (drives the premium animation). */
  animating = signal(false);

  private readonly sidebarService = inject(HlmSidebarService);

  /** True on phones, where the sidebar opens as a slide-over sheet. */
  readonly isMobile = this.sidebarService.isMobile;
  private lastState: string | null = null;
  private animTimer: ReturnType<typeof setTimeout> | null = null;

  activeView = 'POS';

  allNavItems: NavItem[] = [
    {
      id: 'POS',
      label: 'Dashboard',
      icon: 'lucidePanelsTopLeft',
      adminOnly: false,
      route: '/dashboard',
    },
    {
      id: 'EMPLOYEE',
      label: 'Employee',
      icon: 'lucideUsers',
      adminOnly: false,
      route: '/employee',
    },
    {
      id: 'Table',
      label: 'Table',
      icon: 'lucideTable2',
      route: '/tables',
      adminOnly: false,
    },
    {
      id: 'FOOD',
      label: 'Food',
      icon: 'lucideUtensils',
      route: '/food',
      adminOnly: false,
    },
    {
      id: 'NEW_ORDER',
      label: 'New Order',
      icon: 'lucideShoppingCart',
      route: '/new-order',
      adminOnly: false,
    },
    {
      id: 'ORDERS',
      label: 'Orders',
      icon: 'lucideClipboardList',
      route: '/order',
      adminOnly: false,
    },
    {
      id: 'EXPENSES',
      label: 'Expenses',
      icon: 'lucideDatabase',
      route: '/expense',
      adminOnly: false,
    },
    {
      id: 'REPORT_ANALYSIS',
      label: 'Report',
      icon: 'lucideClipboardList',
      route: '/report',
      adminOnly: false,
    },
  ];

  visibleNavItems: NavItem[] = [];

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    const role = localStorage.getItem('role');

    this.visibleNavItems = this.allNavItems.filter((item) => {
      if (item.adminOnly) {
        return role === 'admin';
      }
      return true;
    });
    effect(() => {
      const state = this.sidebarService.state();

      if (this.lastState !== null && this.lastState !== state && this.ready) {
        this.animating.set(true);

        if (this.animTimer) {
          clearTimeout(this.animTimer);
        }

        this.animTimer = setTimeout(() => this.animating.set(false), 1200);
      }

      this.lastState = state;
    });

    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        this.ready = true;
        this.cdr.markForCheck();
      }),
    );

    this.updateActiveView(this.router.url);
    this.router.events.subscribe(() => {
      this.updateActiveView(this.router.url);
    });
  }

  private updateActiveView(url: string): void {
    const currentUrl = url.split('?')[0].split('#')[0];
    const activeItem = this.visibleNavItems.find((item) => item.route === currentUrl);
    if (activeItem) {
      this.activeView = activeItem.id;
    }
    this.cdr.markForCheck();
  }
  closeMobile(): void {
    this.sidebarService.setOpenMobile(false);
  }

  selectNav(id: string): void {
    const selectedItem = this.visibleNavItems.find((item) => item.id === id);

    if (!selectedItem) {
      return;
    }

    this.activeView = id;
    this.cdr.detectChanges();
    this.navSelected.emit(id);

    if (this.sidebarService.isMobile()) {
      this.closeMobile();
    }

    if (this.router.url !== selectedItem.route) {
      void this.router.navigateByUrl(selectedItem.route);
    }
  }
}