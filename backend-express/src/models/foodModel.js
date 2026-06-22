const db = require('../config/db');

// Built-in database of common foods, particularly focusing on Indian cuisine and general fitness staples.
const COMMON_FOODS = [
  { name: 'Roti', quantity: 1, unit: 'pieces', calories: 120, protein: 3.5, carbs: 22, fat: 0.5, fiber: 2.2 },
  { name: 'Rice', quantity: 1, unit: 'cups', calories: 205, protein: 4.2, carbs: 44.5, fat: 0.4, fiber: 0.6 },
  { name: 'Dal', quantity: 1, unit: 'cups', calories: 180, protein: 12, carbs: 28, fat: 2.5, fiber: 8 },
  { name: 'Paneer', quantity: 100, unit: 'grams', calories: 265, protein: 18, carbs: 3, fat: 20, fiber: 0 },
  { name: 'Idli', quantity: 1, unit: 'pieces', calories: 60, protein: 2, carbs: 12, fat: 0.2, fiber: 0.8 },
  { name: 'Dosa', quantity: 1, unit: 'pieces', calories: 168, protein: 3.2, carbs: 29.5, fat: 3.8, fiber: 1.2 },
  { name: 'Upma', quantity: 1, unit: 'cups', calories: 210, protein: 5, carbs: 35, fat: 4.5, fiber: 2.5 },
  { name: 'Poha', quantity: 1, unit: 'cups', calories: 220, protein: 3.8, carbs: 41, fat: 3.5, fiber: 1.9 },
  { name: 'Chapati', quantity: 1, unit: 'pieces', calories: 110, protein: 3.2, carbs: 20.2, fat: 0.4, fiber: 2 },
  { name: 'Sambar', quantity: 1, unit: 'cups', calories: 110, protein: 3.5, carbs: 15, fat: 3.2, fiber: 3.1 },
  { name: 'Boiled Egg', quantity: 1, unit: 'pieces', calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3, fiber: 0 },
  { name: 'Milk', quantity: 100, unit: 'ml', calories: 60, protein: 3.3, carbs: 4.8, fat: 3.2, fiber: 0 },
  { name: 'Chicken Breast', quantity: 100, unit: 'grams', calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 },
  { name: 'Banana', quantity: 1, unit: 'pieces', calories: 105, protein: 1.3, carbs: 27, fat: 0.3, fiber: 3.1 },
  { name: 'Apple', quantity: 1, unit: 'pieces', calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4 },
  { name: 'Bread', quantity: 1, unit: 'pieces', calories: 80, protein: 3, carbs: 15, fat: 1, fiber: 1.2 },
  { name: 'Salad', quantity: 1, unit: 'cups', calories: 35, protein: 1.5, carbs: 6, fat: 0.2, fiber: 2.2 },
  { name: 'Oats', quantity: 1, unit: 'cups', calories: 150, protein: 5, carbs: 27, fat: 2.5, fiber: 4 }
];

/**
 * Searches the built-in nutrition database case-insensitively
 */
function searchDictionary(query) {
  if (!query) return [];
  const cleanQuery = query.toLowerCase().trim();
  return COMMON_FOODS.filter(food => food.name.toLowerCase().includes(cleanQuery));
}

/**
 * Normalizes/Calculates nutritional values for a specific food item
 */
function getCalculatedNutrients(name, quantity, unit) {
  const match = COMMON_FOODS.find(f => f.name.toLowerCase() === name.trim().toLowerCase());
  if (!match) return null;

  let factor = 1;
  // If units match, scale according to dictionary entry quantity
  if (match.unit.toLowerCase() === unit.toLowerCase()) {
    factor = quantity / match.quantity;
  } else {
    // If unit is mismatched, fallback to multiplying directly
    factor = quantity;
  }

  return {
    calories: Math.max(0, parseFloat((match.calories * factor).toFixed(1))),
    protein: Math.max(0, parseFloat((match.protein * factor).toFixed(1))),
    carbs: Math.max(0, parseFloat((match.carbs * factor).toFixed(1))),
    fat: Math.max(0, parseFloat((match.fat * factor).toFixed(1))),
    fiber: Math.max(0, parseFloat((match.fiber * factor).toFixed(1)))
  };
}

/**
 * Create a new food log entry
 */
