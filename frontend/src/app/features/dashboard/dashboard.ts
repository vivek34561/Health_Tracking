import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService, DashboardSummary } from '../../core/services/dashboard.service';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);

  readonly dashboardData = signal<DashboardSummary | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.fetchDashboardSummary();
  }

  /**
   * Fetch user dashboard summary metrics from the backend
   */
  fetchDashboardSummary(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.dashboardService.getDashboardSummary().subscribe({
      next: (data) => {
        this.dashboardData.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || 'Failed to fetch dashboard summary.');
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Format the weight change to display with sign and unit
   */
  getWeightChangeText(change: number | null | undefined): string {
    if (change === null || change === undefined) return '—';
    if (change === 0) return '0.0 kg';
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)} kg`;
  }
}
