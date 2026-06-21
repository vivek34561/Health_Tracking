const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Protect AI routes with the JWT auth middleware
router.use(authMiddleware);

router.post('/chat', async (req, res) => {
  try {
    const { message, conversation_history, confirmed_action } = req.body;
    const userId = req.user.id;
    const token = req.headers.authorization;

    const response = await fetch('http://localhost:8000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify({
        message,
        conversation_history,
        user_id: userId,
        confirmed_action
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      let parsedErr = errText;
      try {
        parsedErr = JSON.parse(errText);
      } catch (e) {}
      
      return res.status(response.status).json({
        success: false,
        message: parsedErr.detail || parsedErr.message || 'FastAPI service error'
      });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error('AI Chat Gateway Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to connect to AI Service. Make sure FastAPI is running on port 8000.'
    });
  }
});

module.exports = router;
