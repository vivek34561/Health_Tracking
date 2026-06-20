const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Protect all dashboard routes
router.use(authMiddleware);

// GET /api/dashboard
router.get('/', dashboardController.getDashboardSummary);

module.exports = router;
