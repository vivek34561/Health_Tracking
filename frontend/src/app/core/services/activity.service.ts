import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ActivityRecord {
  id: number;
  activity_type: string;
  duration: number;
  calories_burned: number;
  distance_km: number;
  activity_date: string;
}

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5000/api/activities';

  /**
   * Get activity logs history
   */
  getActivityHistory(): Observable<ActivityRecord[]> {
    return this.http.get<ActivityRecord[]>(this.baseUrl);
  }

  /**
   * Add a new activity entry
   */
  addActivity(activityData: {
    activity_type: string;
    duration: number;
    calories_burned?: number;
    distance_km?: number;
    activity_date?: string;
  }): Observable<any> {
    return this.http.post(this.baseUrl, activityData);
  }

  /**
   * Update an existing activity entry
   */
  updateActivity(id: number, activityData: {
    activity_type: string;
    duration: number;
    calories_burned?: number;
    distance_km?: number;
    activity_date?: string;
  }): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, activityData);
  }

  /**
   * Delete an activity entry
   */
  deleteActivity(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
