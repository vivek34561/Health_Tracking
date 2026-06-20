const activityModel = require('../models/activityModel');

// Title case helper
function toTitleCase(str) {
  if (!str) return '';
  const lower = str.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

// Allowed types (case-insensitive checks)
const ALLOWED_TYPES = ['WALKING', 'RUNNING', 'CYCLING', 'GYM', 'YOGA', 'OTHER'];

/**
 * Add a new activity record
 */
async function addActivity(req, res) {
  try {
    const { activity_type, duration, calories_burned, distance_km, activity_date } = req.body;
    const userId = req.user.id;

    if (!activity_type || duration === undefined || duration === null) {
      return res.status(400).json({
        success: false,
        message: 'activity_type and duration are required.'
      });
    }

    const typeUpper = activity_type.toUpperCase();
    if (!ALLOWED_TYPES.includes(typeUpper)) {
      return res.status(400).json({
        success: false,
        message: `Invalid activity_type. Allowed: ${ALLOWED_TYPES.join(', ')}`
      });
    }

    const dur = parseInt(duration, 10);
    if (isNaN(dur) || dur <= 0) {
      return res.status(400).json({
        success: false,
        message: 'duration must be a positive integer.'
      });
    }

    let calories = 0;
    if (calories_burned !== undefined && calories_burned !== null) {
      calories = parseInt(calories_burned, 10);
      if (isNaN(calories) || calories < 0) {
        return res.status(400).json({
          success: false,
          message: 'calories_burned must be a non-negative integer.'
        });
      }
    }

    let distance = 0.0;
    if (distance_km !== undefined && distance_km !== null) {
      distance = parseFloat(distance_km);
      if (isNaN(distance) || distance < 0) {
        return res.status(400).json({
          success: false,
          message: 'distance_km must be a non-negative number.'
        });
      }
    }

    if (activity_date && isNaN(Date.parse(activity_date))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid activity_date format.'
      });
    }

    const recordId = await activityModel.create(userId, {
      activityType: typeUpper,
      durationMinutes: dur,
      caloriesBurned: calories,
      distanceKm: distance,
      activityDate: activity_date
    });

    return res.status(201).json({
      success: true,
      message: 'Activity recorded successfully',
      id: recordId
    });
  } catch (error) {
    console.error('Add activity error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while logging activity.'
    });
  }
}

/**
 * Get activity history
 */
async function getActivityHistory(req, res) {
  try {
    const userId = req.user.id;
    const history = await activityModel.getHistory(userId);
    
    // Format enums for response readability
    const formatted = history.map(item => ({
      id: item.id,
      activity_type: toTitleCase(item.activityType),
      duration: item.duration,
      calories_burned: item.caloriesBurned,
      distance_km: item.distance !== null ? parseFloat(item.distance) : 0,
      activity_date: item.activityDate
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error('Get activity history error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching activity history.'
    });
  }
}

/**
 * Update activity log
 */
async function updateActivity(req, res) {
  try {
    const recordId = req.params.id;
    const userId = req.user.id;
    const { activity_type, duration, calories_burned, distance_km, activity_date } = req.body;

    if (!activity_type || duration === undefined || duration === null) {
      return res.status(400).json({
        success: false,
        message: 'activity_type and duration are required.'
      });
    }

    const typeUpper = activity_type.toUpperCase();
    if (!ALLOWED_TYPES.includes(typeUpper)) {
      return res.status(400).json({
        success: false,
        message: `Invalid activity_type. Allowed: ${ALLOWED_TYPES.join(', ')}`
      });
    }

    const dur = parseInt(duration, 10);
    if (isNaN(dur) || dur <= 0) {
      return res.status(400).json({
        success: false,
        message: 'duration must be a positive integer.'
      });
    }

    let calories = 0;
    if (calories_burned !== undefined && calories_burned !== null) {
      calories = parseInt(calories_burned, 10);
      if (isNaN(calories) || calories < 0) {
        return res.status(400).json({
          success: false,
          message: 'calories_burned must be a non-negative integer.'
        });
      }
    }

    let distance = 0.0;
    if (distance_km !== undefined && distance_km !== null) {
      distance = parseFloat(distance_km);
      if (isNaN(distance) || distance < 0) {
        return res.status(400).json({
          success: false,
          message: 'distance_km must be a non-negative number.'
        });
      }
    }

    if (activity_date && isNaN(Date.parse(activity_date))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid activity_date format.'
      });
    }

    const updated = await activityModel.update(userId, recordId, {
      activityType: typeUpper,
      durationMinutes: dur,
      caloriesBurned: calories,
      distanceKm: distance,
      activityDate: activity_date
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Activity log record not found or not owned by user.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Activity record updated successfully'
    });
  } catch (error) {
    console.error('Update activity error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while updating the activity record.'
    });
  }
}

/**
 * Delete activity log
 */
async function deleteActivity(req, res) {
  try {
    const recordId = req.params.id;
    const userId = req.user.id;

    const deleted = await activityModel.delete(userId, recordId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Activity record not found or not owned by user.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Activity record deleted successfully'
    });
  } catch (error) {
    console.error('Delete activity error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while deleting the activity record.'
    });
  }
}

module.exports = {
  addActivity,
  getActivityHistory,
  updateActivity,
  deleteActivity
};
