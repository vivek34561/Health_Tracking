const db = require('../config/db');

/**
 * Create a new water intake record
 */
async function create(userId, amountMl, consumedAt) {
  const date = consumedAt ? new Date(consumedAt) : new Date();
  const [result] = await db.execute(
    'INSERT INTO water_logs (user_id, amount_ml, consumed_at) VALUES (?, ?, ?)',
    [userId, amountMl, date]
  );
  return result.insertId;
}

/**
 * Get water logs for a user (most recent first)
 */
async function getHistory(userId) {
  const [rows] = await db.execute(
    'SELECT id, amount_ml AS amountMl, consumed_at AS consumedAt FROM water_logs WHERE user_id = ? ORDER BY consumed_at DESC',
    [userId]
  );
  return rows;
}

/**
 * Update an existing water log record
 */
async function update(userId, recordId, amountMl, consumedAt) {
  const date = consumedAt ? new Date(consumedAt) : null;
  const query = date
    ? 'UPDATE water_logs SET amount_ml = ?, consumed_at = ? WHERE id = ? AND user_id = ?'
    : 'UPDATE water_logs SET amount_ml = ? WHERE id = ? AND user_id = ?';
  const params = date
    ? [amountMl, date, recordId, userId]
    : [amountMl, recordId, userId];
  const [result] = await db.execute(query, params);
  return result.affectedRows > 0;
}

/**
 * Delete a water log record
 */
async function deleteRecord(userId, recordId) {
  const [result] = await db.execute(
    'DELETE FROM water_logs WHERE id = ? AND user_id = ?',
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
