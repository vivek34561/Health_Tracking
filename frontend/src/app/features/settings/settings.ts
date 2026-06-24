import { Component, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../core/services/theme.service';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { getExpressUrl } from '../../core/config/api.config';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class SettingsComponent {
  readonly themeService = inject(ThemeService);
  readonly notificationService = inject(NotificationService);
  private readonly toastService = inject(ToastService);
  readonly authService = inject(AuthService);

  // Daily Goals (stored in localStorage)
  readonly goals = signal({
    water: 2500,
    sleep: 8,
    steps: 10000
  });

  // Notification toggles
  readonly notifToggles = signal({
    water:       true,
    sleep:       true,
    activity:    true,
    weekly:      true,
    achievements: true
  });

  readonly appVersion = '1.0.0';
  readonly backendStatus = signal<'checking' | 'online' | 'offline'>('checking');

  constructor() {
    this.loadGoals();
    this.loadNotifToggles();
    this.checkBackendStatus();
  }

  private loadGoals(): void {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('ht_settings_goals');
      if (saved) this.goals.set(JSON.parse(saved));
    } catch {}
  }

  private loadNotifToggles(): void {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('ht_settings_notif');
      if (saved) this.notifToggles.set(JSON.parse(saved));
    } catch {}
  }

  private checkBackendStatus(): void {
    this.backendStatus.set('checking');
    fetch(`${getExpressUrl()}/api/health`, { signal: AbortSignal.timeout(5000) })
      .then(r => this.backendStatus.set(r.ok ? 'online' : 'offline'))
      .catch(() => this.backendStatus.set('offline'));
  }

  setTheme(mode: 'light' | 'dark' | 'system'): void {
    this.themeService.setTheme(mode);
    this.toastService.success(`Theme set to ${mode}.`);
  }

  updateGoal(field: keyof ReturnType<typeof this.goals>, value: number): void {
    this.goals.update(g => ({ ...g, [field]: value }));
  }

  saveGoals(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ht_settings_goals', JSON.stringify(this.goals()));
    }
    this.toastService.success('Daily goals saved!');
  }

  toggleNotif(key: keyof ReturnType<typeof this.notifToggles>): void {
    this.notifToggles.update(t => ({ ...t, [key]: !t[key] }));
    if (typeof window !== 'undefined') {
      localStorage.setItem('ht_settings_notif', JSON.stringify(this.notifToggles()));
    }
  }

  exportData(): void {
    const data = {
      exportedAt: new Date().toISOString(),
      notifications: this.notificationService.notifications(),
      goals: this.goals(),
      settings: this.notifToggles()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `healthai-export-${new Date().toISOString().substring(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.toastService.success('Data exported successfully!');
  }

  recheckStatus(): void {
    this.checkBackendStatus();
  }
}
