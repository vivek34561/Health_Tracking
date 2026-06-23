import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WeightService } from '../../core/services/weight.service';
import { WaterService } from '../../core/services/water.service';
import { SleepService } from '../../core/services/sleep.service';
import { ActivityService } from '../../core/services/activity.service';
import { GoalService } from '../../core/services/goal.service';
import { AuthService } from '../../core/services/auth.service';
import { DietService, NutritionSummary } from '../../core/services/diet.service';

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
  private readonly dietService = inject(DietService);
  readonly authService = inject(AuthService);

  readonly isLoading = signal(true);
  readonly nutritionSummary = signal<NutritionSummary | null>(null);
  readonly weights = signal<any[]>([]);
  readonly waterLogs = signal<any[]>([]);
  readonly sleepLogs = signal<any[]>([]);
  readonly activityLogs = signal<any[]>([]);
  readonly goals = signal<any[]>([]);
  readonly today = new Date();

  readonly insights = computed<Insight[]>(() => {
    const insights: Insight[] = [];
    const activeGoals = this.goals().filter(g => g.status === 'ACTIVE');

    // 1. Water insight
    const today = new Date().toDateString();
    const todayWater = this.waterLogs()
      .filter(w => w.consumedAt && new Date(w.consumedAt).toDateString() === today)
      .reduce((sum, w) => sum + (Number(w.amountMl) || 0), 0);

    const waterGoalObj = activeGoals.find(g => g.goal_type?.toUpperCase() === 'WATER');
    const waterGoal = waterGoalObj ? Number(waterGoalObj.target_value) : 2500;

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
        value: `0ml / ${waterGoal}ml`,
        icon: '💧'
      });
    }

    // 2. Sleep insight
    const recentSleep = this.sleepLogs().slice(0, 7);
    if (recentSleep.length > 0) {
      const avgSleep = recentSleep.reduce((sum, s) => sum + parseFloat(s.totalHours || '0'), 0) / recentSleep.length;
      
      const sleepGoalObj = activeGoals.find(g => g.goal_type?.toUpperCase() === 'SLEEP');
      const sleepGoal = sleepGoalObj ? Number(sleepGoalObj.target_value) : 8;

      if (avgSleep >= sleepGoal) {
        insights.push({
          id: 'sleep-good',
          title: 'Sleep Quality is Excellent',
          description: `Your average sleep duration of ${avgSleep.toFixed(1)} hours over the past week is at or above your goal of ${sleepGoal} hours. Keep maintaining this healthy sleep schedule.`,
          status: 'good',
          metric: 'Avg Sleep (7 days)',
          value: `${avgSleep.toFixed(1)} hrs`,
          icon: '😴'
        });
      } else if (avgSleep >= Math.max(4, sleepGoal - 1.5)) {
        insights.push({
          id: 'sleep-improve',
          title: 'Sleep Could Be Better',
          description: `Your average sleep of ${avgSleep.toFixed(1)} hours is slightly below your goal of ${sleepGoal} hours. Try going to bed 30 minutes earlier to improve your rest.`,
          status: 'improve',
          metric: 'Avg Sleep (7 days)',
          value: `${avgSleep.toFixed(1)} hrs / ${sleepGoal} hrs`,
          icon: '😴'
        });
      } else {
        insights.push({
          id: 'sleep-critical',
          title: 'Critically Low Sleep',
          description: `Averaging only ${avgSleep.toFixed(1)} hours of sleep is significantly below your goal of ${sleepGoal} hours. Sleep deprivation impairs immunity, mood, and cognitive function. Prioritize rest.`,
          status: 'critical',
          metric: 'Avg Sleep (7 days)',
          value: `${avgSleep.toFixed(1)} hrs / ${sleepGoal} hrs`,
          icon: '😴'
        });
      }
    }

    // 3. Activity insight
    const recentActivity = this.activityLogs().slice(0, 7);
    const activityCount = recentActivity.length;
    const totalCalories = recentActivity.reduce((sum, a) => sum + (a.calories_burned || 0), 0);

    const activityGoalObj = activeGoals.find(g => g.goal_type?.toUpperCase() === 'ACTIVITY');
    const activityGoal = activityGoalObj ? Number(activityGoalObj.target_value) : 5;

    if (activityCount >= activityGoal) {
      insights.push({
        id: 'activity-good',
        title: 'You\'re Very Active',
        description: `${activityCount} workouts logged in the past week with ${totalCalories} calories burned. You're meeting or exceeding your weekly goal of ${activityGoal} activities.`,
        status: 'good',
        metric: 'Weekly Activities',
        value: `${activityCount} sessions`,
        icon: '🏃'
      });
    } else if (activityCount >= Math.max(1, activityGoal - 2)) {
      insights.push({
        id: 'activity-improve',
        title: 'Add More Active Days',
        description: `You had ${activityCount} workouts this week. For optimal health, aim to meet your goal of ${activityGoal} days of physical activity. Even a 20-minute walk counts!`,
        status: 'improve',
        metric: 'Weekly Activities',
        value: `${activityCount} / ${activityGoal}`,
        icon: '🏃'
      });
    } else {
      insights.push({
        id: 'activity-critical',
        title: 'Low Physical Activity',
        description: `Only ${activityCount} workout${activityCount !== 1 ? 's' : ''} logged recently, well below your goal of ${activityGoal}. Regular exercise reduces the risk of chronic diseases and improves mental health.`,
        status: 'critical',
        metric: 'Weekly Activities',
        value: `${activityCount} / ${activityGoal}`,
        icon: '🏃'
      });
    }

    // 4. Weight insight
    const weightLogs = this.weights();
    if (weightLogs.length >= 2) {
      const latest = parseFloat(weightLogs[0]?.weight || '0');
      const prev = parseFloat(weightLogs[1]?.weight || '0');
      const delta = latest - prev;

      const weightGoalObj = activeGoals.find(g => g.goal_type?.toUpperCase() === 'WEIGHT');
      const targetWeight = weightGoalObj ? Number(weightGoalObj.target_value) : null;
      // If targetWeight is less than latest, they want to lose weight (loss goal).
      const isWeightLossGoal = targetWeight !== null ? (targetWeight < latest) : (delta <= 0);

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
        // Weight is trending down (loss)
        insights.push({
          id: 'weight-loss',
          title: isWeightLossGoal ? 'Weight Trending Down' : 'Weight is Decreasing',
          description: isWeightLossGoal
            ? `Your weight decreased by ${Math.abs(delta).toFixed(1)}kg since your last log (${latest}kg). Great progress toward your goal!`
            : `Your weight decreased by ${Math.abs(delta).toFixed(1)}kg since your last log (${latest}kg). Ensure this is intentional since your target is to gain/maintain weight.`,
          status: isWeightLossGoal ? (Math.abs(delta) > 1.5 ? 'improve' : 'good') : 'improve',
          metric: 'Weight Change',
          value: `${delta.toFixed(1)} kg`,
          icon: '⚖️'
        });
      } else {
        // Weight is trending up (gain)
        insights.push({
          id: 'weight-gain',
          title: isWeightLossGoal ? 'Weight is Increasing' : 'Weight Trending Up',
          description: isWeightLossGoal
            ? `Your weight increased by ${delta.toFixed(1)}kg since your last log (${latest}kg). Review your calorie intake and activity level to align with your weight loss goals.`
            : `Your weight increased by ${delta.toFixed(1)}kg since your last log (${latest}kg). Great progress toward your weight gain goal!`,
          status: isWeightLossGoal ? 'critical' : (delta > 1.5 ? 'improve' : 'good'),
          metric: 'Weight Change',
          value: `+${delta.toFixed(1)} kg`,
          icon: '⚖️'
        });
      }
    }

    // 5. Calorie & Protein Diet Insights
    const n = this.nutritionSummary();
    if (n) {
      // Calorie insight
      const consumedCals = n.consumed.calories;
      const targetCals = n.targets.calories;
      const calPercent = targetCals > 0 ? Math.round((consumedCals / targetCals) * 100) : 0;
      
      if (calPercent >= 90 && calPercent <= 110) {
        insights.push({
          id: 'calories-good',
          title: 'Calorie Budget On Track',
          description: `You've consumed ${consumedCals} kcal today out of your ${targetCals} kcal goal (${calPercent}%). Great job balancing your energy intake!`,
          status: 'good',
          metric: 'Today\'s Calories',
          value: `${consumedCals} / ${targetCals} kcal`,
          icon: '🍽️'
        });
      } else if (calPercent < 90) {
        insights.push({
          id: 'calories-improve',
          title: 'Increase Calorie Intake',
          description: `You've consumed ${consumedCals} kcal so far, which is ${calPercent}% of your daily goal of ${targetCals} kcal. Make sure to eat enough to sustain your energy levels.`,
          status: 'improve',
          metric: 'Today\'s Calories',
          value: `${consumedCals} / ${targetCals} kcal`,
          icon: '🍽️'
        });
      } else {
        insights.push({
          id: 'calories-critical',
          title: 'Calorie Budget Exceeded',
          description: `You've consumed ${consumedCals} kcal today, exceeding your goal of ${targetCals} kcal by ${consumedCals - targetCals} kcal. Review your meals to manage your portion sizes.`,
          status: 'critical',
          metric: 'Today\'s Calories',
          value: `${consumedCals} / ${targetCals} kcal`,
          icon: '🍽️'
        });
      }

      // Protein insight
      const consumedProtein = n.consumed.protein;
      const targetProtein = n.targets.protein;
      
      if (consumedProtein >= targetProtein) {
        insights.push({
          id: 'protein-good',
          title: 'Protein Target Met',
          description: `Excellent work! You've logged ${consumedProtein}g of protein, hitting or exceeding your daily target of ${targetProtein}g. This supports muscle recovery and satiety.`,
          status: 'good',
          metric: 'Today\'s Protein',
          value: `${consumedProtein}g`,
          icon: '💪'
        });
      } else if (consumedProtein > 0) {
        insights.push({
          id: 'protein-improve',
          title: 'Increase Protein Consumption',
          description: `You've logged ${consumedProtein}g of protein today, which is short of your ${targetProtein}g goal. Try adding lean protein sources like chicken, lentils, paneer, or eggs to your next meal.`,
          status: 'improve',
          metric: 'Today\'s Protein',
          value: `${consumedProtein}g / ${targetProtein}g`,
          icon: '💪'
        });
      } else {
        insights.push({
          id: 'protein-critical',
          title: 'No Protein Logged Today',
          description: `You haven't logged any protein intake today. Meeting your target of ${targetProtein}g of protein is essential for cellular repair and maintaining metabolic health.`,
          status: 'critical',
          metric: 'Today\'s Protein',
          value: `0g / ${targetProtein}g`,
          icon: '💪'
        });
      }
    }

    // 6. Goals insight
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
    const total = 6;
    const done = () => {
      loaded++;
      if (loaded >= total) this.isLoading.set(false);
    };

    const todayStr = new Date().toLocaleDateString('en-CA');

    this.weightService.getWeightHistory().subscribe({ next: d => { this.weights.set(d); done(); }, error: () => done() });
    this.waterService.getWaterHistory().subscribe({ next: d => { this.waterLogs.set(d); done(); }, error: () => done() });
    this.sleepService.getSleepHistory().subscribe({ next: d => { this.sleepLogs.set(d); done(); }, error: () => done() });
    this.activityService.getActivityHistory().subscribe({ next: d => { this.activityLogs.set(d); done(); }, error: () => done() });
    this.goalService.getGoals().subscribe({ next: d => { this.goals.set(d); done(); }, error: () => done() });
    this.dietService.getNutritionToday(todayStr).subscribe({ next: d => { this.nutritionSummary.set(d); done(); }, error: () => done() });
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
