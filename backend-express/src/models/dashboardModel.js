const db = require('../config/db');

/**
 * Get the 2 most recent weight logs for a user
 */
async function getLatestWeightLogs(userId) {
  const [rows] = await db.execute(
    'SELECT weight_kg AS weight, recorded_at AS recordedAt FROM weight_logs WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 2',
    [userId]
  );
  return rows;
}

/**
 * Get profile weight for a user
 */
async function getProfileWeight(userId) {
  const [rows] = await db.execute(
    'SELECT current_weight_kg AS currentWeight FROM profiles WHERE user_id = ? LIMIT 1',
    [userId]
  );
  return rows[0] ? rows[0].currentWeight : null;
}

/**
 * Get total water consumed today
 */
async function getWaterToday(userId) {
  const [rows] = await db.execute(
    'SELECT SUM(amount_ml) AS total FROM water_logs WHERE user_id = ? AND DATE(consumed_at) = CURDATE()',
    [userId]
  );
  return rows[0] && rows[0].total ? Number(rows[0].total) : 0;
}

/**
 * Get sleep average hours and quality (last 7 days, fallback to all-time, fallback to 0)
 */
async function getSleepStats(userId) {
  // Try 7 days first
  const [rows7] = await db.execute(
    'SELECT AVG(total_hours) AS avgHours, AVG(quality_score) AS avgQuality FROM sleep_logs WHERE user_id = ? AND sleep_start >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)',
    [userId]
  );
  
  if (rows7[0] && rows7[0].avgHours !== null) {
    return {
      avgHours: Math.round(Number(rows7[0].avgHours) * 10) / 10,
      avgQuality: Math.round(Number(rows7[0].avgQuality) * 10) / 10
    };
  }

  // Fallback to all-time
  const [rowsAll] = await db.execute(
    'SELECT AVG(total_hours) AS avgHours, AVG(quality_score) AS avgQuality FROM sleep_logs WHERE user_id = ?',
    [userId]
  );

  if (rowsAll[0] && rowsAll[0].avgHours !== null) {
    return {
      avgHours: Math.round(Number(rowsAll[0].avgHours) * 10) / 10,
      avgQuality: Math.round(Number(rowsAll[0].avgQuality) * 10) / 10
    };
  }

  return { avgHours: 0, avgQuality: 0 };
}

/**
 * Get today's activities count and total calories burned
 */
async function getActivitiesToday(userId) {
  const [rows] = await db.execute(
    'SELECT COUNT(*) AS count, SUM(calories_burned) AS calories FROM activity_logs WHERE user_id = ? AND activity_date = CURDATE()',
    [userId]
  );
  return {
    count: rows[0] ? Number(rows[0].count) : 0,
    calories: rows[0] && rows[0].calories ? Number(rows[0].calories) : 0
  };
}

/**
 * Get goals grouped by status
 */
async function getGoalsSummary(userId) {
  const [rows] = await db.execute(
    'SELECT status, COUNT(*) AS count FROM goals WHERE user_id = ? GROUP BY status',
    [userId]
  );
  
  const summary = { ACTIVE: 0, COMPLETED: 0, FAILED: 0 };
  rows.forEach(row => {
    if (row.status in summary) {
      summary[row.status] = Number(row.count);
    }
  });
  return summary;
}

module.exports = {
  getLatestWeightLogs,
  getProfileWeight,
  getWaterToday,
  getSleepStats,
  getActivitiesToday,
  getGoalsSummary
};
