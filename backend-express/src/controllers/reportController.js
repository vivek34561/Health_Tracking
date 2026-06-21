const reportModel = require('../models/reportModel');

// Helper to convert database Date format to YYYY-MM-DD string
function formatDbDate(dbDate) {
  if (!dbDate) return null;
  if (dbDate instanceof Date) {
    const offset = dbDate.getTimezoneOffset();
    const localDate = new Date(dbDate.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  }
  if (typeof dbDate === 'string') {
    return dbDate.split('T')[0].split(' ')[0];
  }
  return dbDate;
}

// Helper to construct a contiguous array of YYYY-MM-DD strings between two dates
function getDateRangeArray(startDateStr, endDateStr) {
  const dates = [];
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const current = new Date(start);
  while (current <= end) {
    const offset = current.getTimezoneOffset();
    const localDate = new Date(current.getTime() - (offset * 60 * 1000));
    dates.push(localDate.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// Helper for title casing
function toTitleCase(str) {
  if (!str) return '';
  const lower = str.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

// Aggregation logic for a set number of days ending on a target date
async function getReportDataForPeriod(userId, days, endDateStr) {
  const end = new Date(endDateStr);
  const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  const startDateStr = start.toLocaleDateString('en-CA');

  // Query database in parallel for all metrics in the range
  const [waterData, sleepData, activityData, weightData] = await Promise.all([
    reportModel.getWaterRange(userId, startDateStr, endDateStr),
    reportModel.getSleepRange(userId, startDateStr, endDateStr),
    reportModel.getActivityRange(userId, startDateStr, endDateStr),
    reportModel.getWeightRange(userId, startDateStr, endDateStr)
  ]);

  // Construct lookup maps
  const waterMap = new Map();
  waterData.forEach(row => {
    waterMap.set(formatDbDate(row.date), parseInt(row.total, 10));
  });

  const sleepMap = new Map();
  sleepData.forEach(row => {
    sleepMap.set(formatDbDate(row.date), {
      hours: parseFloat(row.totalHours),
      quality: row.avgQuality ? parseFloat(row.avgQuality) : null
    });
  });

  const activityMap = new Map();
  activityData.forEach(row => {
    activityMap.set(formatDbDate(row.date), {
      count: parseInt(row.count, 10),
      duration: parseInt(row.totalDuration, 10),
      calories: parseInt(row.totalCalories, 10)
    });
  });

  const weightMap = new Map();
  weightData.forEach(row => {
    weightMap.set(formatDbDate(row.date), parseFloat(row.weight));
  });

  // Construct complete daily range records
  const dateList = getDateRangeArray(startDateStr, endDateStr);
  const dailyData = dateList.map(date => {
    const water = waterMap.get(date) || 0;
    const sleepInfo = sleepMap.get(date) || { hours: 0, quality: null };
    const activityInfo = activityMap.get(date) || { count: 0, duration: 0, calories: 0 };
    const weight = weightMap.get(date) !== undefined ? weightMap.get(date) : null;

    return {
      date,
      water,
      sleep: sleepInfo.hours,
      sleep_quality: sleepInfo.quality,
      weight,
      activity_count: activityInfo.count,
      activity_duration: activityInfo.duration,
      calories_burned: activityInfo.calories
    };
  });

  // Calculate summaries
  const sleepDays = dailyData.filter(d => d.sleep > 0);
  const avgSleep = sleepDays.length > 0
    ? parseFloat((sleepDays.reduce((sum, d) => sum + d.sleep, 0) / sleepDays.length).toFixed(1))
    : 0.0;

  const totalWater = dailyData.reduce((sum, d) => sum + d.water, 0);
  const avgWater = Math.round(totalWater / days);

  const totalWorkouts = dailyData.reduce((sum, d) => sum + d.activity_count, 0);

  // Weight change calculation (first/last records comparison, or baseline fallback)
  let weightChange = 0.0;
  const weightsInPeriod = weightData.map(w => parseFloat(w.weight));
  if (weightsInPeriod.length >= 2) {
    weightChange = parseFloat((weightsInPeriod[weightsInPeriod.length - 1] - weightsInPeriod[0]).toFixed(2));
  } else if (weightsInPeriod.length === 1) {
    const lastWeightBefore = await reportModel.getLatestWeightBefore(userId, startDateStr);
    if (lastWeightBefore !== null) {
      weightChange = parseFloat((weightsInPeriod[0] - lastWeightBefore).toFixed(2));
    }
  }

  return {
    avg_sleep: avgSleep,
    avg_water: avgWater,
    total_workouts: totalWorkouts,
    weight_change: weightChange,
    daily_data: dailyData
  };
}

/**
 * GET /api/reports/weekly
 */
async function getWeeklyReport(req, res) {
  try {
    const userId = req.user.id;
    let date = req.query.date;
    if (!date) {
      date = new Date().toLocaleDateString('en-CA');
    } else if (isNaN(Date.parse(date))) {
      return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const report = await getReportDataForPeriod(userId, 7, date);
    const allGoals = await reportModel.getAllGoalsProgress(userId);

    // Compute goalsCompleted for each day dynamically
    const days = report.daily_data.map(day => {
      let goalsCompleted = 0;
      const currentDay = new Date(day.date);
      for (const goal of allGoals) {
        const start = new Date(goal.startDate);
        const end = new Date(goal.endDate);
        if (currentDay >= start && currentDay <= end) {
          if (goal.goalType === 'WATER' && day.water >= goal.targetValue) {
            goalsCompleted++;
          } else if (goal.goalType === 'SLEEP' && day.sleep >= goal.targetValue) {
            goalsCompleted++;
          } else if (goal.goalType === 'WEIGHT' && day.weight !== null && day.weight <= goal.targetValue) {
            goalsCompleted++;
          } else if (goal.goalType === 'ACTIVITY' && day.activity_count >= 1) {
            goalsCompleted++;
          }
        }
      }
      return {
        date: day.date,
        water: day.water,
        sleep: day.sleep,
        weight: day.weight,
        activityCount: day.activity_count,
        goalsCompleted: goalsCompleted
      };
    });

    // Compute completion rate of active goals
    let goalsCompletionRate = 0;
    const activeGoals = allGoals.filter(g => g.status === 'ACTIVE' || (g.status === 'COMPLETED' && new Date(g.endDate) >= new Date(report.daily_data[0].date)));
    if (activeGoals.length > 0) {
      const sumPct = activeGoals.reduce((sum, g) => {
        const target = parseFloat(g.targetValue);
        const current = parseFloat(g.currentValue);
        if (target <= 0) return sum;
        return sum + Math.min(100, Math.max(0, (current / target) * 100));
      }, 0);
      goalsCompletionRate = Math.round(sumPct / activeGoals.length);
    }

    const startDateStr = report.daily_data[0].date;
    const endDateStr = report.daily_data[report.daily_data.length - 1].date;

    return res.status(200).json({
      // Test compatibility
      avg_sleep: report.avg_sleep,
      avg_water: report.avg_water,
      total_workouts: report.total_workouts,
      weight_change: report.weight_change,
      daily_data: report.daily_data,

      // Frontend compatibility
      week: `${startDateStr} to ${endDateStr}`,
      days: days,
      averages: {
        water: report.avg_water,
        sleep: report.avg_sleep,
        activityCount: parseFloat((report.total_workouts / 7).toFixed(1)),
        goalsCompletionRate: goalsCompletionRate
      }
    });
  } catch (error) {
    console.error('Get weekly report error:', error);
    return res.status(500).json({ success: false, message: 'An error occurred while generating weekly report.' });
  }
}

/**
 * GET /api/reports/monthly
 */
async function getMonthlyReport(req, res) {
  try {
    const userId = req.user.id;
    let date = req.query.date;
    if (!date) {
      date = new Date().toLocaleDateString('en-CA');
    } else if (isNaN(Date.parse(date))) {
      return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const report = await getReportDataForPeriod(userId, 30, date);
    const allGoals = await reportModel.getAllGoalsProgress(userId);

    // Compute completion rate of active goals
    let goalsCompletionRate = 0;
    const activeGoals = allGoals.filter(g => g.status === 'ACTIVE' || (g.status === 'COMPLETED' && new Date(g.endDate) >= new Date(report.daily_data[0].date)));
    if (activeGoals.length > 0) {
      const sumPct = activeGoals.reduce((sum, g) => {
        const target = parseFloat(g.targetValue);
        const current = parseFloat(g.currentValue);
        if (target <= 0) return sum;
        return sum + Math.min(100, Math.max(0, (current / target) * 100));
      }, 0);
      goalsCompletionRate = Math.round(sumPct / activeGoals.length);
    }

    // Health Score calculation
    const waterDays = report.daily_data.filter(d => d.water >= 2000).length;
    const waterPct = (waterDays / 30) * 100;

    const sleepDays = report.daily_data.filter(d => d.sleep >= 7).length;
    const sleepPct = (sleepDays / 30) * 100;

    const workoutCount = report.total_workouts;
    const activityPct = Math.min(100, (workoutCount / 12) * 100);

    const healthScore = Math.max(10, Math.min(100, Math.round((waterPct + sleepPct + activityPct + goalsCompletionRate) / 4)));

    // Extract month name
    const end = new Date(report.daily_data[report.daily_data.length - 1].date);
    const monthName = end.toLocaleString('default', { month: 'long', year: 'numeric' });

    // Calculate total water
    const totalWater = report.daily_data.reduce((sum, d) => sum + d.water, 0);

    return res.status(200).json({
      // Test compatibility
      avg_sleep: report.avg_sleep,
      avg_water: report.avg_water,
      total_workouts: report.total_workouts,
      weight_change: report.weight_change,
      daily_data: report.daily_data,

      // Frontend compatibility
      month: monthName,
      weeks: [],
      totals: {
        totalWater: totalWater,
        avgSleep: report.avg_sleep,
        totalActivities: report.total_workouts,
        weightChange: report.weight_change
      },
      healthScore: healthScore
    });
  } catch (error) {
    console.error('Get monthly report error:', error);
    return res.status(500).json({ success: false, message: 'An error occurred while generating monthly report.' });
  }
}

/**
 * GET /api/reports/progress
 */
async function getProgressReport(req, res) {
  try {
    const userId = req.user.id;
    let date = req.query.date;
    if (!date) {
      date = new Date().toLocaleDateString('en-CA');
    } else if (isNaN(Date.parse(date))) {
      return res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    // Fetch goals details and trends in parallel
    const [goalsCountRows, allGoals, past28DaysReport] = await Promise.all([
      reportModel.getGoalsCount(userId),
      reportModel.getAllGoalsProgress(userId),
      getReportDataForPeriod(userId, 28, date)
    ]);

    // Format goals count
    const goalsCount = { active: 0, completed: 0, failed: 0, total: 0 };
    goalsCountRows.forEach(row => {
      const status = row.status.toLowerCase();
      if (status === 'active') goalsCount.active = parseInt(row.count, 10);
      else if (status === 'completed') goalsCount.completed = parseInt(row.count, 10);
      else if (status === 'failed') goalsCount.failed = parseInt(row.count, 10);
    });
    goalsCount.total = goalsCount.active + goalsCount.completed + goalsCount.failed;

    // Format goals detail array
    const goalsList = allGoals.map(item => ({
      id: item.id,
      goal_type: toTitleCase(item.goalType),
      target_value: parseFloat(item.targetValue),
      current_value: parseFloat(item.currentValue),
      start_date: formatDbDate(item.startDate),
      end_date: formatDbDate(item.endDate),
      status: item.status,
      completion_percentage: item.targetValue > 0 ? Math.round(Math.min(100, (parseFloat(item.currentValue) / parseFloat(item.targetValue)) * 100)) : 0
    }));

    // Construct 4-week trends (Week 1 = oldest, Week 4 = most recent)
    const daily = past28DaysReport.daily_data;
    const weeklyTrends = [];
    for (let i = 0; i < 4; i++) {
      const startIndex = i * 7;
      const weekDays = daily.slice(startIndex, startIndex + 7);
      const weekStart = weekDays[0].date;
      const weekEnd = weekDays[weekDays.length - 1].date;

      const weekSleepDays = weekDays.filter(d => d.sleep > 0);
      const avgSleep = weekSleepDays.length > 0
        ? parseFloat((weekSleepDays.reduce((sum, d) => sum + d.sleep, 0) / weekSleepDays.length).toFixed(1))
        : 0.0;

      const totalWater = weekDays.reduce((sum, d) => sum + d.water, 0);
      const avgWater = Math.round(totalWater / 7);

      const totalWorkouts = weekDays.reduce((sum, d) => sum + d.activity_count, 0);

      const weightDays = weekDays.filter(d => d.weight !== null);
      const avgWeight = weightDays.length > 0
        ? parseFloat((weightDays.reduce((sum, d) => sum + d.weight, 0) / weightDays.length).toFixed(1))
        : null;

      weeklyTrends.push({
        week_number: 4 - i,
        week_start: weekStart,
        week_end: weekEnd,
        avg_sleep: avgSleep,
        avg_water: avgWater,
        total_workouts: totalWorkouts,
        avg_weight: avgWeight
      });
    }

    // Sort trends to display the most recent week first
    weeklyTrends.sort((a, b) => a.week_number - b.week_number);

    return res.status(200).json({
      // Test compatibility
      goals_summary: goalsCount,
      goals: goalsList,
      weekly_trends: weeklyTrends,

      // Frontend compatibility mapping
      weights: past28DaysReport.daily_data.filter(d => d.weight !== null).map(d => ({ date: d.date, weight: d.weight })),
      waterTrend: past28DaysReport.daily_data.map(d => ({ date: d.date, total: d.water })),
      sleepTrend: past28DaysReport.daily_data.map(d => ({ date: d.date, hours: d.sleep })),
      activityTrend: past28DaysReport.daily_data.map(d => ({ date: d.date, count: d.activity_count })),
      goalProgress: goalsList.filter(g => g.status === 'ACTIVE').map(g => ({
        type: g.goal_type,
        current: g.current_value,
        target: g.target_value
      }))
    });
  } catch (error) {
    console.error('Get progress report error:', error);
    return res.status(500).json({ success: false, message: 'An error occurred while generating progress analytics.' });
  }
}

module.exports = {
  getWeeklyReport,
  getMonthlyReport,
  getProgressReport
};
