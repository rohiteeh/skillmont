const db = require('../config/db');

/**
 * Create a new Project (Clients only)
 */
async function createProject(req, res, next) {
  try {
    const { Title, Description, Category = 'Web Development', RequiredSkills, Budget = 0, Deadline } = req.body;
    const clientId = req.user.UserID;

    const result = await db.query(
      `INSERT INTO Projects (ClientID, Title, Description, Category, RequiredSkills, Budget, Deadline, Status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Open')`,
      [clientId, Title.trim(), Description.trim(), Category.trim(), RequiredSkills.trim(), Number(Budget), Deadline]
    );

    const newProjectId = result.insertId;

    res.status(201).json({
      success: true,
      message: 'Project posted successfully.',
      data: {
        ProjectID: newProjectId,
        ClientID: clientId,
        Title: Title.trim(),
        Category: Category.trim(),
        RequiredSkills: RequiredSkills.trim(),
        Budget: Number(Budget),
        Deadline,
        Status: 'Open'
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * List / Search Projects with filters (Category, Skills, Search Keyword, Status)
 */
async function getProjects(req, res, next) {
  try {
    const { category, skills, search, status = 'Open' } = req.query;

    let sql = `
      SELECT p.*, u.Name AS ClientName, u.Email AS ClientEmail, cp.CompanyName,
             (SELECT COUNT(*) FROM Applications a WHERE a.ProjectID = p.ProjectID) AS ApplicationCount
      FROM Projects p
      JOIN Users u ON p.ClientID = u.UserID
      LEFT JOIN ClientProfile cp ON u.UserID = cp.UserID
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      sql += ` AND p.Status = ?`;
      params.push(status);
    }

    if (category) {
      sql += ` AND p.Category LIKE ?`;
      params.push(`%${category}%`);
    }

    if (skills) {
      sql += ` AND p.RequiredSkills LIKE ?`;
      params.push(`%${skills}%`);
    }

    if (search) {
      sql += ` AND (p.Title LIKE ? OR p.Description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY p.CreatedAt DESC`;

    const projects = await db.query(sql, params);

    res.json({
      success: true,
      count: projects.length,
      data: projects
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get Project by ID
 */
async function getProjectById(req, res, next) {
  try {
    const projectId = req.params.id;

    const projects = await db.query(
      `SELECT p.*, u.Name AS ClientName, u.Email AS ClientEmail, cp.CompanyName, cp.Industry, cp.Rating AS ClientRating,
              (SELECT COUNT(*) FROM Applications a WHERE a.ProjectID = p.ProjectID) AS ApplicationCount
       FROM Projects p
       JOIN Users u ON p.ClientID = u.UserID
       LEFT JOIN ClientProfile cp ON u.UserID = cp.UserID
       WHERE p.ProjectID = ?`,
      [projectId]
    );

    if (projects.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    res.json({
      success: true,
      data: projects[0]
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get Current Client's Posted Projects
 */
async function getMyClientProjects(req, res, next) {
  try {
    const clientId = req.user.UserID;

    const projects = await db.query(
      `SELECT p.*,
              (SELECT COUNT(*) FROM Applications a WHERE a.ProjectID = p.ProjectID) AS ApplicationCount
       FROM Projects p
       WHERE p.ClientID = ?
       ORDER BY p.CreatedAt DESC`,
      [clientId]
    );

    res.json({
      success: true,
      count: projects.length,
      data: projects
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update Project Details / Status
 */
async function updateProject(req, res, next) {
  try {
    const projectId = req.params.id;
    const userId = req.user.UserID;
    const userRole = req.user.Role;

    // Check project ownership unless Admin
    const existing = await db.query('SELECT * FROM Projects WHERE ProjectID = ?', [projectId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    if (existing[0].ClientID !== userId && userRole !== 'Admin') {
      return res.status(403).json({ success: false, message: 'You are not authorized to update this project.' });
    }

    const { Title, Description, Category, RequiredSkills, Budget, Deadline, Status } = req.body;

    await db.query(
      `UPDATE Projects
       SET Title = COALESCE(?, Title),
           Description = COALESCE(?, Description),
           Category = COALESCE(?, Category),
           RequiredSkills = COALESCE(?, RequiredSkills),
           Budget = COALESCE(?, Budget),
           Deadline = COALESCE(?, Deadline),
           Status = COALESCE(?, Status)
       WHERE ProjectID = ?`,
      [Title, Description, Category, RequiredSkills, Budget !== undefined ? Number(Budget) : null, Deadline, Status, projectId]
    );

    res.json({
      success: true,
      message: 'Project updated successfully.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete Project
 */
async function deleteProject(req, res, next) {
  try {
    const projectId = req.params.id;
    const userId = req.user.UserID;
    const userRole = req.user.Role;

    const existing = await db.query('SELECT * FROM Projects WHERE ProjectID = ?', [projectId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    if (existing[0].ClientID !== userId && userRole !== 'Admin') {
      return res.status(403).json({ success: false, message: 'You are not authorized to delete this project.' });
    }

    await db.query('DELETE FROM Projects WHERE ProjectID = ?', [projectId]);

    res.json({
      success: true,
      message: 'Project deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  getMyClientProjects,
  updateProject,
  deleteProject
};
