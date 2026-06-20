const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

// Email regex validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Helper to title case gender/activity level for API response
 */
function toTitleCase(str) {
  if (!str) return null;
  const lower = str.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Register a new user
 */
async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    // Validate inputs
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.'
      });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Check if user already exists
    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered.'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user and profile in transaction
    await userModel.createUser(name, email, passwordHash);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully'
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during user registration.'
    });
  }
}

/**
 * Authenticate user and return JWT token
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    // Check if user exists
    const user = await userModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Check status
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status.toLowerCase()}. Please contact support.`
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Generate JWT
    const jwtSecret = process.env.JWT_SECRET || 'super_secret_jwt_key_123!_health_tracking';
    const jwtExpiry = process.env.JWT_EXPIRES_IN || '24h';
    const token = jwt.sign(
      { id: user.id, email: user.email },
      jwtSecret,
      { expiresIn: jwtExpiry }
    );

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during login.'
    });
  }
}

/**
 * Get profile of current user
 */
async function getProfile(req, res) {
  try {
    const userId = req.user.id;
    const profile = await userModel.getProfile(userId);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found.'
      });
    }

    // Match output format from API_Documentation.md
    return res.status(200).json({
      id: profile.id,
      name: profile.name,
      email: profile.email,
      age: profile.age,
      height: profile.height ? parseFloat(profile.height) : null,
      weight: profile.weight ? parseFloat(profile.weight) : null,
      gender: toTitleCase(profile.gender),
      activityLevel: toTitleCase(profile.activityLevel)
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving the profile.'
    });
  }
}

/**
 * Update profile of current user
 */
async function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    const { age, height, weight, gender, activityLevel } = req.body;

    // Note: API sends height and weight. Model maps them to height_cm and current_weight_kg.
    const updated = await userModel.updateProfile(userId, {
      age,
      height,
      weight,
      gender,
      activityLevel
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found or no changes made.'
      });
    }

    return res.status(200).json({
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while updating the profile.'
    });
  }
}

/**
 * Logout current user
 * JWT is stateless — instructs the frontend to discard the token.
 */
async function logout(req, res) {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
}

/**
 * Change password for current user
 */
async function changePassword(req, res) {
  try {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'current_password and new_password are required.'
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'new_password must be at least 6 characters long.'
      });
    }

    // Fetch full user row to get password_hash
    const user = await userModel.findByEmail(req.user.email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.'
      });
    }

    // Hash and persist new password
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(new_password, salt);
    await userModel.updatePassword(userId, newHash);

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while changing the password.'
    });
  }
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  logout,
  changePassword
};
