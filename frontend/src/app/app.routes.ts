import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login';
import { RegisterComponent } from './features/auth/register';
import { DashboardComponent } from './features/dashboard/dashboard';
import { WeightComponent } from './features/health-metrics/weight';
import { WaterComponent } from './features/water-logs/water';
import { SleepComponent } from './features/sleep-logs/sleep';
import { ActivityComponent } from './features/activity-logs/activity';
import { GoalsComponent } from './features/goals/goals';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'weight', component: WeightComponent, canActivate: [authGuard] },
  { path: 'water', component: WaterComponent, canActivate: [authGuard] },
  { path: 'sleep', component: SleepComponent, canActivate: [authGuard] },
  { path: 'activity', component: ActivityComponent, canActivate: [authGuard] },
  { path: 'goals', component: GoalsComponent, canActivate: [authGuard] },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: '/dashboard' }
];
