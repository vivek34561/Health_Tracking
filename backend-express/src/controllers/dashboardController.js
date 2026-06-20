const dashboardModel = require('../models/dashboardModel');

/**
 * Get aggregated dashboard summary metrics for a user on a given date.
 */
async function getDashboardSummary(req, res) {
  try {
    const userId = req.user.id;

    // Use date query parameter if provided, otherwise default to today (YYYY-MM-DD local format)
    let date = req.query.date;
    if (!date) {
      date = new Date().toLocaleDateString('en-CA');
    } else {
      // Validate date parameter format
      if (isNaN(Date.parse(date))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Please use YYYY-MM-DD.'
        });
      }
    }

    // Fetch metrics in parallel
    const [
      waterConsumed,
      sleepHours,
      weightOnDate,
      profileWeight,
      activitiesToday,
      activeGoals
    ] = await Promise.all([
      dashboardModel.getDailyWater(userId, date),
      dashboardModel.getDailySleep(userId, date),
      dashboardModel.getWeightOnDate(userId, date),
      dashboardModel.getProfileWeight(userId),
      dashboardModel.getDailyActivityCount(userId, date),
      dashboardModel.getActiveGoals(userId, date)
    ]);

    // Use latest weight record, fallback to baseline weight from profile
    const currentWeight = weightOnDate !== null ? weightOnDate : (profileWeight !== null ? profileWeight : 0);

    // Calculate goal completion percentage across active goals
    let goalCompletion = 0;
    if (activeGoals.length > 0) {
      const sum = activeGoals.reduce((acc, goal) => {
        const target = parseFloat(goal.targetValue);
        const current = parseFloat(goal.currentValue);
        if (target <= 0) return acc;
        const pct = (current / target) * 100;
        return acc + Math.min(100, Math.max(0, pct));
      }, 0);
      goalCompletion = Math.round(sum / activeGoals.length);
    }

    // Return merged responses satisfying both user specification and database design API specs
    return res.status(200).json({
      water: waterConsumed,
      sleep: sleepHours,
      weight: currentWeight,
      current_weight: currentWeight,
      water_consumed: waterConsumed,
      sleep_hours: sleepHours,
      activities_today: activitiesToday,
      goal_completion: goalCompletion
    });

  } catch (error) {
    console.error('Get dashboard summary error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving the dashboard summary.'
    });
  }
}

module.exports = {
  getDashboardSummary
};
