const jwt = require('jsonwebtoken');
const db = require('../config/db');

/**
 * Configure Socket.io server with real-time direct messaging
 * @param {import('socket.io').Server} io
 */
function initChatSocket(io) {
  // Socket.io JWT Authentication Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication token required for Socket connection.'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'skillmint_secret');
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Invalid or expired socket authentication token.'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.userId;
    const userRoom = `user_${userId}`;

    // Join personal user room for direct messaging
    socket.join(userRoom);
    console.log(`⚡ Socket connected: User ${socket.user.name} (ID: ${userId}) joined room ${userRoom}`);

    /**
     * Handle Direct Real-Time Message
     */
    socket.on('send_message', async (data, callback) => {
      try {
        const { receiverId, messageText } = data;

        if (!receiverId || !messageText || messageText.trim().length === 0) {
          if (callback) callback({ success: false, message: 'receiverId and non-empty messageText required.' });
          return;
        }

        const receiverIdNum = Number(receiverId);

        // Check if recipient exists in database
        const receivers = await db.query('SELECT UserID, Name FROM Users WHERE UserID = ?', [receiverIdNum]);
        if (receivers.length === 0) {
          if (callback) callback({ success: false, message: 'Recipient does not exist.' });
          return;
        }

        // Check if recipient is currently online (has active socket in room)
        const recipientRoom = `user_${receiverIdNum}`;
        const roomSockets = await io.in(recipientRoom).fetchSockets();
        const isRecipientOnline = roomSockets.length > 0;

        // Persist message to database
        const insertRes = await db.query(
          `INSERT INTO Messages (SenderID, ReceiverID, MessageText, IsRead)
           VALUES (?, ?, ?, 0)`,
          [userId, receiverIdNum, messageText.trim()]
        );

        const messagePayload = {
          MessageID: insertRes.insertId,
          SenderID: userId,
          SenderName: socket.user.name,
          ReceiverID: receiverIdNum,
          MessageText: messageText.trim(),
          SentDate: new Date().toISOString(),
          IsRead: 0,
          IsOnlineDelivery: isRecipientOnline
        };

        if (isRecipientOnline) {
          // Deliver message in real-time to recipient room
          io.to(recipientRoom).emit('receive_message', messagePayload);
        } else {
          // Log offline notification event
          console.log(`📩 Recipient User ${receiverIdNum} is offline. Message stored in DB with unread flag.`);
        }

        // Send acknowledgment back to sender
        if (callback) {
          callback({
            success: true,
            status: isRecipientOnline ? 'delivered' : 'stored_offline',
            message: messagePayload
          });
        }

        socket.emit('message_sent', {
          success: true,
          status: isRecipientOnline ? 'delivered' : 'stored_offline',
          message: messagePayload
        });
      } catch (err) {
        console.error('Socket send_message error:', err);
        if (callback) callback({ success: false, message: 'Failed to process message.' });
      }
    });

    /**
     * Handle User Typing Indicator
     */
    socket.on('typing', (data) => {
      const { receiverId, isTyping } = data;
      if (receiverId) {
        io.to(`user_${receiverId}`).emit('user_typing', {
          senderId: userId,
          senderName: socket.user.name,
          isTyping: !!isTyping
        });
      }
    });

    /**
     * Handle Mark as Read / Read Receipt
     */
    socket.on('mark_as_read', async (data) => {
      try {
        const { senderId } = data;
        if (!senderId) return;

        await db.query(
          `UPDATE Messages 
           SET IsRead = 1 
           WHERE SenderID = ? AND ReceiverID = ? AND IsRead = 0`,
          [senderId, userId]
        );

        // Notify original sender of read receipt
        io.to(`user_${senderId}`).emit('messages_read', {
          readerId: userId,
          readAt: new Date().toISOString()
        });
      } catch (err) {
        console.error('Socket mark_as_read error:', err);
      }
    });

    /**
     * Handle Disconnect
     */
    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: User ${socket.user.name} (ID: ${userId})`);
    });
  });
}

module.exports = {
  initChatSocket
};
