import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DashboardSummary {
  success: boolean;
  current_weight: number | null;
  weight_change: number | null;
  water_consumed: number;
  sleep_hours: number;
  sleep_quality: number;
  activities_today: number;
  calories_burned_today: number;
  active_goals: number;
  completed_goals: number;
  failed_goals: number;
  goal_completion: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5000/api/dashboard';

  /**
   * Get dashboard summary data
   */
  getDashboardSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(this.baseUrl);
  }
}
