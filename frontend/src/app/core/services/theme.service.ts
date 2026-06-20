import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  /** Current theme: 'light' | 'dark' | 'system' */
  readonly theme = signal<'light' | 'dark' | 'system'>('system');
  readonly isDark = signal(false);

  constructor() {
    this.loadSavedTheme();
    effect(() => {
      this.applyTheme(this.theme());
    });
  }

  private loadSavedTheme(): void {
    if (typeof window === 'undefined') return;
    const saved = (localStorage.getItem('ht_theme') as 'light' | 'dark' | 'system') || 'system';
    this.theme.set(saved);
    this.applyTheme(saved);
  }

  setTheme(mode: 'light' | 'dark' | 'system'): void {
    this.theme.set(mode);
    localStorage.setItem('ht_theme', mode);
    this.applyTheme(mode);
  }

  toggleDark(): void {
    const next = this.isDark() ? 'light' : 'dark';
    this.setTheme(next);
  }

  private applyTheme(mode: 'light' | 'dark' | 'system'): void {
    if (typeof window === 'undefined') return;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = mode === 'dark' || (mode === 'system' && prefersDark);
    const html = document.documentElement;
    if (shouldBeDark) {
      html.setAttribute('data-theme', 'dark');
    } else {
      html.removeAttribute('data-theme');
    }
    this.isDark.set(shouldBeDark);
  }
}
