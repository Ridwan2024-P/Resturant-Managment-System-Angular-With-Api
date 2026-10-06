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
} from '@ng-icons/lucide';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  adminOnly: boolean;
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
    this.navSelected.emit(id);
  }

}
