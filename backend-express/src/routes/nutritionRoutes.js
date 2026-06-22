const express = require('express');
const foodController = require('../controllers/foodController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Apply auth middleware to protect all nutrition routes
router.use(authMiddleware);

router.get('/today', foodController.getNutritionToday);
router.get('/week', foodController.getNutritionWeek);
router.get('/month', foodController.getNutritionMonth);
router.get('/recommendations', foodController.getRecommendations);

module.exports = router;
