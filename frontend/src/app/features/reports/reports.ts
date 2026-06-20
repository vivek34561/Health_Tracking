import { Component, OnInit, signal, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ReportsService, WeeklyReport, MonthlyReport, ProgressReport } from '../../core/services/reports.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  templateUrl: './reports.html',
  styleUrl: './reports.css'
})
export class ReportsComponent implements OnInit {
  private readonly reportsService = inject(ReportsService);

  readonly activeTab = signal<'weekly' | 'monthly' | 'progress'>('weekly');
  readonly isLoading = signal(true);
  readonly weeklyReport = signal<WeeklyReport | null>(null);
  readonly monthlyReport = signal<MonthlyReport | null>(null);
  readonly progressReport = signal<ProgressReport | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadWeekly();
  }

  setTab(tab: 'weekly' | 'monthly' | 'progress'): void {
    this.activeTab.set(tab);
    if (tab === 'weekly' && !this.weeklyReport()) this.loadWeekly();
    if (tab === 'monthly' && !this.monthlyReport()) this.loadMonthly();
    if (tab === 'progress' && !this.progressReport()) this.loadProgress();
  }

  private loadWeekly(): void {
    this.isLoading.set(true);
    this.reportsService.getWeeklyReport().subscribe({
      next: (data) => { this.weeklyReport.set(data); this.isLoading.set(false); },
      error: () => { this.error.set('Unable to load weekly report.'); this.isLoading.set(false); }
    });
  }

  private loadMonthly(): void {
    this.isLoading.set(true);
    this.reportsService.getMonthlyReport().subscribe({
      next: (data) => { this.monthlyReport.set(data); this.isLoading.set(false); },
      error: () => { this.error.set('Unable to load monthly report.'); this.isLoading.set(false); }
    });
  }

  private loadProgress(): void {
    this.isLoading.set(true);
    this.reportsService.getProgressReport().subscribe({
      next: (data) => { this.progressReport.set(data); this.isLoading.set(false); },
      error: () => { this.error.set('Unable to load progress report.'); this.isLoading.set(false); }
    });
  }

  printReport(): void {
    window.print();
  }

  getScoreColor(score: number): string {
    if (score >= 80) return 'var(--color-success)';
    if (score >= 60) return 'var(--color-warning)';
    return 'var(--color-danger)';
  }

  getScoreLabel(score: number): string {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Needs Improvement';
    return 'Critical';
  }
}
