const express = require('express');
const foodController = require('../controllers/foodController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Apply auth middleware to protect all food routes
router.use(authMiddleware);

router.post('/', foodController.addFood);
router.get('/', foodController.getFoods);
router.get('/search', foodController.searchFoods);
router.put('/:id', foodController.updateFood);
router.delete('/:id', foodController.deleteFood);

module.exports = router;
