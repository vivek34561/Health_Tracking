const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

// Protect AI routes with the JWT auth middleware
router.use(authMiddleware);

router.post('/chat', async (req, res) => {
  try {
    const { message, conversation_history, confirmed_action } = req.body;
    const userId = req.user.id;
    const token = req.headers.authorization;

    const response = await fetch(`${FASTAPI_URL}/api/chat`, {
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

router.post('/chat/stream', async (req, res) => {
  try {
    const { message, conversation_history, confirmed_action } = req.body;
    const userId = req.user.id;
    const token = req.headers.authorization;

    const response = await fetch(`${FASTAPI_URL}/api/chat/stream`, {
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
        message: parsedErr.detail || parsedErr.message || 'FastAPI streaming service error'
      });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Transfer-Encoding', 'chunked');

    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    
    res.end();
  } catch (error) {
    console.error('AI Chat Streaming Gateway Error:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to connect to AI Service. Make sure FastAPI is running on port 8000.'
      });
    } else {
      res.write("event: error\ndata: Gateway stream interrupted\n\n");
      res.end();
    }
  }
});


router.post('/predict-bodyfat', async (req, res) => {
  try {
    const token = req.headers.authorization;

    const response = await fetch(`${FASTAPI_URL}/api/predict-bodyfat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify(req.body)
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
    console.error('AI Predict Body Fat Gateway Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to connect to AI Service. Make sure FastAPI is running on port 8000.'
    });
  }
});

module.exports = router;
