const express = require('express');
const sleepController = require('../controllers/sleepController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Apply auth middleware to protect all sleep routes
router.use(authMiddleware);

router.post('/', sleepController.addSleep);
router.get('/', sleepController.getSleepHistory);
router.put('/:id', sleepController.updateSleep);
router.delete('/:id', sleepController.deleteSleep);

module.exports = router;
