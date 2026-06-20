import { Component, signal, computed, inject } from '@angular/core';
import { NotificationService, AppNotification } from '../../core/services/notification.service';

type FilterTab = 'all' | 'reminder' | 'achievement' | 'alert' | 'info';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css'
})
export class NotificationsComponent {
  readonly notificationService = inject(NotificationService);

  readonly activeTab = signal<FilterTab>('all');

  readonly filteredNotifications = computed(() => {
    const tab = this.activeTab();
    const all = this.notificationService.notifications();
    if (tab === 'all') return all;
    return all.filter(n => n.type === tab);
  });

  readonly unreadInTab = computed(() =>
    this.filteredNotifications().filter(n => !n.read).length
  );

  readonly tabs: { id: FilterTab; label: string; icon: string }[] = [
    { id: 'all',         label: 'All',          icon: '🔔' },
    { id: 'reminder',   label: 'Reminders',    icon: '⏰' },
    { id: 'achievement',label: 'Achievements',  icon: '🏆' },
    { id: 'alert',      label: 'Alerts',        icon: '⚠️' },
    { id: 'info',       label: 'Info',          icon: 'ℹ️' }
  ];

  setTab(tab: FilterTab): void {
    this.activeTab.set(tab);
  }

  markRead(n: AppNotification): void {
    if (!n.read) {
      this.notificationService.markAsRead(n.id);
    }
  }

  markAllRead(): void {
    this.notificationService.markAllAsRead();
  }

  deleteNotification(id: string, event: Event): void {
    event.stopPropagation();
    this.notificationService.deleteNotification(id);
  }

  clearAll(): void {
    this.notificationService.clearAll();
  }

  getTypeColor(type: string): string {
    const colors: Record<string, string> = {
      reminder:    'var(--color-info)',
      achievement: 'var(--color-warning)',
      alert:       'var(--color-danger)',
      info:        'var(--color-primary)'
    };
    return colors[type] || 'var(--color-primary)';
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      reminder:    'Reminder',
      achievement: 'Achievement',
      alert:       'Alert',
      info:        'Info'
    };
    return labels[type] || type;
  }

  getRelativeTime(isoDate: string): string {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }
}
