const dietGoalModel = require('../models/dietGoalModel');

/**
 * Get user's current diet goals. Calculates recommended parameters based on user profile if not set.
 */
async function getDietGoals(req, res) {
  try {
    const userId = req.user.id;
    const goal = await dietGoalModel.getByUserId(userId);
    return res.status(200).json(goal);
  } catch (error) {
    console.error('Get diet goals error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching diet goals.'
    });
  }
}

/**
 * Create or update user's diet goals
 */
async function updateDietGoals(req, res) {
  try {
    const userId = req.user.id;
    const { goal_type, target_calories, target_protein, target_carbs, target_fat } = req.body;

    // 1. Inputs validation
    if (!goal_type || !target_calories || !target_protein || !target_carbs || !target_fat) {
      return res.status(400).json({
        success: false,
        message: 'goal_type, target_calories, target_protein, target_carbs, and target_fat are required.'
      });
    }

    const validGoalTypes = ['WEIGHT_LOSS', 'WEIGHT_GAIN', 'MUSCLE_GAIN', 'MAINTENANCE'];
    if (!validGoalTypes.includes(goal_type.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid goal_type. Must be Weight_Loss, Weight_Gain, Muscle_Gain, or Maintenance.'
      });
    }

    const checkPositiveInt = (val, name) => {
      const parsed = parseInt(val, 10);
      if (isNaN(parsed) || parsed <= 0) {
        throw new Error(`${name} must be a positive integer.`);
      }
      return parsed;
    };

    let cal, prot, carb, fat;
    try {
      cal = checkPositiveInt(target_calories, 'target_calories');
      prot = checkPositiveInt(target_protein, 'target_protein');
      carb = checkPositiveInt(target_carbs, 'target_carbs');
      fat = checkPositiveInt(target_fat, 'target_fat');
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    // 2. Persist
    await dietGoalModel.save(userId, {
      goal_type: goal_type.toUpperCase(),
      target_calories: cal,
      target_protein: prot,
      target_carbs: carb,
      target_fat: fat
    });

    return res.status(200).json({
      success: true,
      message: 'Diet goals updated successfully'
    });

  } catch (error) {
    console.error('Update diet goals error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while updating diet goals.'
    });
  }
}

module.exports = {
  getDietGoals,
  updateDietGoals
};
