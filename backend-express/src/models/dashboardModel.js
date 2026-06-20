const db = require('../config/db');

/**
 * Get total water consumed on a specific date
 */
async function getDailyWater(userId, date) {
  const [rows] = await db.execute(
    'SELECT SUM(amount_ml) AS total FROM water_logs WHERE user_id = ? AND DATE(consumed_at) = ?',
    [userId, date]
  );
  return rows[0] && rows[0].total ? parseInt(rows[0].total, 10) : 0;
}

/**
 * Get total sleep hours on a specific date (based on sleep end date)
 */
async function getDailySleep(userId, date) {
  const [rows] = await db.execute(
    'SELECT SUM(total_hours) AS total FROM sleep_logs WHERE user_id = ? AND DATE(sleep_end) = ?',
    [userId, date]
  );
  return rows[0] && rows[0].total ? parseFloat(rows[0].total) : 0.0;
}

/**
 * Get weight recorded on or before a specific date
 */
async function getWeightOnDate(userId, date) {
  const [rows] = await db.execute(
    'SELECT weight_kg AS weight FROM weight_logs WHERE user_id = ? AND DATE(recorded_at) <= ? ORDER BY recorded_at DESC, id DESC LIMIT 1',
    [userId, date]
  );
  return rows[0] ? parseFloat(rows[0].weight) : null;
}

/**
 * Get user profile weight as a baseline fallback
 */
async function getProfileWeight(userId) {
  const [rows] = await db.execute(
    'SELECT current_weight_kg AS weight FROM profiles WHERE user_id = ?',
    [userId]
  );
  return rows[0] ? parseFloat(rows[0].weight) : null;
}

/**
 * Get activity count logged on a specific date
 */
async function getDailyActivityCount(userId, date) {
  const [rows] = await db.execute(
    'SELECT COUNT(*) AS count FROM activity_logs WHERE user_id = ? AND activity_date = ?',
    [userId, date]
  );
  return rows[0] ? parseInt(rows[0].count, 10) : 0;
}

/**
 * Get active goals for a user on a specific date range
 */
async function getActiveGoals(userId, date) {
  const [rows] = await db.execute(
    'SELECT target_value AS targetValue, current_value AS currentValue FROM goals WHERE user_id = ? AND status = "ACTIVE" AND ? BETWEEN start_date AND end_date',
    [userId, date]
  );
  return rows;
}

module.exports = {
  getDailyWater,
  getDailySleep,
  getWeightOnDate,
  getProfileWeight,
  getDailyActivityCount,
  getActiveGoals
};
