const db = require('../config/db');

/**
 * Create a new activity log
 */
async function create(userId, { activityType, durationMinutes, caloriesBurned, distanceKm, activityDate }) {
  // Default activityDate to today if not provided
  const date = activityDate ? new Date(activityDate) : new Date();
  
  const [result] = await db.execute(
    'INSERT INTO activity_logs (user_id, activity_type, duration_minutes, calories_burned, distance_km, activity_date) VALUES (?, ?, ?, ?, ?, ?)',
    [
      userId,
      activityType.toUpperCase(),
      durationMinutes,
      caloriesBurned !== undefined ? caloriesBurned : 0,
      distanceKm !== undefined ? distanceKm : 0.0,
      date
    ]
  );
  return result.insertId;
}

/**
 * Get activity logs for a user (most recent first)
 */
async function getHistory(userId) {
  const [rows] = await db.execute(
    'SELECT id, activity_type AS activityType, duration_minutes AS duration, calories_burned AS caloriesBurned, distance_km AS distance, activity_date AS activityDate FROM activity_logs WHERE user_id = ? ORDER BY activity_date DESC, id DESC',
    [userId]
  );
  return rows;
}

/**
 * Update an existing activity log
 */
async function update(userId, recordId, { activityType, durationMinutes, caloriesBurned, distanceKm, activityDate }) {
  const date = activityDate ? new Date(activityDate) : new Date();
  
  const [result] = await db.execute(
    'UPDATE activity_logs SET activity_type = ?, duration_minutes = ?, calories_burned = ?, distance_km = ?, activity_date = ? WHERE id = ? AND user_id = ?',
    [
      activityType.toUpperCase(),
      durationMinutes,
      caloriesBurned !== undefined ? caloriesBurned : 0,
      distanceKm !== undefined ? distanceKm : 0.0,
      date,
      recordId,
      userId
    ]
  );
  return result.affectedRows > 0;
}

/**
 * Delete an activity log
 */
async function deleteRecord(userId, recordId) {
  const [result] = await db.execute(
    'DELETE FROM activity_logs WHERE id = ? AND user_id = ?',
    [recordId, userId]
  );
  return result.affectedRows > 0;
}

module.exports = {
  create,
  getHistory,
  update,
  delete: deleteRecord
};
