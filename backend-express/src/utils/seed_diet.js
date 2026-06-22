const db = require('../config/db');
const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const dietGoalModel = require('../models/dietGoalModel');

async function seed() {
  console.log('Seeding dummy diet data...');
  try {
    const email = 'demo@example.com';
    const password = 'demo1234';
    const name = 'Demo User';

    // 1. Find or create user
    let user = await userModel.findByEmail(email);
    let userId;
    if (!user) {
      console.log(`User ${email} not found. Creating user...`);
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      userId = await userModel.createUser(name, email, passwordHash);
      console.log(`User created with ID: ${userId}`);
    } else {
      userId = user.id;
      console.log(`User found with ID: ${userId}`);
    }

    // Also make sure profile exists and has mock data for Mifflin calculations
    const [profile] = await db.execute('SELECT id FROM profiles WHERE user_id = ?', [userId]);
    if (profile.length === 0) {
      await db.execute(
        'INSERT INTO profiles (user_id, age, gender, height_cm, current_weight_kg, activity_level) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, 28, 'MALE', 178.0, 78.5, 'MEDIUM']
      );
    } else {
      await db.execute(
        'UPDATE profiles SET age = 28, gender = "MALE", height_cm = 178.0, current_weight_kg = 78.5, activity_level = "MEDIUM" WHERE user_id = ?',
        [userId]
      );
    }

    // 2. Clear existing foods and diet goals for this user to make it clean
    console.log('Cleaning existing food logs & diet goals for demo user...');
    await db.execute('DELETE FROM foods WHERE user_id = ?', [userId]);
    await db.execute('DELETE FROM diet_goals WHERE user_id = ?', [userId]);

    // 3. Set a default diet goal
    console.log('Setting diet goal to WEIGHT_LOSS...');
    await dietGoalModel.save(userId, {
      goal_type: 'WEIGHT_LOSS',
      target_calories: 1800,
      target_protein: 130,
      target_carbs: 190,
      target_fat: 55
    });

    // 4. Generate data for the last 41 days
    console.log('Generating food logs for the last 41 days...');
    
    // Staple meals dictionary to pick items from
    const breakfastOptions = [
      { name: 'Idli', qty: 3, unit: 'pieces', calories: 180, protein: 6, carbs: 36, fat: 0.6, fiber: 2.4 },
      { name: 'Dosa', qty: 2, unit: 'pieces', calories: 336, protein: 6.4, carbs: 59, fat: 7.6, fiber: 2.4 },
      { name: 'Poha', qty: 1.5, unit: 'cups', calories: 330, protein: 5.7, carbs: 61.5, fat: 5.2, fiber: 2.85 },
      { name: 'Upma', qty: 1.5, unit: 'cups', calories: 315, protein: 7.5, carbs: 52.5, fat: 6.75, fiber: 3.75 },
      { name: 'Oats', qty: 1.5, unit: 'cups', calories: 225, protein: 7.5, carbs: 40.5, fat: 3.75, fiber: 6 }
    ];

    const lunchOptions = [
      { name: 'Rice', qty: 1.5, unit: 'cups', calories: 307.5, protein: 6.3, carbs: 66.75, fat: 0.6, fiber: 0.9 },
      { name: 'Dal', qty: 1.5, unit: 'cups', calories: 270, protein: 18, carbs: 42, fat: 3.75, fiber: 12 },
      { name: 'Roti', qty: 3, unit: 'pieces', calories: 360, protein: 10.5, carbs: 66, fat: 1.5, fiber: 6.6 },
      { name: 'Paneer', qty: 100, unit: 'grams', calories: 265, protein: 18, carbs: 3, fat: 20, fiber: 0 },
      { name: 'Salad', qty: 1.5, unit: 'cups', calories: 52.5, protein: 2.25, carbs: 9, fat: 0.3, fiber: 3.3 }
    ];

    const snackOptions = [
      { name: 'Apple', qty: 1, unit: 'pieces', calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4 },
      { name: 'Banana', qty: 1, unit: 'pieces', calories: 105, protein: 1.3, carbs: 27, fat: 0.3, fiber: 3.1 },
      { name: 'Milk', qty: 250, unit: 'ml', calories: 150, protein: 8.25, carbs: 12, fat: 8, fiber: 0 },
      { name: 'Boiled Egg', qty: 2, unit: 'pieces', calories: 156, protein: 12.6, carbs: 1.2, fat: 10.6, fiber: 0 }
    ];

    const dinnerOptions = [
      { name: 'Chapati', qty: 3, unit: 'pieces', calories: 330, protein: 9.6, carbs: 60.6, fat: 1.2, fiber: 6 },
      { name: 'Dal', qty: 1.2, unit: 'cups', calories: 216, protein: 14.4, carbs: 33.6, fat: 3, fiber: 9.6 },
      { name: 'Chicken Breast', qty: 150, unit: 'grams', calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 },
      { name: 'Sambar', qty: 1.5, unit: 'cups', calories: 165, protein: 5.25, carbs: 22.5, fat: 4.8, fiber: 4.65 },
      { name: 'Salad', qty: 1, unit: 'cups', calories: 35, protein: 1.5, carbs: 6, fat: 0.2, fiber: 2.2 }
    ];

    const today = new Date();

    for (let i = 40; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      // Pick options deterministically based on day index
      const bOption = breakfastOptions[i % breakfastOptions.length];
      const lOption1 = lunchOptions[i % lunchOptions.length];
      const lOption2 = lunchOptions[(i + 1) % lunchOptions.length];
      const sOption = snackOptions[i % snackOptions.length];
      const dOption1 = dinnerOptions[i % dinnerOptions.length];
      const dOption2 = dinnerOptions[(i + 2) % dinnerOptions.length];

      // Scale slightly to make the data look realistic (+/- 10% variation)
      const scaleVal = (val) => {
        const variation = 0.9 + Math.random() * 0.2; // 0.9 to 1.1
        return parseFloat((val * variation).toFixed(1));
      };

      const logMeal = async (mealOption, mealType, hour, minute) => {
        const mealDate = new Date(date);
        mealDate.setHours(hour, minute, 0, 0);

        await db.execute(
          `INSERT INTO foods 
            (user_id, food_name, quantity, unit, calories, protein, carbs, fat, fiber, meal_type, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            mealOption.name,
            mealOption.qty,
            mealOption.unit,
            scaleVal(mealOption.calories),
            scaleVal(mealOption.protein),
            scaleVal(mealOption.carbs),
            scaleVal(mealOption.fat),
            scaleVal(mealOption.fiber),
            mealType,
            mealDate
          ]
        );
      };

      // Concurrently insert meals for each day
      await logMeal(bOption, 'BREAKFAST', 8, 30);
      await logMeal(lOption1, 'LUNCH', 13, 0);
      await logMeal(lOption2, 'LUNCH', 13, 15);
      await logMeal(sOption, 'SNACKS', 17, 30);
      await logMeal(dOption1, 'DINNER', 20, 15);
      await logMeal(dOption2, 'DINNER', 20, 30);
    }

    console.log('Dummy diet data seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
