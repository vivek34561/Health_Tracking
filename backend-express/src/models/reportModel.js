const db = require('../config/db');

/**
 * Get daily aggregated water intake logs in a date range
 */
async function getWaterRange(userId, startDate, endDate) {
  const [rows] = await db.execute(
    'SELECT DATE(consumed_at) AS date, SUM(amount_ml) AS total FROM water_logs WHERE user_id = ? AND DATE(consumed_at) BETWEEN ? AND ? GROUP BY DATE(consumed_at)',
    [userId, startDate, endDate]
  );
  return rows;
}

/**
 * Get daily aggregated sleep hours and quality in a date range
 */
async function getSleepRange(userId, startDate, endDate) {
  const [rows] = await db.execute(
    'SELECT DATE(sleep_end) AS date, SUM(total_hours) AS totalHours, AVG(quality_score) AS avgQuality FROM sleep_logs WHERE user_id = ? AND DATE(sleep_end) BETWEEN ? AND ? GROUP BY DATE(sleep_end)',
    [userId, startDate, endDate]
  );
  return rows;
}

/**
 * Get daily aggregated activity duration and calories in a date range
 */
async function getActivityRange(userId, startDate, endDate) {
  const [rows] = await db.execute(
    'SELECT activity_date AS date, COUNT(*) AS count, SUM(duration_minutes) AS totalDuration, SUM(calories_burned) AS totalCalories FROM activity_logs WHERE user_id = ? AND activity_date BETWEEN ? AND ? GROUP BY activity_date',
    [userId, startDate, endDate]
  );
  return rows;
}

/**
 * Get daily averaged weight records in a date range
 */
async function getWeightRange(userId, startDate, endDate) {
  const [rows] = await db.execute(
    'SELECT DATE(recorded_at) AS date, AVG(weight_kg) AS weight FROM weight_logs WHERE user_id = ? AND DATE(recorded_at) BETWEEN ? AND ? GROUP BY DATE(recorded_at) ORDER BY date ASC',
    [userId, startDate, endDate]
  );
  return rows;
}

/**
 * Get the latest weight logged before a specific date
 */
async function getLatestWeightBefore(userId, date) {
  const [rows] = await db.execute(
    'SELECT weight_kg AS weight FROM weight_logs WHERE user_id = ? AND DATE(recorded_at) < ? ORDER BY recorded_at DESC, id DESC LIMIT 1',
    [userId, date]
  );
  return rows[0] ? parseFloat(rows[0].weight) : null;
}

/**
 * Get count of goals grouped by status (ACTIVE, COMPLETED, FAILED)
 */
async function getGoalsCount(userId) {
  const [rows] = await db.execute(
    'SELECT status, COUNT(*) AS count FROM goals WHERE user_id = ? GROUP BY status',
    [userId]
  );
  return rows;
}

/**
 * Get all goals to compute progress details
 */
async function getAllGoalsProgress(userId) {
  const [rows] = await db.execute(
    'SELECT id, goal_type AS goalType, target_value AS targetValue, current_value AS currentValue, start_date AS startDate, end_date AS endDate, status FROM goals WHERE user_id = ? ORDER BY start_date DESC',
    [userId]
  );
  return rows;
}

module.exports = {
  getWaterRange,
  getSleepRange,
  getActivityRange,
  getWeightRange,
  getLatestWeightBefore,
  getGoalsCount,
  getAllGoalsProgress
};
