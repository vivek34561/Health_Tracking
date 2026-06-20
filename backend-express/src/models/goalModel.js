const db = require('../config/db');

/**
 * Create a new goal
 */
async function create(userId, { goalType, targetValue, currentValue, startDate, endDate, status }) {
  const start = startDate ? new Date(startDate) : new Date();
  // Default end date to 30 days from start if not specified
  const end = endDate ? new Date(endDate) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
  const currentVal = currentValue !== undefined ? currentValue : 0.0;
  const currentStatus = status || 'ACTIVE';

  const [result] = await db.execute(
    'INSERT INTO goals (user_id, goal_type, target_value, current_value, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      userId,
      goalType.toUpperCase(),
      targetValue,
      currentVal,
      start,
      end,
      currentStatus.toUpperCase()
    ]
  );
  return result.insertId;
}

/**
 * Get goals for a user (most recent first)
 */
async function getHistory(userId) {
  const [rows] = await db.execute(
    'SELECT id, goal_type AS goalType, target_value AS targetValue, current_value AS currentValue, start_date AS startDate, end_date AS endDate, status FROM goals WHERE user_id = ? ORDER BY start_date DESC, id DESC',
    [userId]
  );
  return rows;
}

/**
 * Update an existing goal (targets, progress, status, and dates)
 */
async function update(userId, recordId, { goalType, targetValue, currentValue, startDate, endDate, status }) {
  const connection = await db.getConnection();
  try {
    // Retrieve original values for values not specified in update body
    const [rows] = await connection.execute(
      'SELECT goal_type, target_value, current_value, start_date, end_date, status FROM goals WHERE id = ? AND user_id = ?',
      [recordId, userId]
    );
    if (rows.length === 0) return false;

    const original = rows[0];

    const type = goalType ? goalType.toUpperCase() : original.goal_type;
    const target = targetValue !== undefined ? targetValue : original.target_value;
    const currentVal = currentValue !== undefined ? currentValue : original.current_value;
    const start = startDate ? new Date(startDate) : original.start_date;
    const end = endDate ? new Date(endDate) : original.end_date;
    const goalStatus = status ? status.toUpperCase() : original.status;

    const [result] = await connection.execute(
      'UPDATE goals SET goal_type = ?, target_value = ?, current_value = ?, start_date = ?, end_date = ?, status = ? WHERE id = ? AND user_id = ?',
      [type, target, currentVal, start, end, goalStatus, recordId, userId]
    );
    return result.affectedRows > 0;
  } finally {
    connection.release();
  }
}

/**
 * Delete a goal
 */
async function deleteRecord(userId, recordId) {
  const [result] = await db.execute(
    'DELETE FROM goals WHERE id = ? AND user_id = ?',
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
