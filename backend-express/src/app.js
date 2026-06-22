const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const weightRoutes = require('./routes/weightRoutes');
const waterRoutes = require('./routes/waterRoutes');
const sleepRoutes = require('./routes/sleepRoutes');
const activityRoutes = require('./routes/activityRoutes');
const goalRoutes = require('./routes/goalRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const foodRoutes = require('./routes/foodRoutes');
const nutritionRoutes = require('./routes/nutritionRoutes');
const dietRoutes = require('./routes/dietRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Auth routes
app.use('/api/auth', authRoutes);

// Weight routes
app.use('/api/weights', weightRoutes);

// Water routes
app.use('/api/water', waterRoutes);

// Sleep routes
app.use('/api/sleep', sleepRoutes);

// Activity routes
app.use('/api/activities', activityRoutes);

// Goals routes
app.use('/api/goals', goalRoutes);

// Dashboard routes
app.use('/api/dashboard', dashboardRoutes);

// Reports routes
app.use('/api/reports', reportRoutes);

// Food Logs, Nutrition and Diet Goal routes
app.use('/api/foods', foodRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/diet', dietRoutes);

// AI Gateway routes
const aiRoutes = require('./routes/aiRoutes');
app.use('/api/ai', aiRoutes);

// Root path handler
app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/api') {
    return res.json({ message: "Welcome to AI Health Tracking Core API" });
  }
  next();
});

module.exports = app;
