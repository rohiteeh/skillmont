const jwt = require('jsonwebtoken');
const db = require('../config/db');

/**
 * Middleware to authenticate JWT Bearer Token
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.split(' ')[1] 
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required. Please authenticate via /api/auth/login.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'skillmint_secret');

    // Retrieve fresh user status and details from database
    const users = await db.query(
      'SELECT UserID, Name, Email, Role, Status FROM Users WHERE UserID = ?',
      [decoded.userId]
    );

    if (!users || users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session. User no longer exists.'
      });
    }

    const user = users[0];

    if (user.Status === 'Suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account has been suspended. Please contact administrator.'
      });
    }

    // Attach verified user payload to request
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please log in again.'
      });
    }
    return res.status(403).json({
      success: false,
      message: 'Invalid or malformed authentication token.'
    });
  }
}

module.exports = {
  authenticateToken
};
