const db = require('../config/db');

/**
 * Get chat history between current user and another user
 * GET /api/messages/:otherUserId
 */
async function getConversation(req, res, next) {
  try {
    const currentUserId = req.user.UserID;
    const otherUserId = req.params.otherUserId;

    // Verify other user exists
    const otherUsers = await db.query('SELECT UserID, Name, Role FROM Users WHERE UserID = ?', [otherUserId]);
    if (otherUsers.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Mark unread messages from this user as read
    await db.query(
      `UPDATE Messages 
       SET IsRead = 1 
       WHERE SenderID = ? AND ReceiverID = ? AND IsRead = 0`,
      [otherUserId, currentUserId]
    );

    // Retrieve full conversation ordered by SentDate
    const messages = await db.query(
      `SELECT m.*, 
              s.Name AS SenderName, 
              r.Name AS ReceiverName
       FROM Messages m
       JOIN Users s ON m.SenderID = s.UserID
       JOIN Users r ON m.ReceiverID = r.UserID
       WHERE (m.SenderID = ? AND m.ReceiverID = ?) 
          OR (m.SenderID = ? AND m.ReceiverID = ?)
       ORDER BY m.SentDate ASC`,
      [currentUserId, otherUserId, otherUserId, currentUserId]
    );

    res.json({
      success: true,
      partner: otherUsers[0],
      count: messages.length,
      data: messages
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get active conversations list with unread counts
 * GET /api/messages/conversations
 */
async function getRecentConversations(req, res, next) {
  try {
    const currentUserId = req.user.UserID;

    // Fetch distinct users current user has exchanged messages with
    const conversations = await db.query(
      `SELECT 
          u.UserID, 
          u.Name, 
          u.Email, 
          u.Role,
          (SELECT m2.MessageText FROM Messages m2 
           WHERE (m2.SenderID = u.UserID AND m2.ReceiverID = ?) 
              OR (m2.SenderID = ? AND m2.ReceiverID = u.UserID)
           ORDER BY m2.SentDate DESC LIMIT 1) AS LastMessage,
          (SELECT m2.SentDate FROM Messages m2 
           WHERE (m2.SenderID = u.UserID AND m2.ReceiverID = ?) 
              OR (m2.SenderID = ? AND m2.ReceiverID = u.UserID)
           ORDER BY m2.SentDate DESC LIMIT 1) AS LastMessageTime,
          (SELECT COUNT(*) FROM Messages m3 
           WHERE m3.SenderID = u.UserID AND m3.ReceiverID = ? AND m3.IsRead = 0) AS UnreadCount
       FROM Users u
       WHERE u.UserID IN (
          SELECT SenderID FROM Messages WHERE ReceiverID = ?
          UNION
          SELECT ReceiverID FROM Messages WHERE SenderID = ?
       )
       ORDER BY LastMessageTime DESC`,
      [currentUserId, currentUserId, currentUserId, currentUserId, currentUserId, currentUserId, currentUserId]
    );

    res.json({
      success: true,
      count: conversations.length,
      data: conversations
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Send message via REST (fallback)
 * POST /api/messages
 */
async function sendMessage(req, res, next) {
  try {
    const senderId = req.user.UserID;
    const { ReceiverID, MessageText } = req.body;

    if (!ReceiverID || !MessageText || MessageText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ReceiverID and non-empty MessageText are required.'
      });
    }

    // Verify receiver exists
    const receivers = await db.query('SELECT UserID, Name FROM Users WHERE UserID = ?', [ReceiverID]);
    if (receivers.length === 0) {
      return res.status(404).json({ success: false, message: 'Recipient not found.' });
    }

    const result = await db.query(
      `INSERT INTO Messages (SenderID, ReceiverID, MessageText, IsRead)
       VALUES (?, ?, ?, 0)`,
      [senderId, ReceiverID, MessageText.trim()]
    );

    const inserted = await db.query('SELECT * FROM Messages WHERE MessageID = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Message delivered.',
      data: inserted[0]
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getConversation,
  getRecentConversations,
  sendMessage
};
