const sleepModel = require('../models/sleepModel');

/**
 * Add a new sleep log
 */
async function addSleep(req, res) {
  try {
    const { sleep_start, sleep_end, quality_score } = req.body;
    const userId = req.user.id;

    if (!sleep_start || !sleep_end) {
      return res.status(400).json({
        success: false,
        message: 'sleep_start and sleep_end are required.'
      });
    }

    const start = new Date(sleep_start);
    const end = new Date(sleep_end);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sleep_start or sleep_end date format.'
      });
    }

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: 'sleep_end must be after sleep_start.'
      });
    }

    // Calculate total hours
    const totalHours = parseFloat(((end - start) / (1000 * 60 * 60)).toFixed(2));

    let qScore = undefined;
    if (quality_score !== undefined && quality_score !== null) {
      qScore = parseInt(quality_score, 10);
      if (isNaN(qScore) || qScore < 1 || qScore > 10) {
        return res.status(400).json({
          success: false,
          message: 'quality_score must be an integer between 1 and 10.'
        });
      }
    }

    const recordId = await sleepModel.create(userId, sleep_start, sleep_end, totalHours, qScore);
    return res.status(201).json({
      success: true,
      message: 'Sleep record added',
      id: recordId
    });
  } catch (error) {
    console.error('Add sleep error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while adding the sleep record.'
    });
  }
}

/**
 * Get sleep log history
 */
async function getSleepHistory(req, res) {
  try {
    const userId = req.user.id;
    const history = await sleepModel.getHistory(userId);
    return res.status(200).json(history);
  } catch (error) {
    console.error('Get sleep history error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching sleep history.'
    });
  }
}

/**
 * Update an existing sleep log
 */
async function updateSleep(req, res) {
  try {
    const recordId = req.params.id;
    const userId = req.user.id;
    const { sleep_start, sleep_end, quality_score } = req.body;

    if (!sleep_start || !sleep_end) {
      return res.status(400).json({
        success: false,
        message: 'sleep_start and sleep_end are required.'
      });
    }

    const start = new Date(sleep_start);
    const end = new Date(sleep_end);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sleep_start or sleep_end date format.'
      });
    }

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: 'sleep_end must be after sleep_start.'
      });
    }

    const totalHours = parseFloat(((end - start) / (1000 * 60 * 60)).toFixed(2));

    let qScore = undefined;
    if (quality_score !== undefined && quality_score !== null) {
      qScore = parseInt(quality_score, 10);
      if (isNaN(qScore) || qScore < 1 || qScore > 10) {
        return res.status(400).json({
          success: false,
          message: 'quality_score must be an integer between 1 and 10.'
        });
      }
    }

    const updated = await sleepModel.update(userId, recordId, sleep_start, sleep_end, totalHours, qScore);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Sleep record not found or not owned by user.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Sleep record updated successfully'
    });
  } catch (error) {
    console.error('Update sleep error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while updating the sleep record.'
    });
  }
}

/**
 * Delete a sleep log
 */
async function deleteSleep(req, res) {
  try {
    const recordId = req.params.id;
    const userId = req.user.id;

    const deleted = await sleepModel.delete(userId, recordId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Sleep record not found or not owned by user.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Sleep record deleted successfully'
    });
  } catch (error) {
    console.error('Delete sleep error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while deleting the sleep record.'
    });
  }
}

module.exports = {
  addSleep,
  getSleepHistory,
  updateSleep,
  deleteSleep
};
