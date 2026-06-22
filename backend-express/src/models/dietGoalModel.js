const db = require('../config/db');

/**
 * Calculates recommended calories and macronutrient targets based on user demographics
 */
function calculateRecommendedTargets(profile) {
  const age = parseInt(profile.age, 10) || 25;
  const height = parseFloat(profile.height) || 170; // cm
  const weight = parseFloat(profile.weight) || 70;  // kg
  const gender = (profile.gender || 'MALE').toUpperCase();
  const activityLevel = (profile.activityLevel || 'MEDIUM').toUpperCase();

  // 1. Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor Equation
  let bmr = 0;
  if (gender === 'MALE') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else if (gender === 'FEMALE') {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  } else {
    // Average baseline for OTHER
    bmr = 10 * weight + 6.25 * height - 5 * age - 78;
  }

  // 2. Adjust for Activity Level (TDEE)
  let activityMultiplier = 1.375; // MEDIUM default
  if (activityLevel === 'LOW') {
    activityMultiplier = 1.2;
  } else if (activityLevel === 'HIGH') {
    activityMultiplier = 1.725;
  }

  const tdee = bmr * activityMultiplier;

  // 3. Set goals and macro divisions based on user choice
  // We'll calculate targets for all 4 types and return them, or default to MAINTENANCE
  const goalsMap = {
    WEIGHT_LOSS: {
      calories: Math.max(1200, Math.round(tdee - 500)), // Safety limit of 1200 kcal
      proteinPct: 30,
      carbsPct: 40,
      fatPct: 30
    },
    WEIGHT_GAIN: {
      calories: Math.round(tdee + 500),
      proteinPct: 20,
      carbsPct: 50,
      fatPct: 30
    },
    MUSCLE_GAIN: {
      calories: Math.round(tdee + 300),
      proteinPct: 35,
      carbsPct: 40,
      fatPct: 25
    },
    MAINTENANCE: {
      calories: Math.max(1200, Math.round(tdee)),
      proteinPct: 25,
      carbsPct: 45,
      fatPct: 30
    }
  };

  // Convert percentage of calories to grams:
  // Protein = 4 kcal/g, Carbs = 4 kcal/g, Fat = 9 kcal/g
  const targets = {};
  Object.keys(goalsMap).forEach(key => {
    const config = goalsMap[key];
    targets[key] = {
      target_calories: config.calories,
      target_protein: Math.round((config.calories * (config.proteinPct / 100)) / 4),
      target_carbs: Math.round((config.calories * (config.carbsPct / 100)) / 4),
      target_fat: Math.round((config.calories * (config.fatPct / 100)) / 9)
    };
  });

  return targets;
}

/**
 * Fetch a user's diet goals. If not set in the database, fetch profile and calculate recommendations.
 */
async function getByUserId(userId) {
  // Try fetching existing target goals
  const [rows] = await db.execute(
    'SELECT * FROM diet_goals WHERE user_id = ?',
    [userId]
  );

  if (rows.length > 0) {
    return {
      id: rows[0].id,
      user_id: rows[0].user_id,
      goal_type: rows[0].goal_type,
      target_calories: rows[0].target_calories,
      target_protein: rows[0].target_protein,
      target_carbs: rows[0].target_carbs,
      target_fat: rows[0].target_fat,
      is_custom: true
    };
  }

  // Fallback to calculation based on profile
  const [profileRows] = await db.execute(
    `SELECT 
      age, 
      height_cm AS height, 
      current_weight_kg AS weight, 
      gender, 
      activity_level AS activityLevel 
     FROM profiles WHERE user_id = ?`,
    [userId]
  );

  const profile = profileRows[0] || { age: 25, height: 170, weight: 70, gender: 'MALE', activityLevel: 'MEDIUM' };
  const recommendedTargets = calculateRecommendedTargets(profile);

  // Return recommended targets for MAINTENANCE as default, but include recommendations for all goal types
  return {
    user_id: userId,
    goal_type: 'MAINTENANCE',
    target_calories: recommendedTargets.MAINTENANCE.target_calories,
    target_protein: recommendedTargets.MAINTENANCE.target_protein,
    target_carbs: recommendedTargets.MAINTENANCE.target_carbs,
    target_fat: recommendedTargets.MAINTENANCE.target_fat,
    is_custom: false,
    recommendations: recommendedTargets
  };
}

/**
 * Create or update (upsert) diet goals
 */
async function save(userId, goalData) {
  const { goal_type, target_calories, target_protein, target_carbs, target_fat } = goalData;

  const query = `
    INSERT INTO diet_goals (user_id, goal_type, target_calories, target_protein, target_carbs, target_fat)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      goal_type = VALUES(goal_type),
      target_calories = VALUES(target_calories),
      target_protein = VALUES(target_protein),
      target_carbs = VALUES(target_carbs),
      target_fat = VALUES(target_fat)
  `;

  const [result] = await db.execute(query, [
    userId,
    goal_type.toUpperCase(),
    target_calories,
    target_protein,
    target_carbs,
    target_fat
  ]);

  return result.affectedRows > 0;
}

module.exports = {
  getByUserId,
  save,
  calculateRecommendedTargets
};
