const express = require('express');
const goalController = require('../controllers/goalController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Apply auth middleware to protect all goal routes
router.use(authMiddleware);

router.post('/', goalController.addGoal);
router.get('/', goalController.getGoals);
router.put('/:id', goalController.updateGoal);
router.delete('/:id', goalController.deleteGoal);

module.exports = router;
