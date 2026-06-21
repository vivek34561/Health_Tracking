const goalModel = require('../models/goalModel');

// Title case helper
function toTitleCase(str) {
  if (!str) return '';
  const lower = str.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

// Enums
const ALLOWED_GOAL_TYPES = ['WEIGHT', 'WATER', 'SLEEP', 'ACTIVITY', 'STEPS'];
const ALLOWED_STATUSES = ['ACTIVE', 'COMPLETED', 'FAILED'];

/**
 * Add a new goal
 */
async function addGoal(req, res) {
  try {
    const { goal_type, target_value, current_value, start_date, end_date, status } = req.body;
    const userId = req.user.id;

    if (!goal_type || target_value === undefined || target_value === null) {
      return res.status(400).json({
        success: false,
        message: 'goal_type and target_value are required.'
      });
    }

    const typeUpper = goal_type.toUpperCase();
    if (!ALLOWED_GOAL_TYPES.includes(typeUpper)) {
      return res.status(400).json({
        success: false,
        message: `Invalid goal_type. Allowed: ${ALLOWED_GOAL_TYPES.join(', ')}`
      });
    }

    const target = parseFloat(target_value);
    if (isNaN(target) || target <= 0) {
      return res.status(400).json({
        success: false,
        message: 'target_value must be a positive number.'
      });
    }

    let currentVal = 0.0;
    if (current_value !== undefined && current_value !== null) {
      currentVal = parseFloat(current_value);
      if (isNaN(currentVal) || currentVal < 0) {
        return res.status(400).json({
          success: false,
          message: 'current_value must be a non-negative number.'
        });
      }
    }

    if (start_date && isNaN(Date.parse(start_date))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start_date format.'
      });
    }

    if (end_date && isNaN(Date.parse(end_date))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid end_date format.'
      });
    }

    if (start_date && end_date && new Date(end_date) < new Date(start_date)) {
      return res.status(400).json({
        success: false,
        message: 'end_date must be greater than or equal to start_date.'
      });
    }

    let goalStatus = 'ACTIVE';
    if (status) {
      const statusUpper = status.toUpperCase();
      if (!ALLOWED_STATUSES.includes(statusUpper)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}`
        });
      }
      goalStatus = statusUpper;
    }

    const recordId = await goalModel.create(userId, {
      goalType: typeUpper,
      targetValue: target,
      currentValue: currentVal,
      startDate: start_date,
      endDate: end_date,
      status: goalStatus
    });

    await goalModel.syncGoalProgress(userId, typeUpper);

    return res.status(201).json({
      success: true,
      message: 'Goal created successfully',
      id: recordId
    });
  } catch (error) {
    console.error('Add goal error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while creating goal.'
    });
  }
}

/**
 * Get goals history
 */
async function getGoals(req, res) {
  try {
    const userId = req.user.id;
    
    // Sync all active goals progress before fetching history
    await goalModel.syncGoalProgress(userId, 'WATER');
    await goalModel.syncGoalProgress(userId, 'SLEEP');
    await goalModel.syncGoalProgress(userId, 'WEIGHT');
    await goalModel.syncGoalProgress(userId, 'ACTIVITY');

    const history = await goalModel.getHistory(userId);

    const formatted = history.map(item => ({
      id: item.id,
      goal_type: toTitleCase(item.goalType),
      target_value: parseFloat(item.targetValue),
      current_value: parseFloat(item.currentValue),
      start_date: item.startDate,
      end_date: item.endDate,
      status: item.status
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error('Get goals error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching goals.'
    });
  }
}

/**
 * Update an existing goal progress
 */
async function updateGoal(req, res) {
  try {
    const recordId = req.params.id;
    const userId = req.user.id;
    const { goal_type, target_value, current_value, start_date, end_date, status } = req.body;

    const updates = {};

    if (goal_type) {
      const typeUpper = goal_type.toUpperCase();
      if (!ALLOWED_GOAL_TYPES.includes(typeUpper)) {
        return res.status(400).json({
          success: false,
          message: `Invalid goal_type. Allowed: ${ALLOWED_GOAL_TYPES.join(', ')}`
        });
      }
      updates.goalType = typeUpper;
    }

    if (target_value !== undefined && target_value !== null) {
      const target = parseFloat(target_value);
      if (isNaN(target) || target <= 0) {
        return res.status(400).json({
          success: false,
          message: 'target_value must be a positive number.'
        });
      }
      updates.targetValue = target;
    }

    if (current_value !== undefined && current_value !== null) {
      const currentVal = parseFloat(current_value);
      if (isNaN(currentVal) || currentVal < 0) {
        return res.status(400).json({
          success: false,
          message: 'current_value must be a non-negative number.'
        });
      }
      updates.currentValue = currentVal;
    }

    if (start_date) {
      if (isNaN(Date.parse(start_date))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid start_date format.'
        });
      }
      updates.startDate = start_date;
    }

    if (end_date) {
      if (isNaN(Date.parse(end_date))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid end_date format.'
        });
      }
      updates.endDate = end_date;
    }

    if (status) {
      const statusUpper = status.toUpperCase();
      if (!ALLOWED_STATUSES.includes(statusUpper)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}`
        });
      }
      updates.status = statusUpper;
    }

    const updated = await goalModel.update(userId, recordId, updates);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Goal record not found or not owned by user.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Goal updated successfully'
    });
  } catch (error) {
    console.error('Update goal error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while updating goal.'
    });
  }
}

/**
 * Delete a goal
 */
async function deleteGoal(req, res) {
  try {
    const recordId = req.params.id;
    const userId = req.user.id;

    const deleted = await goalModel.delete(userId, recordId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Goal record not found or not owned by user.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Goal deleted successfully'
    });
  } catch (error) {
    console.error('Delete goal error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while deleting the goal.'
    });
  }
}

module.exports = {
  addGoal,
  getGoals,
  updateGoal,
  deleteGoal
};
