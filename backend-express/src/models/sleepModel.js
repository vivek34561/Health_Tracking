const db = require('../config/db');

/**
 * Create a new sleep record
 */
async function create(userId, sleepStart, sleepEnd, totalHours, qualityScore) {
  const [result] = await db.execute(
    'INSERT INTO sleep_logs (user_id, sleep_start, sleep_end, total_hours, quality_score) VALUES (?, ?, ?, ?, ?)',
    [userId, new Date(sleepStart), new Date(sleepEnd), totalHours, qualityScore !== undefined ? qualityScore : null]
  );
  return result.insertId;
}

/**
 * Get sleep logs for a user (most recent first)
 */
async function getHistory(userId) {
  const [rows] = await db.execute(
    'SELECT id, sleep_start AS sleepStart, sleep_end AS sleepEnd, total_hours AS totalHours, quality_score AS qualityScore FROM sleep_logs WHERE user_id = ? ORDER BY sleep_start DESC',
    [userId]
  );
  return rows;
}

/**
 * Update an existing sleep record
 */
async function update(userId, recordId, sleepStart, sleepEnd, totalHours, qualityScore) {
  const [result] = await db.execute(
    'UPDATE sleep_logs SET sleep_start = ?, sleep_end = ?, total_hours = ?, quality_score = ? WHERE id = ? AND user_id = ?',
    [new Date(sleepStart), new Date(sleepEnd), totalHours, qualityScore !== undefined ? qualityScore : null, recordId, userId]
  );
  return result.affectedRows > 0;
}

/**
 * Delete a sleep record
 */
async function deleteRecord(userId, recordId) {
  const [result] = await db.execute(
    'DELETE FROM sleep_logs WHERE id = ? AND user_id = ?',
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
