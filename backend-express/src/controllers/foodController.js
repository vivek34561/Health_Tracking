const foodModel = require('../models/foodModel');
const dietGoalModel = require('../models/dietGoalModel');

/**
 * Log a new food item
 */
async function addFood(req, res) {
  try {
    const userId = req.user.id;
    const { food_name, quantity, unit, meal_type, calories, protein, carbs, fat, fiber, created_at } = req.body;

    // 1. Validations
    if (!food_name || !quantity || !unit || !meal_type) {
      return res.status(400).json({
        success: false,
        message: 'food_name, quantity, unit, and meal_type are required.'
      });
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive number.'
      });
    }

    const validMealTypes = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS'];
    if (!validMealTypes.includes(meal_type.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid meal_type. Must be Breakfast, Lunch, Dinner, or Snacks.'
      });
    }

    const checkNegative = (val, fieldName) => {
      if (val !== undefined && val !== null) {
        const parsed = parseFloat(val);
        if (isNaN(parsed) || parsed < 0) {
          throw new Error(`${fieldName} cannot be negative.`);
        }
      }
    };

    try {
      checkNegative(calories, 'Calories');
      checkNegative(protein, 'Protein');
      checkNegative(carbs, 'Carbohydrates');
      checkNegative(fat, 'Fat');
      checkNegative(fiber, 'Fiber');
    } catch (validationErr) {
      return res.status(400).json({
        success: false,
        message: validationErr.message
      });
    }

    // 2. Duplicate Check: Check if exact same item, meal type, and date is submitted within 10s
    const duplicate = await foodModel.findDuplicate(userId, food_name, meal_type, created_at);
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate entry detected. This food item was already logged in this meal category seconds ago.'
      });
    }

    // 3. Persist Log
    const recordId = await foodModel.create(userId, {
      food_name,
      quantity: qty,
      unit,
      meal_type,
      calories: calories !== undefined ? parseFloat(calories) : null,
      protein: protein !== undefined ? parseFloat(protein) : null,
      carbs: carbs !== undefined ? parseFloat(carbs) : null,
      fat: fat !== undefined ? parseFloat(fat) : null,
      fiber: fiber !== undefined ? parseFloat(fiber) : null,
      created_at
    });

    return res.status(201).json({
      success: true,
      message: 'Food item logged successfully',
      id: recordId
    });

  } catch (error) {
    console.error('Log food error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while logging food.'
    });
  }
}

/**
 * Get all food logs for the authenticated user
 */
async function getFoods(req, res) {
  try {
    const userId = req.user.id;
    const dateFilter = req.query.date; // YYYY-MM-DD format

    if (dateFilter && isNaN(Date.parse(dateFilter))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD.'
      });
    }

    const logs = await foodModel.getHistory(userId, dateFilter);
    return res.status(200).json(logs);
  } catch (error) {
    console.error('Get foods history error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching food history.'
    });
  }
}

/**
 * Update an existing food log
 */
async function updateFood(req, res) {
  try {
    const userId = req.user.id;
    const recordId = req.params.id;
    const { food_name, quantity, unit, meal_type, calories, protein, carbs, fat, fiber, created_at } = req.body;

    const existing = await foodModel.findById(userId, recordId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Food log not found or not owned by user.'
      });
    }

    if (quantity !== undefined) {
      const qty = parseFloat(quantity);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be a positive number.'
        });
      }
    }

    if (meal_type) {
      const validMealTypes = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS'];
      if (!validMealTypes.includes(meal_type.toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid meal_type. Must be Breakfast, Lunch, Dinner, or Snacks.'
        });
      }
    }

    const checkNegative = (val, fieldName) => {
      if (val !== undefined && val !== null) {
        const parsed = parseFloat(val);
        if (isNaN(parsed) || parsed < 0) {
          throw new Error(`${fieldName} cannot be negative.`);
        }
      }
    };

    try {
      checkNegative(calories, 'Calories');
      checkNegative(protein, 'Protein');
      checkNegative(carbs, 'Carbohydrates');
      checkNegative(fat, 'Fat');
      checkNegative(fiber, 'Fiber');
    } catch (validationErr) {
      return res.status(400).json({
        success: false,
        message: validationErr.message
      });
    }

    const updated = await foodModel.update(userId, recordId, {
      food_name,
      quantity: quantity !== undefined ? parseFloat(quantity) : null,
      unit,
      meal_type,
      calories: calories !== undefined ? parseFloat(calories) : null,
      protein: protein !== undefined ? parseFloat(protein) : null,
      carbs: carbs !== undefined ? parseFloat(carbs) : null,
      fat: fat !== undefined ? parseFloat(fat) : null,
      fiber: fiber !== undefined ? parseFloat(fiber) : null,
      created_at
    });

    if (!updated) {
      return res.status(400).json({
        success: false,
        message: 'Could not update food log. No changes made.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Food log updated successfully'
    });

  } catch (error) {
    console.error('Update food log error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while updating food log.'
    });
  }
}

