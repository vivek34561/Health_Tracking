import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  removing?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  readonly toasts = signal<Toast[]>([]);

  success(title: string, message?: string, duration = 4000): void {
    this.show({ type: 'success', title, message, duration });
  }

  error(title: string, message?: string, duration = 5000): void {
    this.show({ type: 'error', title, message, duration });
  }

  warning(title: string, message?: string, duration = 4500): void {
    this.show({ type: 'warning', title, message, duration });
  }

  info(title: string, message?: string, duration = 4000): void {
    this.show({ type: 'info', title, message, duration });
  }

  private show(toast: Omit<Toast, 'id'>): void {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const newToast: Toast = { ...toast, id };
    this.toasts.update(list => [...list, newToast]);
    if (toast.duration !== 0) {
      setTimeout(() => this.remove(id), toast.duration ?? 4000);
    }
  }

  remove(id: string): void {
    // Mark as removing for animation
    this.toasts.update(list =>
      list.map(t => t.id === id ? { ...t, removing: true } : t)
    );
    setTimeout(() => {
      this.toasts.update(list => list.filter(t => t.id !== id));
    }, 300);
  }
}
