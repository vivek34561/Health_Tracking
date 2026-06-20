const dashboardModel = require('../models/dashboardModel');

/**
 * Get dashboard summary metrics for the authenticated user
 */
async function getDashboardSummary(req, res) {
  try {
    const userId = req.user.id;

    // Fetch all required data in parallel
    const [
      weightLogs,
      profileWeight,
      waterToday,
      sleepStats,
      activityStats,
      goalsSummary
    ] = await Promise.all([
      dashboardModel.getLatestWeightLogs(userId),
      dashboardModel.getProfileWeight(userId),
      dashboardModel.getWaterToday(userId),
      dashboardModel.getSleepStats(userId),
      dashboardModel.getActivitiesToday(userId),
      dashboardModel.getGoalsSummary(userId)
    ]);

    // Calculate weight metrics
    let currentWeight = null;
    let weightChange = null;

    if (weightLogs.length > 0) {
      currentWeight = Number(weightLogs[0].weight);
      if (weightLogs.length > 1) {
        weightChange = currentWeight - Number(weightLogs[1].weight);
      } else if (profileWeight) {
        weightChange = currentWeight - Number(profileWeight);
      }
    } else if (profileWeight) {
      currentWeight = Number(profileWeight);
    }

    // Calculate goals metrics
    const activeGoals = goalsSummary.ACTIVE;
    const completedGoals = goalsSummary.COMPLETED;
    const failedGoals = goalsSummary.FAILED;
    const totalGoals = activeGoals + completedGoals + failedGoals;
    const goalCompletion = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

    return res.status(200).json({
      success: true,
      current_weight: currentWeight,
      weight_change: weightChange !== null ? Math.round(weightChange * 100) / 100 : null,
      water_consumed: waterToday,
      sleep_hours: sleepStats.avgHours,
      sleep_quality: sleepStats.avgQuality,
      activities_today: activityStats.count,
      calories_burned_today: activityStats.calories,
      active_goals: activeGoals,
      completed_goals: completedGoals,
      failed_goals: failedGoals,
      goal_completion: goalCompletion
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching the dashboard summary.'
    });
  }
}

module.exports = {
  getDashboardSummary
};