/**
 * Delete a food log entry
 */
async function deleteFood(req, res) {
  try {
    const userId = req.user.id;
    const recordId = req.params.id;

    const deleted = await foodModel.delete(userId, recordId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Food log entry not found or not owned by user.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Food log deleted successfully'
    });
  } catch (error) {
    console.error('Delete food log error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while deleting food log.'
    });
  }
}

/**
 * Search local database dictionary of foods
 */
async function searchFoods(req, res) {
  try {
    const query = req.query.query;
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query parameter (query) is required.'
      });
    }

    const matches = foodModel.searchDictionary(query);
    return res.status(200).json(matches);
  } catch (error) {
    console.error('Search foods dictionary error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while searching nutrition database.'
    });
  }
}

/**
 * Get daily nutrition consumed totals vs target goals
 */
async function getNutritionToday(req, res) {
  try {
    const userId = req.user.id;
    const date = req.query.date || new Date().toLocaleDateString('en-CA');

    const [summary, goal] = await Promise.all([
      foodModel.getNutritionSummaryToday(userId, date),
      dietGoalModel.getByUserId(userId)
    ]);

    // Format final response showing consumed, goal targets, and remaining values
    const targets = {
      calories: goal.target_calories || 2000,
      protein: goal.target_protein || 120,
      carbs: goal.target_carbs || 230,
      fat: goal.target_fat || 65,
      fiber: 25 // default standard fiber goal
    };

    const remaining = {
      calories: Math.max(0, targets.calories - summary.calories),
      protein: Math.max(0, targets.protein - summary.protein),
      carbs: Math.max(0, targets.carbs - summary.carbs),
      fat: Math.max(0, targets.fat - summary.fat),
      fiber: Math.max(0, targets.fiber - summary.fiber)
    };

    return res.status(200).json({
      date,
      goal_type: goal.goal_type,
      consumed: summary,
      targets,
      remaining
    });
  } catch (error) {
    console.error('Get nutrition today error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while compiling today\'s nutrition summary.'
    });
  }
}

/**
 * Get weekly logs timeline (last 7 days)
 */
async function getNutritionWeek(req, res) {
  try {
    const userId = req.user.id;
    const history = await foodModel.getNutritionTimeline(userId, 7);
    return res.status(200).json(history);
  } catch (error) {
    console.error('Get nutrition week error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving weekly nutrition metrics.'
    });
  }
}

/**
 * Get monthly logs timeline (last 30 days)
 */
async function getNutritionMonth(req, res) {
  try {
    const userId = req.user.id;
    const history = await foodModel.getNutritionTimeline(userId, 30);
    return res.status(200).json(history);
  } catch (error) {
    console.error('Get nutrition month error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving monthly nutrition metrics.'
    });
  }
}

/**
 * Recommendation Engine: Recommends foods based on goal, today's logs, and deficiencies.
 */
