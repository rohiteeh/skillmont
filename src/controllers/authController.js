const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

/**
 * Generate JWT Token
 */
function generateToken(user) {
  return jwt.sign(
    {
      userId: user.UserID,
      email: user.Email,
      role: user.Role,
      name: user.Name
    },
    process.env.JWT_SECRET || 'skillmint_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

/**
 * User Registration (Student, Client, Admin)
 */
async function register(req, res, next) {
  try {
    const { Name, Email, Password, Role = 'Student', Department, Semester, CompanyName, Industry } = req.body;

    // Check if email already exists
    const existing = await db.query('SELECT UserID FROM Users WHERE Email = ?', [Email.toLowerCase().trim()]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // Hash password with bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(Password, saltRounds);

    // Insert new user
    const userResult = await db.query(
      'INSERT INTO Users (Name, Email, Password, Role, Status) VALUES (?, ?, ?, ?, ?)',
      [Name.trim(), Email.toLowerCase().trim(), hashedPassword, Role, 'Active']
    );

    const userId = userResult.insertId;

    // Create associated profile based on role
    if (Role === 'Student') {
      await db.query(
        'INSERT INTO StudentProfile (UserID, Department, Semester) VALUES (?, ?, ?)',
        [userId, Department || 'Computer Applications', Semester || 'VI']
      );
    } else if (Role === 'Client') {
      await db.query(
        'INSERT INTO ClientProfile (UserID, CompanyName, Industry) VALUES (?, ?, ?)',
        [userId, CompanyName || 'Individual Client', Industry || 'Technology']
      );
    }

    const newUser = {
      UserID: userId,
      Name: Name.trim(),
      Email: Email.toLowerCase().trim(),
      Role,
      Status: 'Active'
    };

    const token = generateToken(newUser);

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: {
        user: newUser,
        token
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * User Login
 */
async function login(req, res, next) {
  try {
    const { Email, Password } = req.body;
    let searchEmail = (Email || '').toLowerCase().trim();
    if (searchEmail === 'admin') {
      searchEmail = 'admin@skillmint.org';
    }

    const users = await db.query(
      'SELECT UserID, Name, Email, Password, Role, Status FROM Users WHERE Email = ?',
      [searchEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const user = users[0];

    if (user.Status === 'Suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account suspended. Please contact administrator.'
      });
    }

    const isMatch = await bcrypt.compare(Password, user.Password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Fetch profile details
    let profile = null;
    if (user.Role === 'Student') {
      const sp = await db.query('SELECT * FROM StudentProfile WHERE UserID = ?', [user.UserID]);
      profile = sp[0] || null;
    } else if (user.Role === 'Client') {
      const cp = await db.query('SELECT * FROM ClientProfile WHERE UserID = ?', [user.UserID]);
      profile = cp[0] || null;
    }

    const token = generateToken(user);

    // Exclude password from response
    delete user.Password;

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        user,
        profile,
        token
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get Current Authenticated User Profile
 */
async function getProfile(req, res, next) {
  try {
    const user = req.user;
    let profile = null;

    if (user.Role === 'Student') {
      const sp = await db.query('SELECT * FROM StudentProfile WHERE UserID = ?', [user.UserID]);
      profile = sp[0] || {};
    } else if (user.Role === 'Client') {
      const cp = await db.query('SELECT * FROM ClientProfile WHERE UserID = ?', [user.UserID]);
      profile = cp[0] || {};
    }

    res.json({
      success: true,
      data: {
        user,
        profile
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update Profile Details
 */
async function updateProfile(req, res, next) {
  try {
    const userId = req.user.UserID;
    const role = req.user.Role;

    if (role === 'Student') {
      const { Skills, Department, Semester, Bio, PortfolioURL } = req.body;
      await db.query(
        `UPDATE StudentProfile 
         SET Skills = COALESCE(?, Skills), 
             Department = COALESCE(?, Department), 
             Semester = COALESCE(?, Semester), 
             Bio = COALESCE(?, Bio), 
             PortfolioURL = COALESCE(?, PortfolioURL),
             UpdatedAt = datetime('now')
         WHERE UserID = ?`,
        [Skills, Department, Semester, Bio, PortfolioURL, userId]
      );
    } else if (role === 'Client') {
      const { CompanyName, Industry, ContactInfo, Bio } = req.body;
      await db.query(
        `UPDATE ClientProfile 
         SET CompanyName = COALESCE(?, CompanyName), 
             Industry = COALESCE(?, Industry), 
             ContactInfo = COALESCE(?, ContactInfo), 
             Bio = COALESCE(?, Bio),
             UpdatedAt = datetime('now')
         WHERE UserID = ?`,
        [CompanyName, Industry, ContactInfo, Bio, userId]
      );
    }

    res.json({
      success: true,
      message: 'Profile updated successfully.'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile
};
