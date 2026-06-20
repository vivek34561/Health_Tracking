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

// Root path handler
app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/api') {
    return res.json({ message: "Welcome to AI Health Tracking Core API" });
  }
  next();
});

module.exports = app;
