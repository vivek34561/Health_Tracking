const express = require('express');
const weightController = require('../controllers/weightController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// All weight routes are protected and require authentication
router.use(authMiddleware);

router.post('/', weightController.addWeight);
router.get('/', weightController.getWeightHistory);
router.put('/:id', weightController.updateWeight);
router.delete('/:id', weightController.deleteWeight);

module.exports = router;
