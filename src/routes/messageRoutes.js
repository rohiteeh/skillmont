const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticateToken } = require('../middleware/auth');

// All message routes require authentication
router.use(authenticateToken);

router.get('/conversations', messageController.getRecentConversations);
router.get('/:otherUserId', messageController.getConversation);
router.post('/', messageController.sendMessage);

module.exports = router;