async function getRecommendations(req, res) {
  try {
    const userId = req.user.id;
    const date = new Date().toLocaleDateString('en-CA');

    const [summary, goal] = await Promise.all([
      foodModel.getNutritionSummaryToday(userId, date),
      dietGoalModel.getByUserId(userId)
    ]);

    const targetCalories = goal.target_calories || 2000;
    const targetProtein = goal.target_protein || 120;
    const targetCarbs = goal.target_carbs || 230;
    const targetFat = goal.target_fat || 65;

    const remainingCalories = targetCalories - summary.calories;
    const remainingProtein = targetProtein - summary.protein;
    const remainingCarbs = targetCarbs - summary.carbs;
    const remainingFat = targetFat - summary.fat;

    const recommendations = [];

    // 1. High Protein Recommendation
    if (remainingProtein > 15) {
      recommendations.push({
        category: 'High Protein Foods',
        reason: `You are currently ${Math.round(remainingProtein)}g short of your daily protein target.`,
        foods: [
          { name: 'Chicken Breast', description: 'Lean protein source, 31g protein per 100g serving.' },
          { name: 'Paneer', description: 'Excellent vegetarian protein, 18g protein per 100g.' },
          { name: 'Dal (Lentils)', description: 'Protein-packed legume staple, 12g protein per cup.' },
          { name: 'Boiled Eggs', description: 'Complete protein with rich amino acids, 6.3g protein per egg.' }
        ]
      });
    }

    // 2. Low Calorie Recommendation (if calories are close to target limit)
    if (remainingCalories < 400 && remainingCalories > 0) {
      recommendations.push({
        category: 'Low Calorie Foods & Snacks',
        reason: 'You are approaching your daily calorie target limit. Focus on low-calorie density items.',
        foods: [
          { name: 'Mixed Salad', description: 'Fiber-rich and extremely low calorie, only 35 kcal per cup.' },
          { name: 'Sambar', description: 'Warm and comforting veggie soup, 110 kcal per cup.' },
          { name: 'Idli', description: 'Steamed rice cake, light on the stomach, only 60 kcal per piece.' },
          { name: 'Apple', description: 'Crisp, high-fiber fruit to curb cravings, 95 kcal per apple.' }
        ]
      });
    }

    // 3. Goal-based Recommendation
    if (goal.goal_type === 'WEIGHT_GAIN') {
      recommendations.push({
        category: 'Weight Gain Suggestions',
        reason: 'Your goal is Weight Gain. Focus on energy-dense, nutritious foods.',
        foods: [
          { name: 'Rice & Ghee', description: 'Easily digestible carbohydrates to easily create a calorie surplus.' },
          { name: 'Bananas', description: 'Convenient energy-rich fruit, 105 kcal per banana.' },
          { name: 'Paneer Curry', description: 'Rich in both proteins and healthy fats, ideal for muscle and weight gain.' },
          { name: 'Poha (Rice flakes)', description: 'Quick and calorie-dense light breakfast meal, 220 kcal per cup.' }
        ]
      });
    } else if (goal.goal_type === 'MUSCLE_GAIN') {
      recommendations.push({
        category: 'Muscle Building Staples',
        reason: 'Your goal is Muscle Gain. Ensure high protein combined with complex carbs for workout fuel.',
        foods: [
          { name: 'Oats with Milk', description: 'Slow-release complex carbs combined with milk protein for fuel.' },
          { name: 'Chicken Breast & Brown Rice', description: 'The golden bodybuilding standard for clean muscle building.' },
          { name: 'Eggs & Whole Wheat Toast', description: 'Perfect post-workout snack providing clean proteins and energy.' },
          { name: 'Thick Dal Tadka', description: 'Double down on lentil thickness for higher protein density per serving.' }
        ]
      });
    } else {
      // General balanced recommendations
      recommendations.push({
        category: 'Healthy Balanced Additions',
        reason: 'General maintenance suggestions for healthy energy levels.',
        foods: [
          { name: 'Whole Wheat Roti', description: 'High-fiber complex carbohydrate staple, 120 kcal per piece.' },
          { name: 'Cooked Oats', description: 'Fiber-rich grain to control cholesterol and sustain energy levels.' },
          { name: 'Fruit Salad', description: 'Rich in micronutrients, antioxidants, and dietary fiber.' }
        ]
      });
    }

    return res.status(200).json({
      goal_type: goal.goal_type,
      macro_status: {
        remaining_calories: remainingCalories,
        remaining_protein: remainingProtein,
        remaining_carbs: remainingCarbs,
        remaining_fat: remainingFat
      },
      recommendations
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while compiling food recommendations.'
    });
  }
}

module.exports = {
  addFood,
  getFoods,
  updateFood,
  deleteFood,
  searchFoods,
  getNutritionToday,
  getNutritionWeek,
  getNutritionMonth,
  getRecommendations
};
