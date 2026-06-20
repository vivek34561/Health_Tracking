const waterModel = require('../models/waterModel');

/**
 * Add a new water log
 */
async function addWater(req, res) {
  try {
    const { amount_ml, consumed_at } = req.body;
    const userId = req.user.id;

    if (amount_ml === undefined || amount_ml === null) {
      return res.status(400).json({
        success: false,
        message: 'amount_ml is required.'
      });
    }

    const amount = parseInt(amount_ml, 10);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'amount_ml must be a positive integer.'
      });
    }

    if (consumed_at && isNaN(Date.parse(consumed_at))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid consumed_at date format.'
      });
    }

    const recordId = await waterModel.create(userId, amount, consumed_at);
    return res.status(201).json({
      success: true,
      message: 'Water intake added',
      id: recordId
    });
  } catch (error) {
    console.error('Add water error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while logging water intake.'
    });
  }
}

/**
 * Get water log history
 */
async function getWaterHistory(req, res) {
  try {
    const userId = req.user.id;
    const history = await waterModel.getHistory(userId);
    return res.status(200).json(history);
  } catch (error) {
    console.error('Get water history error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching water history.'
    });
  }
}

/**
 * Update an existing water log
 */
async function updateWater(req, res) {
  try {
    const recordId = req.params.id;
    const userId = req.user.id;
    const { amount_ml, consumed_at } = req.body;

    if (amount_ml === undefined || amount_ml === null) {
      return res.status(400).json({
        success: false,
        message: 'amount_ml is required.'
      });
    }

    const amount = parseInt(amount_ml, 10);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'amount_ml must be a positive integer.'
      });
    }

    if (consumed_at && isNaN(Date.parse(consumed_at))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid consumed_at date format.'
      });
    }

    const updated = await waterModel.update(userId, recordId, amount, consumed_at);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Water log record not found or not owned by user.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Water intake log updated successfully'
    });
  } catch (error) {
    console.error('Update water log error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while updating the water log.'
    });
  }
}

/**
 * Delete a water log
 */
async function deleteWater(req, res) {
  try {
    const recordId = req.params.id;
    const userId = req.user.id;

    const deleted = await waterModel.delete(userId, recordId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Water log record not found or not owned by user.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Water intake log deleted successfully'
    });
  } catch (error) {
    console.error('Delete water log error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while deleting the water log.'
    });
  }
}

module.exports = {
  addWater,
  getWaterHistory,
  updateWater,
  deleteWater
};
