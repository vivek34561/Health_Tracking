const db = require('../config/db');

/**
 * Create a new weight record
 */
async function create(userId, weightKg, recordedAt) {
  const date = recordedAt ? new Date(recordedAt) : new Date();
  const [result] = await db.execute(
    'INSERT INTO weight_logs (user_id, weight_kg, recorded_at) VALUES (?, ?, ?)',
    [userId, weightKg, date]
  );
  return result.insertId;
}

/**
 * Get weight history for a user
 */
async function getHistory(userId) {
  const [rows] = await db.execute(
    'SELECT id, weight_kg AS weight, recorded_at AS recordedAt FROM weight_logs WHERE user_id = ? ORDER BY recorded_at DESC',
    [userId]
  );
  return rows;
}

/**
 * Update a weight record
 */
async function update(userId, recordId, weightKg, recordedAt) {
  const date = recordedAt ? new Date(recordedAt) : new Date();
  const [result] = await db.execute(
    'UPDATE weight_logs SET weight_kg = ?, recorded_at = ? WHERE id = ? AND user_id = ?',
    [weightKg, date, recordId, userId]
  );
  return result.affectedRows > 0;
}

/**
 * Delete a weight record
 */
async function deleteRecord(userId, recordId) {
  const [result] = await db.execute(
    'DELETE FROM weight_logs WHERE id = ? AND user_id = ?',
    [recordId, userId]
  );
  return result.affectedRows > 0;
}

/**
 * Get the latest weight log for a user
 */
async function getLatestWeight(userId) {
  const [rows] = await db.execute(
    'SELECT weight_kg AS weight FROM weight_logs WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 1',
    [userId]
  );
  return rows[0] ? rows[0].weight : null;
}

module.exports = {
  create,
  getHistory,
  update,
  delete: deleteRecord,
  getLatestWeight
};
