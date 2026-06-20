const express = require('express');
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Protect all reports and analytics endpoints with user JWT authentication
router.use(authMiddleware);

router.get('/weekly', reportController.getWeeklyReport);
router.get('/monthly', reportController.getMonthlyReport);
router.get('/progress', reportController.getProgressReport);

module.exports = router;
