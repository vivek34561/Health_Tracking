const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Enforce auth token check on all dashboard metrics queries
router.use(authMiddleware);

router.get('/', dashboardController.getDashboardSummary);

module.exports = router;
