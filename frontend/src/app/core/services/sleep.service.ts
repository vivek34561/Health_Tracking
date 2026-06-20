import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SleepRecord {
  id: number;
  sleepStart: string;
  sleepEnd: string;
  totalHours: string | number;
  qualityScore: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class SleepService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5000/api/sleep';

  /**
   * Get sleep logs history
   */
  getSleepHistory(): Observable<SleepRecord[]> {
    return this.http.get<SleepRecord[]>(this.baseUrl);
  }

  /**
   * Add a new sleep log entry
   */
  addSleep(sleepStart: string, sleepEnd: string, qualityScore?: number): Observable<any> {
    const payload: any = {
      sleep_start: sleepStart,
      sleep_end: sleepEnd
    };
    if (qualityScore !== undefined) {
      payload.quality_score = qualityScore;
    }
    return this.http.post(this.baseUrl, payload);
  }

  /**
   * Update an existing sleep log entry
   */
  updateSleep(id: number, sleepStart: string, sleepEnd: string, qualityScore?: number): Observable<any> {
    const payload: any = {
      sleep_start: sleepStart,
      sleep_end: sleepEnd
    };
    if (qualityScore !== undefined) {
      payload.quality_score = qualityScore;
    }
    return this.http.put(`${this.baseUrl}/${id}`, payload);
  }

  /**
   * Delete a sleep record
   */
  deleteSleep(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
