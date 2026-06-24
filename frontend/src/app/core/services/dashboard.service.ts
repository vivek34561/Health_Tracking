import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getExpressUrl } from '../config/api.config';

export interface DashboardSummary {
  waterToday: number;
  waterGoal: number;
  sleepToday: number;
  sleepGoal: number;
  weight: number | null;
  activityCount: number;
  goalsProgress: { targetValue: number; currentValue: number }[];
  date: string;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${getExpressUrl()}/api/dashboard`;

  /**
   * Get today's dashboard summary
   */
  getSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(this.baseUrl);
  }
}
