import { Injectable, signal } from '@angular/core';

export interface AppNotification {
  id: string;
  type: 'reminder' | 'achievement' | 'alert' | 'info';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  icon?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly STORAGE_KEY = 'ht_notifications';

  readonly notifications = signal<AppNotification[]>([]);

  constructor() {
    this.load();
    this.seedDefaultNotifications();
  }

  private load(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        this.notifications.set(JSON.parse(raw));
      }
    } catch {
      this.notifications.set([]);
    }
  }

  private save(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.notifications()));
  }

  private seedDefaultNotifications(): void {
    if (this.notifications().length > 0) return;
    const defaults: AppNotification[] = [
      {
        id: 'n1',
        type: 'reminder',
        title: 'Hydration Reminder',
        message: 'You haven\'t logged water today. Stay hydrated — aim for 8 glasses!',
        read: false,
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        icon: '💧'
      },
      {
        id: 'n2',
        type: 'achievement',
        title: 'Streak Achievement!',
        message: 'Congrats! You\'ve logged your health data for 7 days in a row.',
        read: false,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        icon: '🏆'
      },
      {
        id: 'n3',
        type: 'alert',
        title: 'Sleep Goal Alert',
        message: 'Your average sleep this week is 6.2 hours — below the 7-hour target.',
        read: true,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        icon: '🌙'
      },
      {
        id: 'n4',
        type: 'info',
        title: 'Weekly Report Ready',
        message: 'Your weekly health summary is ready. Check your progress in Reports.',
        read: true,
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        icon: '📊'
      }
    ];
    this.notifications.set(defaults);
    this.save();
  }

  getUnreadCount(): number {
    return this.notifications().filter(n => !n.read).length;
  }

  markAsRead(id: string): void {
    this.notifications.update(list =>
      list.map(n => n.id === id ? { ...n, read: true } : n)
    );
    this.save();
  }

  markAllAsRead(): void {
    this.notifications.update(list => list.map(n => ({ ...n, read: true })));
    this.save();
  }

  clearAll(): void {
    this.notifications.set([]);
    this.save();
  }

  addNotification(notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>): void {
    const newNotif: AppNotification = {
      ...notification,
      id: Date.now().toString(36),
      createdAt: new Date().toISOString(),
      read: false
    };
    this.notifications.update(list => [newNotif, ...list]);
    this.save();
  }

  deleteNotification(id: string): void {
    this.notifications.update(list => list.filter(n => n.id !== id));
    this.save();
  }
}
