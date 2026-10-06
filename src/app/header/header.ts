import { Component, ElementRef, HostListener, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
const IMAGE_BASE: string = '';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit {
  private router = inject(Router);
  private host = inject(ElementRef<HTMLElement>);

  menuOpen = false;

  userName = 'User';
  userRole = '';
  avatarUrl = '';
  imageFailed = false;
 

 
  ngOnInit(): void {
    this.loadUser();
  }

  get initials(): string {
    return (
      this.userName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() || 'U'
    );
  }

  private loadUser(): void {
    let user: any = null;

    try {
      const raw = localStorage.getItem('user');
      user = raw ? JSON.parse(raw) : null;
    } catch {
      user = null;
    }

    if (!user) return;

    const fullFromParts = [user.firstName, user.lastName].filter(Boolean).join(' ');
    this.userName =
      user.fullName ?? user.name ?? (fullFromParts || (user.userName ?? user.email ?? 'User'));

    const role = localStorage.getItem('role') ?? user.role ?? user.Role ?? '';
    this.userRole = role ? role.charAt(0).toUpperCase() + role.slice(1) : '';

    const image =
      user.image ??
      user.imageUrl ??
      user.profileImage ??
      user.profilePicture ??
      user.photo ??
      user.photoUrl ??
      user.avatar ??
      '';

    this.avatarUrl = this.resolveImage(image);
    this.imageFailed = false;
  }

  private resolveImage(path: string): string {
    if (!path) return '';
    if (/^(https?:|data:|blob:)/i.test(path) || !IMAGE_BASE) return path;
    return `${IMAGE_BASE.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
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
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
