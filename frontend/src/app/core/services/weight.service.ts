import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface WeightRecord {
  id: number;
  weight: string | number;
  recordedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class WeightService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://health-tracking-1-ji8x.onrender.com/api/weights';

  /**
   * Get weight history logs
   */
  getWeightHistory(): Observable<WeightRecord[]> {
    return this.http.get<WeightRecord[]>(this.baseUrl);
  }

  /**
   * Record a new weight entry
   */
  addWeight(weight: number, recordedAt?: string): Observable<any> {
    const payload: any = { weight };
    if (recordedAt) {
      payload.recordedAt = recordedAt;
    }
    return this.http.post(this.baseUrl, payload);
  }

  /**
   * Update an existing weight record
   */
  updateWeight(id: number, weight: number, recordedAt?: string): Observable<any> {
    const payload: any = { weight };
    if (recordedAt) {
      payload.recordedAt = recordedAt;
    }
    return this.http.put(`${this.baseUrl}/${id}`, payload);
  }

  /**
   * Delete a weight record
   */
  deleteWeight(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
