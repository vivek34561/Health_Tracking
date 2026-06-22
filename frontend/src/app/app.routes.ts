import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login';
import { RegisterComponent } from './features/auth/register';
import { DashboardComponent } from './features/dashboard/dashboard';
import { WeightComponent } from './features/health-metrics/weight';
import { WaterComponent } from './features/water-logs/water';
import { SleepComponent } from './features/sleep-logs/sleep';
import { ActivityComponent } from './features/activity-logs/activity';
import { GoalsComponent } from './features/goals/goals';
import { ReportsComponent } from './features/reports/reports';
import { AiInsightsComponent } from './features/ai-insights/ai-insights';
import { NotificationsComponent } from './features/notifications/notifications';
import { ProfileComponent } from './features/profile/profile';
import { SettingsComponent } from './features/settings/settings';
import { BodyFatComponent } from './features/bodyfat/bodyfat';
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
  { path: 'reports', component: ReportsComponent, canActivate: [authGuard] },
  { path: 'ai-insights', component: AiInsightsComponent, canActivate: [authGuard] },
  { path: 'notifications', component: NotificationsComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'settings', component: SettingsComponent, canActivate: [authGuard] },
  { path: 'bodyfat', component: BodyFatComponent, canActivate: [authGuard] },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: '/dashboard' }
];
