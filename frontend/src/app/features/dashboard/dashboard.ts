import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, signal, computed, inject } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService, DashboardSummary } from '../../core/services/dashboard.service';
import { WeightService } from '../../core/services/weight.service';
import { WaterService } from '../../core/services/water.service';
import { SleepService } from '../../core/services/sleep.service';
import { ActivityService } from '../../core/services/activity.service';
import { GoalService } from '../../core/services/goal.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DecimalPipe, DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly authService = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private readonly weightService = inject(WeightService);
  private readonly waterService = inject(WaterService);
  private readonly sleepService = inject(SleepService);
  private readonly activityService = inject(ActivityService);
  private readonly goalService = inject(GoalService);

  @ViewChild('weightChartCanvas') weightChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('waterChartCanvas') waterChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('sleepChartCanvas') sleepChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('activityChartCanvas') activityChartCanvas!: ElementRef<HTMLCanvasElement>;

  readonly isLoading = signal(true);
  readonly summary = signal<DashboardSummary | null>(null);
  readonly weights = signal<any[]>([]);
  readonly waterLogs = signal<any[]>([]);
  readonly sleepLogs = signal<any[]>([]);
  readonly activityLogs = signal<any[]>([]);
  readonly goals = signal<any[]>([]);
  readonly today = new Date();

  private charts: Chart[] = [];
  private chartsInitialized = false;

  readonly bmi = computed(() => {
    const user = this.authService.currentUser();
    const weightLogs = this.weights();
    if (!user?.height || weightLogs.length === 0) return null;
    const latestWeight = parseFloat(weightLogs[0]?.weight ?? '0');
    const heightM = user.height / 100;
    return latestWeight / (heightM * heightM);
  });

  readonly bmiCategory = computed(() => {
    const bmi = this.bmi();
    if (!bmi) return null;
    if (bmi < 18.5) return { label: 'Underweight', color: 'var(--color-info)' };
    if (bmi < 25) return { label: 'Normal', color: 'var(--color-success)' };
    if (bmi < 30) return { label: 'Overweight', color: 'var(--color-warning)' };
    return { label: 'Obese', color: 'var(--color-danger)' };
  });

  readonly waterPercent = computed(() => {
    const s = this.summary();
    if (!s) return 0;
    const today = Number(s.waterToday) || 0;
    const goal = Number(s.waterGoal) || 2500;
    if (goal === 0) return 0;
    return Math.min(100, Math.round((today / goal) * 100));
  });

  readonly activeGoals = computed(() =>
    this.goals().filter(g => g.status === 'ACTIVE').slice(0, 3)
  );

  readonly recentActivities = computed(() =>
    this.activityLogs().slice(0, 4)
  );

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    // Charts will be initialized after data loads
  }

  private loadData(): void {
    this.isLoading.set(true);
    let loaded = 0;
    const total = 5;
    const done = () => {
      loaded++;
      if (loaded >= total) {
        this.isLoading.set(false);
        setTimeout(() => this.initCharts(), 100);
      }
    };

    this.dashboardService.getSummary().subscribe({
      next: (data) => { this.summary.set(data); done(); },
      error: () => done()
    });

    this.weightService.getWeightHistory().subscribe({
      next: (data) => { this.weights.set(data); done(); },
      error: () => done()
    });

    this.waterService.getWaterHistory().subscribe({
      next: (data) => { this.waterLogs.set(data); done(); },
      error: () => done()
    });

    this.sleepService.getSleepHistory().subscribe({
      next: (data) => { this.sleepLogs.set(data); done(); },
      error: () => done()
    });

    this.activityService.getActivityHistory().subscribe({
      next: (data) => { this.activityLogs.set(data); done(); },
      error: () => done()
    });

    this.goalService.getGoals().subscribe({
      next: (data) => { this.goals.set(data); },
      error: () => {}
    });
  }

  private initCharts(): void {
    if (this.chartsInitialized) return;
    this.destroyCharts();
    this.initWeightChart();
    this.initWaterChart();
    this.initSleepChart();
    this.initActivityChart();
    this.chartsInitialized = true;
  }

  private initWeightChart(): void {
    const canvas = this.weightChartCanvas?.nativeElement;
    if (!canvas) return;
    const records = [...this.weights()].reverse().slice(-14);
    if (records.length < 1) return;

    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: records.map(r => {
          const d = new Date(r.recordedAt);
          return `${d.getDate()}/${d.getMonth() + 1}`;
        }),
        datasets: [{
          label: 'Weight (kg)',
          data: records.map(r => parseFloat(r.weight)),
          borderColor: '#4285f4',
          backgroundColor: 'rgba(66, 133, 244, 0.08)',
          pointBackgroundColor: '#4285f4',
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.4,
          fill: true,
          borderWidth: 2.5
        }]
      },
      options: this.getChartOptions('Weight (kg)')
    });
    this.charts.push(chart);
  }

  private initWaterChart(): void {
    const canvas = this.waterChartCanvas?.nativeElement;
    if (!canvas) return;
    // Group water by day (last 7 days)
    const days = this.getLast7DaysWater();

    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: days.map(d => d.label),
        datasets: [{
          label: 'Water (ml)',
          data: days.map(d => d.total),
          backgroundColor: days.map(d =>
            d.total >= 2000 ? 'rgba(66, 133, 244, 0.85)' : 'rgba(66, 133, 244, 0.35)'
          ),
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        ...this.getChartOptions('Water (ml)'),
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.parsed.y} ml`
            }
          }
        }
      }
    });
    this.charts.push(chart);
  }

  private initSleepChart(): void {
    const canvas = this.sleepChartCanvas?.nativeElement;
    if (!canvas) return;
    const records = [...this.sleepLogs()].reverse().slice(-7);

    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: records.map(r => {
          const d = new Date(r.sleepEnd);
          return `${d.getDate()}/${d.getMonth() + 1}`;
        }),
        datasets: [{
          label: 'Sleep (hrs)',
          data: records.map(r => parseFloat(r.totalHours)),
          backgroundColor: records.map(r =>
            parseFloat(r.totalHours) >= 7 ? 'rgba(155, 89, 182, 0.85)' : 'rgba(155, 89, 182, 0.4)'
          ),
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        ...this.getChartOptions('Sleep (hrs)'),
        plugins: { legend: { display: false } }
      }
    });
    this.charts.push(chart);
  }

  private initActivityChart(): void {
    const canvas = this.activityChartCanvas?.nativeElement;
    if (!canvas) return;
    // Calories by activity type
    const calories: Record<string, number> = {};
    this.activityLogs().forEach(a => {
      calories[a.activity_type] = (calories[a.activity_type] || 0) + (a.calories_burned || 0);
    });
    const entries = Object.entries(calories).slice(0, 6);
    if (entries.length === 0) return;

    const colors = ['#4285f4', '#9b59b6', '#e74c3c', '#27ae60', '#f39c12', '#1abc9c'];

    const chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: entries.map(e => e[0]),
        datasets: [{
          data: entries.map(e => e[1]),
          backgroundColor: colors,
          borderWidth: 0,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: getComputedStyle(document.documentElement).getPropertyValue('--color-text-secondary').trim() || '#6b7280',
              font: { size: 11, family: 'Inter' },
              boxWidth: 10,
              padding: 16
            }
          }
        },
        cutout: '70%'
      }
    });
    this.charts.push(chart);
  }

  private getChartOptions(label: string): any {
    const textColor = '#6b7280';
    const gridColor = 'rgba(107, 114, 128, 0.12)';
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.85)',
          padding: 10,
          titleFont: { size: 12, family: 'Inter', weight: '600' },
          bodyFont: { size: 11, family: 'Inter' },
          cornerRadius: 8,
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: textColor, font: { size: 11, family: 'Inter' } }
        },
        y: {
          grid: { color: gridColor, drawBorder: false },
          ticks: { color: textColor, font: { size: 11, family: 'Inter' } }
        }
      }
    };
  }

  private getLast7DaysWater(): { label: string; total: number }[] {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().substring(0, 10);
      const total = this.waterLogs()
        .filter(w => w.consumedAt?.substring(0, 10) === dateStr)
        .reduce((sum: number, w: any) => sum + (w.amountMl || 0), 0);
      result.push({
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        total
      });
    }
    return result;
  }

  private destroyCharts(): void {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
  }

  getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  }

  getTotalCalories(): number {
    return this.activityLogs().reduce((sum, a) => sum + (a.calories_burned || 0), 0);
  }

  formatGoalType(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  getActivityIcon(type: string): string {
    const icons: Record<string, string> = {
      Running: '🏃', Cycling: '🚴', Swimming: '🏊', Walking: '🚶',
      Gym: '💪', Yoga: '🧘', Hiking: '🥾', Boxing: '🥊', default: '⚡'
    };
    return icons[type] || icons['default'];
  }

  getGoalProgress(goal: any): number {
    if (!goal.target_value || goal.target_value === 0) return 0;
    return Math.min(100, Math.round((goal.current_value / goal.target_value) * 100));
  }
}
