import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WeightService } from '../../core/services/weight.service';
import { WaterService } from '../../core/services/water.service';
import { SleepService } from '../../core/services/sleep.service';
import { ActivityService } from '../../core/services/activity.service';
import { GoalService } from '../../core/services/goal.service';
import { AuthService } from '../../core/services/auth.service';

interface Insight {
  id: string;
  title: string;
  description: string;
  status: 'good' | 'improve' | 'critical';
  metric: string;
  value: string;
  icon: string;
}

@Component({
  selector: 'app-ai-insights',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './ai-insights.html',
  styleUrl: './ai-insights.css'
})
export class AiInsightsComponent implements OnInit {
  private readonly weightService = inject(WeightService);
  private readonly waterService = inject(WaterService);
  private readonly sleepService = inject(SleepService);
  private readonly activityService = inject(ActivityService);
  private readonly goalService = inject(GoalService);
  readonly authService = inject(AuthService);

  readonly isLoading = signal(true);
  readonly weights = signal<any[]>([]);
  readonly waterLogs = signal<any[]>([]);
  readonly sleepLogs = signal<any[]>([]);
  readonly activityLogs = signal<any[]>([]);
  readonly goals = signal<any[]>([]);
  readonly today = new Date();

  readonly insights = computed<Insight[]>(() => {
    const insights: Insight[] = [];

    // Water insight
    const todayStr = new Date().toISOString().substring(0, 10);
    const todayWater = this.waterLogs()
      .filter(w => w.consumedAt?.substring(0, 10) === todayStr)
      .reduce((sum, w) => sum + (w.amountMl || 0), 0);

    const waterGoal = 2500;
    if (todayWater >= waterGoal) {
      insights.push({
        id: 'water-good',
        title: 'Hydration Goal Met',
        description: `Excellent! You've consumed ${todayWater}ml today, meeting your daily hydration goal. Proper hydration improves cognitive performance and energy levels.`,
        status: 'good',
        metric: 'Today\'s Water',
        value: `${todayWater}ml`,
        icon: '💧'
      });
    } else if (todayWater > 0) {
      insights.push({
        id: 'water-improve',
        title: 'Increase Water Intake',
        description: `You've had ${todayWater}ml so far. Drink ${waterGoal - todayWater}ml more to meet your daily goal. Try keeping a water bottle at your desk.`,
        status: 'improve',
        metric: 'Today\'s Water',
        value: `${todayWater}ml / ${waterGoal}ml`,
        icon: '💧'
      });
    } else {
      insights.push({
        id: 'water-critical',
        title: 'No Water Logged Today',
        description: 'You haven\'t logged any water intake today. Dehydration reduces focus and energy. Log your first glass now!',
        status: 'critical',
        metric: 'Today\'s Water',
        value: '0ml',
        icon: '💧'
      });
    }

    // Sleep insight
    const recentSleep = this.sleepLogs().slice(0, 7);
    if (recentSleep.length > 0) {
      const avgSleep = recentSleep.reduce((sum, s) => sum + parseFloat(s.totalHours || '0'), 0) / recentSleep.length;
      if (avgSleep >= 7.5) {
        insights.push({
          id: 'sleep-good',
          title: 'Sleep Quality is Excellent',
          description: `Your average sleep duration of ${avgSleep.toFixed(1)} hours over the past week is above the recommended 7-9 hours. Keep maintaining this healthy sleep schedule.`,
          status: 'good',
          metric: 'Avg Sleep (7 days)',
          value: `${avgSleep.toFixed(1)} hrs`,
          icon: '😴'
        });
      } else if (avgSleep >= 6) {
        insights.push({
          id: 'sleep-improve',
          title: 'Sleep Could Be Better',
          description: `Your average sleep of ${avgSleep.toFixed(1)} hours is slightly below the recommended 7-9 hours. Try going to bed 30 minutes earlier to improve your rest.`,
          status: 'improve',
          metric: 'Avg Sleep (7 days)',
          value: `${avgSleep.toFixed(1)} hrs`,
          icon: '😴'
        });
      } else {
        insights.push({
          id: 'sleep-critical',
          title: 'Critically Low Sleep',
          description: `Averaging only ${avgSleep.toFixed(1)} hours of sleep is dangerous for your health. Sleep deprivation impairs immunity, mood, and cognitive function. Prioritize rest.`,
          status: 'critical',
          metric: 'Avg Sleep (7 days)',
          value: `${avgSleep.toFixed(1)} hrs`,
          icon: '😴'
        });
      }
    }

    // Activity insight
    const recentActivity = this.activityLogs().slice(0, 7);
    const activityCount = recentActivity.length;
    const totalCalories = recentActivity.reduce((sum, a) => sum + (a.calories_burned || 0), 0);

    if (activityCount >= 5) {
      insights.push({
        id: 'activity-good',
        title: 'You\'re Very Active',
        description: `${activityCount} workouts logged in the past week with ${totalCalories} calories burned. You're exceeding the WHO's recommendation of 150 minutes of moderate activity per week.`,
        status: 'good',
        metric: 'Weekly Activities',
        value: `${activityCount} sessions`,
        icon: '🏃'
      });
    } else if (activityCount >= 3) {
      insights.push({
        id: 'activity-improve',
        title: 'Add More Active Days',
        description: `You had ${activityCount} workouts this week. For optimal health, aim for at least 5 days of physical activity. Even a 20-minute walk counts!`,
        status: 'improve',
        metric: 'Weekly Activities',
        value: `${activityCount} sessions`,
        icon: '🏃'
      });
    } else {
      insights.push({
        id: 'activity-critical',
        title: 'Low Physical Activity',
        description: `Only ${activityCount} workout${activityCount !== 1 ? 's' : ''} logged recently. Regular exercise reduces the risk of chronic diseases and improves mental health. Start with a 15-minute walk today.`,
        status: 'critical',
        metric: 'Weekly Activities',
        value: `${activityCount} sessions`,
        icon: '🏃'
      });
    }

    // Weight insight
    const weightLogs = this.weights();
    if (weightLogs.length >= 2) {
      const latest = parseFloat(weightLogs[0]?.weight || '0');
      const prev = parseFloat(weightLogs[1]?.weight || '0');
      const delta = latest - prev;
      if (Math.abs(delta) < 0.5) {
        insights.push({
          id: 'weight-stable',
          title: 'Weight is Stable',
          description: `Your weight has remained stable at ${latest}kg. Consistency is key to long-term health. Keep up your current nutrition and exercise habits.`,
          status: 'good',
          metric: 'Latest Weight',
          value: `${latest} kg`,
          icon: '⚖️'
        });
      } else if (delta < 0) {
        insights.push({
          id: 'weight-loss',
          title: 'Weight Trending Down',
          description: `Your weight decreased by ${Math.abs(delta).toFixed(1)}kg since your last log (${latest}kg). ${Math.abs(delta) > 1 ? 'Ensure this is intentional and maintain adequate nutrition.' : 'Great progress toward your goal!'}`,
          status: Math.abs(delta) > 1.5 ? 'improve' : 'good',
          metric: 'Weight Change',
          value: `${delta.toFixed(1)} kg`,
          icon: '⚖️'
        });
      } else {
        insights.push({
          id: 'weight-gain',
          title: 'Weight Trending Up',
          description: `Your weight increased by ${delta.toFixed(1)}kg since your last log (${latest}kg). Review your calorie intake and activity level to align with your goals.`,
          status: delta > 1.5 ? 'critical' : 'improve',
          metric: 'Weight Change',
          value: `+${delta.toFixed(1)} kg`,
          icon: '⚖️'
        });
      }
    }

    // Goals insight
    const activeGoals = this.goals().filter(g => g.status === 'ACTIVE');
    const completedGoals = this.goals().filter(g => g.status === 'COMPLETED');
    if (activeGoals.length > 0 || completedGoals.length > 0) {
      const completionRate = this.goals().length > 0
        ? Math.round((completedGoals.length / this.goals().length) * 100)
        : 0;
      insights.push({
        id: 'goals-status',
        title: completedGoals.length > 0 ? 'Goals Progress' : 'Work Toward Your Goals',
        description: completedGoals.length > 0
          ? `You've completed ${completedGoals.length} goal${completedGoals.length > 1 ? 's' : ''} (${completionRate}% completion rate) with ${activeGoals.length} active goal${activeGoals.length !== 1 ? 's' : ''} in progress.`
          : `You have ${activeGoals.length} active goal${activeGoals.length !== 1 ? 's' : ''}. Set milestones and track your progress daily to achieve them faster.`,
        status: completionRate >= 50 ? 'good' : activeGoals.length > 0 ? 'improve' : 'critical',
        metric: 'Goals Completed',
        value: `${completedGoals.length} / ${this.goals().length}`,
        icon: '🎯'
      });
    }

    return insights;
  });

