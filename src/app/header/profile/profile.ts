import { Component, OnInit, inject } from '@angular/core';
import { AdminHeaderService } from '../../services/admin-header.service';

interface Detail {
  label: string;
  value: string;
  icon: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  private adminHeaderService = inject(AdminHeaderService);
  hasUser = false;
  userName = 'User';
  avatarUrl = '';
  imageFailed = false;
  details: Detail[] = [];
  ngOnInit(): void {
    this.loadUserFromService();
    this.loadProfile();
  }
  get initials(): string {
    return this.adminHeaderService.getInitials();
  }
  private loadUserFromService(): void {
    const user = this.adminHeaderService.getUser();
    if (!user) {
      return;
    }
    this.setUserData();
  }
  private loadProfile(): void {
    this.adminHeaderService.getProfile().subscribe({
      next: (user) => {
        this.hasUser = true;

        this.userName = user.fullName;

        this.avatarUrl = user.image ?? '';

        this.details = this.adminHeaderService.getProfileDetails();

        this.imageFailed = false;
      },

      error: (error) => {
        console.error('PROFILE API ERROR:', error);

        this.hasUser = false;
      },
    });
  }

  private setUserData(): void {
    this.hasUser = true;
    this.userName = this.adminHeaderService.getUserName();
    this.avatarUrl = this.adminHeaderService.getAvatarUrl();
    this.details = this.adminHeaderService.getProfileDetails();
    this.imageFailed = false;
  }
}
