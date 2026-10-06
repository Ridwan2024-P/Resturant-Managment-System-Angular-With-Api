import { Component, ElementRef, HostListener, OnInit, inject } from '@angular/core';

import { Router } from '@angular/router';

import { AdminHeaderService } from '../services/admin-header.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit {
  private router = inject(Router);
  private host = inject(ElementRef<HTMLElement>);
  private adminHeaderService = inject(AdminHeaderService);
  menuOpen = false;
  userName = '';
  avatarUrl = '';
  imageFailed = false;
  ngOnInit(): void {
    this.loadUser();
  }
  get initials(): string {
    return this.adminHeaderService.getInitials();
  }
 private loadUser(): void {

  const user =
    this.adminHeaderService.getUser();

  if (!user) {

    this.userName = 'User';
    this.avatarUrl = '';

    return;
  }

  this.userName = user.fullName;

  this.avatarUrl =
    user.image ?? '';

  this.imageFailed = false;
}

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const wrap = this.host.nativeElement.querySelector('.profile-wrap');
    if (wrap && !wrap.contains(event.target as Node)) {
      this.menuOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.menuOpen = false;
  }

  go(path: string): void {
    this.menuOpen = false;
    this.router.navigate([path]);
  }

  logout(): void {
    this.adminHeaderService.clearUser();
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
