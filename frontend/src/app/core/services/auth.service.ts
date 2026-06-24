import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { getExpressUrl } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly baseUrl = `${getExpressUrl()}/api/auth`;

  // Signals for responsive state management
  readonly currentUser = signal<any>(null);
  readonly token = signal<string | null>(null);
  readonly isAuthenticated = computed(() => !!this.token());

  constructor() {
    this.autoLogin();
  }

  /**
   * Register a new user
   */
  register(name: string, email: string, password: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/register`, { name, email, password });
  }

  /**
   * Log in user
   */
  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/login`, { email, password }).pipe(
      tap(response => {
        if (response && response.token) {
          this.token.set(response.token);
          this.currentUser.set(response.user);
          localStorage.setItem('ht_token', response.token);
          localStorage.setItem('ht_user', JSON.stringify(response.user));
        }
      })
    );
  }

  /**
   * Log out user
   */
  logout(): void {
    this.token.set(null);
    this.currentUser.set(null);
    localStorage.removeItem('ht_token');
    localStorage.removeItem('ht_user');
    this.router.navigate(['/login']);
  }

  /**
   * Change user password
   */
  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/change-password`, { currentPassword, newPassword });
  }

  /**
   * Update profile info and cache
   */
  updateProfile(profileData: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/profile`, profileData).pipe(
      tap(() => {
        // Refresh local profile
        this.getProfile().subscribe();
      })
    );
  }

  /**
   * Fetch current user profile
   */
  getProfile(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/profile`).pipe(
      tap(profile => {
        const updatedUser = {
          ...this.currentUser(),
          name: profile.name,
          email: profile.email,
          age: profile.age,
          height: profile.height,
          weight: profile.weight,
          gender: profile.gender,
          activityLevel: profile.activityLevel
        };
        this.currentUser.set(updatedUser);
        localStorage.setItem('ht_user', JSON.stringify(updatedUser));
      })
    );
  }

  /**
   * Automatically log in using stored token
   */
  private autoLogin(): void {
    if (typeof window === 'undefined') return; // Avoid issues during SSR
    
    const savedToken = localStorage.getItem('ht_token');
    const savedUser = localStorage.getItem('ht_user');

    if (savedToken && savedUser) {
      this.token.set(savedToken);
      try {
        this.currentUser.set(JSON.parse(savedUser));
        // Verify token validity by calling profile in background
        this.getProfile().subscribe({
          error: () => this.logout() // Log out if token is expired/invalid
        });
      } catch {
        this.logout();
      }
    }
  }
}
