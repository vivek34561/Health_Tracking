const db = require('../config/db');

/**
 * Find user by email
 */
async function findByEmail(email) {
  const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0] || null;
}

/**
 * Find user by ID
 */
async function findById(id) {
  const [rows] = await db.execute('SELECT id, name, email, status FROM users WHERE id = ?', [id]);
  return rows[0] || null;
}

/**
 * Create a new user and associated empty profile using a transaction
 */
async function createUser(name, email, passwordHash) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Insert user
    const [userResult] = await connection.execute(
      'INSERT INTO users (name, email, password_hash, status) VALUES (?, ?, ?, "ACTIVE")',
      [name, email, passwordHash]
    );

    const userId = userResult.insertId;

    // Insert corresponding profile
    await connection.execute(
      'INSERT INTO profiles (user_id) VALUES (?)',
      [userId]
    );

    await connection.commit();
    return userId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Get profile information combined with user basic details
 */
async function getProfile(userId) {
  const query = `
    SELECT 
      u.id, 
      u.name, 
      u.email, 
      p.age, 
      p.height_cm AS height, 
      p.current_weight_kg AS weight, 
      p.gender,
      p.activity_level AS activityLevel
    FROM users u
    LEFT JOIN profiles p ON u.id = p.user_id
    WHERE u.id = ?
  `;
  const [rows] = await db.execute(query, [userId]);
  return rows[0] || null;
}

/**
 * Update user profile
 */
async function updateProfile(userId, { age, height, weight, gender, activityLevel }) {
  // Normalize gender to uppercase matching ENUM ('MALE', 'FEMALE', 'OTHER')
  let normalizedGender = null;
  if (gender) {
    const upper = gender.toUpperCase();
    if (['MALE', 'FEMALE', 'OTHER'].includes(upper)) {
      normalizedGender = upper;
    }
  }

  // Normalize activityLevel to uppercase matching ENUM ('LOW', 'MEDIUM', 'HIGH')
  let normalizedActivityLevel = null;
  if (activityLevel) {
    const upper = activityLevel.toUpperCase();
    if (['LOW', 'MEDIUM', 'HIGH'].includes(upper)) {
      normalizedActivityLevel = upper;
    }
  }

  const query = `
    UPDATE profiles 
    SET 
      age = COALESCE(?, age), 
      height_cm = COALESCE(?, height_cm), 
      current_weight_kg = COALESCE(?, current_weight_kg), 
      gender = COALESCE(?, gender),
      activity_level = COALESCE(?, activity_level)
    WHERE user_id = ?
  `;
  
  const [result] = await db.execute(query, [
    age !== undefined ? age : null,
    height !== undefined ? height : null,
    weight !== undefined ? weight : null,
    normalizedGender,
    normalizedActivityLevel,
    userId
  ]);

  return result.affectedRows > 0;
}

module.exports = {
  findByEmail,
  findById,
  createUser,
  getProfile,
  updateProfile
};
