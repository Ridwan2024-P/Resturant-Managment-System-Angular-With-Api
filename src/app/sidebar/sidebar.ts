import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { NgIcon, provideIcons } from '@ng-icons/core';
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
  route:string;
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
})
export class Sidebar {
  @Output()
  navSelected = new EventEmitter<string>();

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
      route: '/dashboard',
      adminOnly: false,
    },
    {
      id: 'FOOD',
      label: 'Food',
      icon: 'lucideUtensils',
      route: '/dashboard',
      adminOnly: false,
    },
    {
      id: 'NEW_ORDER',
      label: 'New Order',
      icon: 'lucideShoppingCart',
      route: '/dashboard',
      adminOnly: false,
    },
    {
      id: 'ORDERS',
      label: 'Orders',
      icon: 'lucideClipboardList',
      route: '/dashboard',
      adminOnly: false,
    },
    {
      id: 'EXPENSES',
      label: 'Expenses',
      icon: 'lucideDatabase',
      route: '/dashboard',
      adminOnly: false,
    },
    {
      id: 'REPORT_ANALYSIS',
      label: 'Report',
      icon: 'lucideClipboardList',
      route: '/dashboard',
      adminOnly: false,
    },
  ];

  visibleNavItems: NavItem[] = [];

  constructor(private router: Router) {
    const role = localStorage.getItem('role');

    this.visibleNavItems = this.allNavItems.filter((item) => {
      if (item.adminOnly) {
        return role === 'admin';
      }

      return true;
    });
  }

  selectNav(id: string): void {
  this.activeView = id;

  const selectedItem = this.visibleNavItems.find(
    (item) => item.id === id
  );

  if (selectedItem) {
    this.navSelected.emit(id);
    this.router.navigate([selectedItem.route]);
  }
}
}