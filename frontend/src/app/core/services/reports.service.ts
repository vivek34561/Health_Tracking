import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface WeeklyReport {
  week: string;
  days: {
    date: string;
    water: number;
    sleep: number;
    weight: number | null;
    activityCount: number;
    goalsCompleted: number;
  }[];
  averages: {
    water: number;
    sleep: number;
    activityCount: number;
    goalsCompletionRate: number;
  };
}

export interface MonthlyReport {
  month: string;
  weeks: any[];
  totals: {
    totalWater: number;
    avgSleep: number;
    totalActivities: number;
    weightChange: number | null;
  };
  healthScore: number;
}

export interface ProgressReport {
  weights: { date: string; weight: number }[];
  waterTrend: { date: string; total: number }[];
  sleepTrend: { date: string; hours: number }[];
  activityTrend: { date: string; count: number }[];
  goalProgress: { type: string; current: number; target: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://health-tracking-1-ji8x.onrender.com/api/reports';

  getWeeklyReport(): Observable<WeeklyReport> {
    return this.http.get<WeeklyReport>(`${this.baseUrl}/weekly`);
  }

  getMonthlyReport(): Observable<MonthlyReport> {
    return this.http.get<MonthlyReport>(`${this.baseUrl}/monthly`);
  }

  getProgressReport(): Observable<ProgressReport> {
    return this.http.get<ProgressReport>(`${this.baseUrl}/progress`);
  }
}
