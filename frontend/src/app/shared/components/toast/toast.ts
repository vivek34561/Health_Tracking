import { Component, inject } from '@angular/core';
import { ToastService, Toast } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [],
  templateUrl: './toast.html',
  styleUrl: './toast.css'
})
export class ToastComponent {
  readonly toastService = inject(ToastService);

  getIcon(type: Toast['type']): string {
    const icons: Record<Toast['type'], string> = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type];
  }

  dismiss(id: string): void {
    this.toastService.remove(id);
  }

  trackById(_: number, toast: Toast): string {
    return toast.id;
  }
}
