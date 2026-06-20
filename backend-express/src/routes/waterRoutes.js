const express = require('express');
const waterController = require('../controllers/waterController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Apply auth middleware to protect all water routes
router.use(authMiddleware);

router.post('/', waterController.addWater);
router.get('/', waterController.getWaterHistory);
router.delete('/:id', waterController.deleteWater);

module.exports = router;
