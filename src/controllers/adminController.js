const db = require('../config/db');

/**
 * Get Platform Statistics (Admin only)
 * GET /api/admin/stats
 */
async function getAdminStats(req, res, next) {
  try {
    const userCounts = await db.query(
      `SELECT Role, COUNT(*) AS count FROM Users GROUP BY Role`
    );

    const projectCounts = await db.query(
      `SELECT Status, COUNT(*) AS count FROM Projects GROUP BY Status`
    );

    const appCounts = await db.query(
      `SELECT COUNT(*) AS totalApps FROM Applications`
    );

    const stats = {
      totalStudents: 0,
      totalClients: 0,
      totalAdmins: 0,
      totalProjects: 0,
      openProjects: 0,
      inProgressProjects: 0,
      completedProjects: 0,
      totalApplications: appCounts[0]?.totalApps || 0
    };

    userCounts.forEach(r => {
      if (r.Role === 'Student') stats.totalStudents = r.count;
      if (r.Role === 'Client') stats.totalClients = r.count;
      if (r.Role === 'Admin') stats.totalAdmins = r.count;
    });

    projectCounts.forEach(r => {
      stats.totalProjects += r.count;
      if (r.Status === 'Open') stats.openProjects = r.count;
      if (r.Status === 'InProgress') stats.inProgressProjects = r.count;
      if (r.Status === 'Completed') stats.completedProjects = r.count;
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get all users with profiles (Admin only)
 * GET /api/admin/users
 */
async function getAllUsers(req, res, next) {
  try {
    const users = await db.query(
      `SELECT u.UserID, u.Name, u.Email, u.Role, u.Status, u.CreatedAt,
              sp.Department, sp.Semester, cp.CompanyName
       FROM Users u
       LEFT JOIN StudentProfile sp ON u.UserID = sp.UserID
       LEFT JOIN ClientProfile cp ON u.UserID = cp.UserID
       ORDER BY u.CreatedAt DESC`
    );

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update user status (Active / Suspended) (Admin only)
 * PATCH /api/admin/users/:id/status
 */
async function updateUserStatus(req, res, next) {
  try {
    const targetUserId = req.params.id;
    const { status } = req.body;

    if (!['Active', 'Suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be either Active or Suspended.'
      });
    }

    // Prevent admin from suspending themselves
    if (Number(targetUserId) === Number(req.user.UserID)) {
      return res.status(400).json({
        success: false,
        message: 'Admin cannot change their own account status.'
      });
    }

    await db.query(
      `UPDATE Users SET Status = ?, UpdatedAt = datetime('now') WHERE UserID = ?`,
      [status, targetUserId]
    );

    res.json({
      success: true,
      message: `User status updated to '${status}'.`
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAdminStats,
  getAllUsers,
  updateUserStatus
};
