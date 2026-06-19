const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Root path handler
app.get('/', (req, res) => {
  res.json({ message: "Welcome to AI Health Tracking Core API" });
});

module.exports = app;
