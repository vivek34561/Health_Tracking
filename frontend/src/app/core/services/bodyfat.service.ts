import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BodyFatRequest {
  density: number;
  age: number;
  weight: number;
  height: number;
  neck: number;
  chest: number;
  abdomen: number;
  hip: number;
  thigh: number;
  knee: number;
  ankle: number;
  biceps: number;
  forearm: number;
  wrist: number;
  gender: string;
  unit_system: string;
}

export interface BodyFatResponse {
  predicted_bodyfat: number;
  category: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class BodyFatService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://health-tracking-1-ji8x.onrender.com/api/ai/predict-bodyfat';

  /**
   * Predict body fat percentage based on body measurements
   */
  predictBodyFat(data: BodyFatRequest): Observable<BodyFatResponse> {
    return this.http.post<BodyFatResponse>(this.baseUrl, data);
  }
}
