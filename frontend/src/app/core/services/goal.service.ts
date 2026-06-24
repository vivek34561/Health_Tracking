import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getExpressUrl } from '../config/api.config';

export interface GoalRecord {
  id: number;
  goal_type: string;
  target_value: number;
  current_value: number;
  start_date: string;
  end_date: string;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class GoalService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${getExpressUrl()}/api/goals`;

  /**
   * Get active and historical goals
   */
  getGoals(): Observable<GoalRecord[]> {
    return this.http.get<GoalRecord[]>(this.baseUrl);
  }

  /**
   * Add a new goal
   */
  addGoal(goalData: {
    goal_type: string;
    target_value: number;
    current_value?: number;
    start_date?: string;
    end_date?: string;
    status?: string;
  }): Observable<any> {
    return this.http.post(this.baseUrl, goalData);
  }

  /**
   * Update progress or status of a goal
   */
  updateGoal(id: number, goalData: {
    goal_type?: string;
    target_value?: number;
    current_value?: number;
    start_date?: string;
    end_date?: string;
    status?: string;
  }): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, goalData);
  }

  /**
   * Delete a goal
   */
  deleteGoal(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
