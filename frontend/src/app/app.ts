import { Component, inject, signal, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { NotificationService } from './core/services/notification.service';
import { ToastComponent } from './shared/components/toast/toast';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  readonly authService = inject(AuthService);
  readonly themeService = inject(ThemeService);
  readonly notificationService = inject(NotificationService);

  readonly sidebarCollapsed = signal(false);

  readonly unreadCount = computed(() => this.notificationService.getUnreadCount());

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  getUserInitials(): string {
    const name = this.authService.currentUser()?.name || 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0]?.toUpperCase() || 'U';
  }
}
