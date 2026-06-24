import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getExpressUrl } from '../config/api.config';

export interface FoodRecord {
  id?: number;
  user_id?: number;
  food_name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  meal_type: string;
  created_at?: string;
}

export interface DietGoal {
  id?: number;
  user_id?: number;
  goal_type: string;
  target_calories: number;
  target_protein: number;
  target_carbs: number;
  target_fat: number;
  is_custom?: boolean;
  recommendations?: Record<string, {
    target_calories: number;
    target_protein: number;
    target_carbs: number;
    target_fat: number;
  }>;
}

export interface NutritionSummary {
  date: string;
  goal_type: string;
  consumed: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  remaining: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
}

export interface RecommendationCategory {
  category: string;
  reason: string;
  foods: Array<{
    name: string;
    description: string;
  }>;
}

export interface RecommendationResponse {
  goal_type: string;
  macro_status: {
    remaining_calories: number;
    remaining_protein: number;
    remaining_carbs: number;
    remaining_fat: number;
  };
  recommendations: RecommendationCategory[];
}

@Injectable({
  providedIn: 'root'
})
export class DietService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${getExpressUrl()}/api`;

  // --- Food Logging ---
  addFood(food: FoodRecord): Observable<any> {
    return this.http.post(`${this.baseUrl}/foods`, food);
  }

  getFoods(date?: string): Observable<FoodRecord[]> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }
    return this.http.get<FoodRecord[]>(`${this.baseUrl}/foods`, { params });
  }

  searchDictionary(query: string): Observable<any[]> {
    let params = new HttpParams().set('query', query);
    return this.http.get<any[]>(`${this.baseUrl}/foods/search`, { params });
  }

  updateFood(id: number, food: FoodRecord): Observable<any> {
    return this.http.put(`${this.baseUrl}/foods/${id}`, food);
  }

  deleteFood(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/foods/${id}`);
  }

  // --- Nutrition Analysis ---
  getNutritionToday(date?: string): Observable<NutritionSummary> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }
    return this.http.get<NutritionSummary>(`${this.baseUrl}/nutrition/today`, { params });
  }

  getNutritionWeek(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/nutrition/week`);
  }

  getNutritionMonth(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/nutrition/month`);
  }

  getRecommendations(): Observable<RecommendationResponse> {
    return this.http.get<RecommendationResponse>(`${this.baseUrl}/nutrition/recommendations`);
  }

  // --- Goal Setting ---
  getDietGoals(): Observable<DietGoal> {
    return this.http.get<DietGoal>(`${this.baseUrl}/diet/goals`);
  }

  updateDietGoals(goal: DietGoal): Observable<any> {
    return this.http.put(`${this.baseUrl}/diet/goals`, goal);
  }
}
