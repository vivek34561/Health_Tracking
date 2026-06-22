const express = require('express');
const dietGoalController = require('../controllers/dietGoalController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Apply auth middleware to protect all diet goal routes
router.use(authMiddleware);

router.get('/goals', dietGoalController.getDietGoals);
router.put('/goals', dietGoalController.updateDietGoals);

module.exports = router;