  readonly goodInsights = computed(() => this.insights().filter(i => i.status === 'good'));
  readonly improveInsights = computed(() => this.insights().filter(i => i.status === 'improve'));
  readonly criticalInsights = computed(() => this.insights().filter(i => i.status === 'critical'));

  readonly overallScore = computed(() => {
    const total = this.insights().length;
    if (total === 0) return 0;
    const good = this.goodInsights().length;
    const improve = this.improveInsights().length;
    return Math.round(((good * 100 + improve * 50) / (total * 100)) * 100);
  });

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    let loaded = 0;
    const total = 5;
    const done = () => {
      loaded++;
      if (loaded >= total) this.isLoading.set(false);
    };

    this.weightService.getWeightHistory().subscribe({ next: d => { this.weights.set(d); done(); }, error: () => done() });
    this.waterService.getWaterHistory().subscribe({ next: d => { this.waterLogs.set(d); done(); }, error: () => done() });
    this.sleepService.getSleepHistory().subscribe({ next: d => { this.sleepLogs.set(d); done(); }, error: () => done() });
    this.activityService.getActivityHistory().subscribe({ next: d => { this.activityLogs.set(d); done(); }, error: () => done() });
    this.goalService.getGoals().subscribe({ next: d => { this.goals.set(d); done(); }, error: () => done() });
  }

  getScoreLabel(): string {
    const score = this.overallScore();
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Attention';
  }

  getScoreColor(): string {
    const score = this.overallScore();
    if (score >= 80) return 'var(--color-success)';
    if (score >= 60) return 'var(--color-warning)';
    return 'var(--color-danger)';
  }
}