async function create(userId, foodData) {
  const { food_name, quantity, unit, meal_type, created_at } = foodData;
  let { calories, protein, carbs, fat, fiber } = foodData;

  // Auto-fill nutritional data if not explicitly provided
  if (calories === undefined || calories === null) {
    const computed = getCalculatedNutrients(food_name, quantity, unit);
    if (computed) {
      calories = computed.calories;
      protein = computed.protein;
      carbs = computed.carbs;
      fat = computed.fat;
      fiber = computed.fiber;
    } else {
      // Fallback defaults if no match
      calories = calories || 0;
      protein = protein || 0;
      carbs = carbs || 0;
      fat = fat || 0;
      fiber = fiber || 0;
    }
  }

  const date = created_at ? new Date(created_at) : new Date();

  const [result] = await db.execute(
    `INSERT INTO foods 
      (user_id, food_name, quantity, unit, calories, protein, carbs, fat, fiber, meal_type, created_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      food_name,
      quantity,
      unit,
      calories,
      protein,
      carbs,
      fat,
      fiber,
      meal_type.toUpperCase(),
      date
    ]
  );

  return result.insertId;
}

/**
 * Get all food logs of a user with optional date filter
 */
async function getHistory(userId, dateFilter = null) {
  let query = 'SELECT * FROM foods WHERE user_id = ?';
  const params = [userId];

  if (dateFilter) {
    query += ' AND DATE(created_at) = DATE(?)';
    params.push(dateFilter);
  }

  query += ' ORDER BY created_at DESC';

  const [rows] = await db.execute(query, params);
  return rows;
}

/**
 * Get single food log by ID
 */
async function findById(userId, recordId) {
  const [rows] = await db.execute(
    'SELECT * FROM foods WHERE id = ? AND user_id = ?',
    [recordId, userId]
  );
  return rows[0] || null;
}

/**
 * Check if duplicate entry exists in small window (e.g. 10 seconds)
 */
async function findDuplicate(userId, foodName, mealType, dateStr) {
  const targetDate = dateStr ? new Date(dateStr) : new Date();
  const [rows] = await db.execute(
    `SELECT id FROM foods 
     WHERE user_id = ? AND food_name = ? AND meal_type = ? 
     AND ABS(TIMESTAMPDIFF(SECOND, created_at, ?)) < 10`,
    [userId, foodName, mealType.toUpperCase(), targetDate]
  );
  return rows[0] || null;
}

/**
 * Update an existing food log
 */
async function update(userId, recordId, foodData) {
  const { food_name, quantity, unit, meal_type, calories, protein, carbs, fat, fiber, created_at } = foodData;
  
  const query = `
    UPDATE foods 
    SET 
      food_name = COALESCE(?, food_name),
      quantity = COALESCE(?, quantity),
      unit = COALESCE(?, unit),
      calories = COALESCE(?, calories),
      protein = COALESCE(?, protein),
      carbs = COALESCE(?, carbs),
      fat = COALESCE(?, fat),
      fiber = COALESCE(?, fiber),
      meal_type = COALESCE(?, meal_type),
      created_at = COALESCE(?, created_at)
    WHERE id = ? AND user_id = ?
  `;

  const date = created_at ? new Date(created_at) : null;
  const [result] = await db.execute(query, [
    food_name !== undefined ? food_name : null,
    quantity !== undefined ? quantity : null,
    unit !== undefined ? unit : null,
    calories !== undefined ? calories : null,
    protein !== undefined ? protein : null,
    carbs !== undefined ? carbs : null,
    fat !== undefined ? fat : null,
    fiber !== undefined ? fiber : null,
    meal_type ? meal_type.toUpperCase() : null,
    date,
    recordId,
    userId
  ]);

  return result.affectedRows > 0;
}

/**
 * Delete a food log entry
 */
async function deleteRecord(userId, recordId) {
  const [result] = await db.execute(
    'DELETE FROM foods WHERE id = ? AND user_id = ?',
    [recordId, userId]
  );
  return result.affectedRows > 0;
}

/**
 * Get daily nutrition summary for today (in local timezone)
 */
async function getNutritionSummaryToday(userId, dateStr = null) {
  const targetDate = dateStr ? dateStr : new Date().toLocaleDateString('en-CA');
  
  const query = `
    SELECT 
      COALESCE(SUM(calories), 0) AS calories,
      COALESCE(SUM(protein), 0) AS protein,
      COALESCE(SUM(carbs), 0) AS carbs,
      COALESCE(SUM(fat), 0) AS fat,
      COALESCE(SUM(fiber), 0) AS fiber
    FROM foods 
    WHERE user_id = ? AND DATE(created_at) = DATE(?)
  `;

  const [rows] = await db.execute(query, [userId, targetDate]);
  
  // Format returns as decimals rounded to 1 decimal place
  const res = rows[0] || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  return {
    calories: parseFloat(parseFloat(res.calories).toFixed(1)),
    protein: parseFloat(parseFloat(res.protein).toFixed(1)),
    carbs: parseFloat(parseFloat(res.carbs).toFixed(1)),
    fat: parseFloat(parseFloat(res.fat).toFixed(1)),
    fiber: parseFloat(parseFloat(res.fiber).toFixed(1))
  };
}

/**
 * Get nutrition timeline for a date range (returns daily totals)
 */
async function getNutritionTimeline(userId, daysCount) {
  const query = `
    SELECT 
      DATE(created_at) AS date,
      ROUND(SUM(calories), 1) AS calories,
      ROUND(SUM(protein), 1) AS protein,
      ROUND(SUM(carbs), 1) AS carbs,
      ROUND(SUM(fat), 1) AS fat,
      ROUND(SUM(fiber), 1) AS fiber
    FROM foods 
    WHERE user_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at) ASC
  `;

  const [rows] = await db.execute(query, [userId, daysCount]);
  return rows;
}

module.exports = {
  create,
  getHistory,
  findById,
  findDuplicate,
  update,
  delete: deleteRecord,
  getNutritionSummaryToday,
  getNutritionTimeline,
  searchDictionary,
  COMMON_FOODS
};
