const weightModel = require('../models/weightModel');
const goalModel = require('../models/goalModel');

/**
 * Add a new weight record
 */
async function addWeight(req, res) {
  try {
    const { weight, recordedAt } = req.body;
    const userId = req.user.id;

    if (weight === undefined || weight === null) {
      return res.status(400).json({
        success: false,
        message: 'Weight is required.'
      });
    }

    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Weight must be a positive number.'
      });
    }

    // Optional date format verification if passed
    if (recordedAt && isNaN(Date.parse(recordedAt))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format.'
      });
    }

    const recordId = await weightModel.create(userId, weightNum, recordedAt);
    await goalModel.syncGoalProgress(userId, 'WEIGHT');
    return res.status(201).json({
      success: true,
      message: 'Weight recorded successfully',
      id: recordId
    });
  } catch (error) {
    console.error('Add weight error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while adding the weight record.'
    });
  }
}

/**
 * Get weight history
 */
async function getWeightHistory(req, res) {
  try {
    const userId = req.user.id;
    const history = await weightModel.getHistory(userId);
    return res.status(200).json(history);
  } catch (error) {
    console.error('Get weight history error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving weight history.'
    });
  }
}

/**
 * Update weight record
 */
async function updateWeight(req, res) {
  try {
    const recordId = req.params.id;
    const userId = req.user.id;
    const { weight, recordedAt } = req.body;

    if (weight === undefined || weight === null) {
      return res.status(400).json({
        success: false,
        message: 'Weight is required.'
      });
    }

    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Weight must be a positive number.'
      });
    }

    if (recordedAt && isNaN(Date.parse(recordedAt))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format.'
      });
    }

    const updated = await weightModel.update(userId, recordId, weightNum, recordedAt);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Weight record not found or not owned by user.'
      });
    }

    await goalModel.syncGoalProgress(userId, 'WEIGHT');

    return res.status(200).json({
      success: true,
      message: 'Weight record updated successfully'
    });
  } catch (error) {
    console.error('Update weight error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while updating the weight record.'
    });
  }
}

/**
 * Delete weight record
 */
async function deleteWeight(req, res) {
  try {
    const recordId = req.params.id;
    const userId = req.user.id;

    const deleted = await weightModel.delete(userId, recordId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Weight record not found or not owned by user.'
      });
    }

    await goalModel.syncGoalProgress(userId, 'WEIGHT');

    return res.status(200).json({
      success: true,
      message: 'Weight record deleted successfully'
    });
  } catch (error) {
    console.error('Delete weight error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while deleting the weight record.'
    });
  }
}

module.exports = {
  addWeight,
  getWeightHistory,
  updateWeight,
  deleteWeight
};
