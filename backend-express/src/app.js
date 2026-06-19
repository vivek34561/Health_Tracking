const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Auth routes
app.use('/api/auth', authRoutes);

// Root path handler
app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/api') {
    return res.json({ message: "Welcome to AI Health Tracking Core API" });
  }
  next();
});

module.exports = app;
