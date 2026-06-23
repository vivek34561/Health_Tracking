import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface WaterRecord {
  id: number;
  amountMl: number;
  consumedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class WaterService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://health-tracking-1-ji8x.onrender.com/api/water';

  /**
   * Get water logs history
   */
  getWaterHistory(): Observable<WaterRecord[]> {
    return this.http.get<WaterRecord[]>(this.baseUrl);
  }

  /**
   * Add a new water log entry
   */
  addWater(amountMl: number, consumedAt?: string): Observable<any> {
    const payload: any = { amount_ml: amountMl };
    if (consumedAt) {
      payload.consumed_at = consumedAt;
    }
    return this.http.post(this.baseUrl, payload);
  }

  /**
   * Delete a water log entry
   */
  deleteWater(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
