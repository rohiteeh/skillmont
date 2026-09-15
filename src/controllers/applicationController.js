const db = require('../config/db');

/**
 * Student applies to a project
 * POST /api/applications
 */
async function applyToProject(req, res, next) {
  try {
    const studentId = req.user.UserID;
    const { ProjectID, CoverMessage, PortfolioLink, ProposedTimeline, BidAmount } = req.body;

    // Verify project exists and is Open
    const projects = await db.query('SELECT ProjectID, ClientID, Status FROM Projects WHERE ProjectID = ?', [ProjectID]);
    if (projects.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    const project = projects[0];
    if (project.Status !== 'Open') {
      return res.status(400).json({
        success: false,
        message: `Cannot apply to this project because its status is '${project.Status}'. Only 'Open' projects accept applications.`
      });
    }

    if (project.ClientID === studentId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot apply to your own project.'
      });
    }

    // Check for duplicate application
    const existing = await db.query(
      'SELECT ApplicationID FROM Applications WHERE ProjectID = ? AND StudentID = ?',
      [ProjectID, studentId]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'You have already submitted an application for this project.'
      });
    }

    // Insert new application
    const result = await db.query(
      `INSERT INTO Applications (ProjectID, StudentID, CoverMessage, PortfolioLink, ProposedTimeline, BidAmount, Status)
       VALUES (?, ?, ?, ?, ?, ?, 'Submitted')`,
      [
        ProjectID,
        studentId,
        CoverMessage.trim(),
        PortfolioLink ? PortfolioLink.trim() : null,
        ProposedTimeline ? ProposedTimeline.trim() : 'As specified in deadline',
        BidAmount !== undefined && BidAmount !== null ? Number(BidAmount) : null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully.',
      data: {
        ApplicationID: result.insertId,
        ProjectID,
        StudentID: studentId,
        Status: 'Submitted'
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Student retrieves their submitted applications
 * GET /api/applications/my
 */
async function getMyApplications(req, res, next) {
  try {
    const studentId = req.user.UserID;

    const applications = await db.query(
      `SELECT a.*, p.Title AS ProjectTitle, p.Category, p.Budget, p.Deadline, p.Status AS ProjectStatus,
              u.Name AS ClientName, u.Email AS ClientEmail, cp.CompanyName
       FROM Applications a
       JOIN Projects p ON a.ProjectID = p.ProjectID
       JOIN Users u ON p.ClientID = u.UserID
       LEFT JOIN ClientProfile cp ON u.UserID = cp.UserID
       WHERE a.StudentID = ?
       ORDER BY a.AppliedDate DESC`,
      [studentId]
    );

    res.json({
      success: true,
      count: applications.length,
      data: applications
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Client views applications submitted for one of their projects
 * GET /api/applications/project/:projectId
 */
async function getProjectApplications(req, res, next) {
  try {
    const projectId = req.params.projectId;
    const clientId = req.user.UserID;
    const userRole = req.user.Role;

    // Verify client owns the project (or is Admin)
    const projects = await db.query('SELECT ClientID, Title FROM Projects WHERE ProjectID = ?', [projectId]);
    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    if (projects[0].ClientID !== clientId && userRole !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Access denied. You do not own this project.' });
    }

    const applications = await db.query(
      `SELECT a.*, u.Name AS StudentName, u.Email AS StudentEmail,
              sp.Skills, sp.Department, sp.Semester, sp.Rating AS StudentRating, sp.CompletedProjects
       FROM Applications a
       JOIN Users u ON a.StudentID = u.UserID
       LEFT JOIN StudentProfile sp ON u.UserID = sp.UserID
       WHERE a.ProjectID = ?
       ORDER BY a.AppliedDate DESC`,
      [projectId]
    );

    res.json({
      success: true,
      projectTitle: projects[0].Title,
      count: applications.length,
      data: applications
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Client updates application status (Accept / Reject / UnderReview)
 * PATCH /api/applications/:id/status
 */
async function updateApplicationStatus(req, res, next) {
  try {
    const applicationId = req.params.id;
    const clientId = req.user.UserID;
    const userRole = req.user.Role;
    const { status } = req.body;

    const validStatuses = ['UnderReview', 'Accepted', 'Rejected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values are: ${validStatuses.join(', ')}.`
      });
    }

    // Check application & verify client owns the corresponding project
    const apps = await db.query(
      `SELECT a.*, p.ClientID, p.Status AS ProjectStatus, p.Title AS ProjectTitle
       FROM Applications a
       JOIN Projects p ON a.ProjectID = p.ProjectID
       WHERE a.ApplicationID = ?`,
      [applicationId]
    );

    if (apps.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Application not found.'
      });
    }

    const app = apps[0];

    if (app.ClientID !== clientId && userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. Only the project client owner can accept or reject applications.'
      });
    }

    // Update the application status
    await db.query(
      `UPDATE Applications
       SET Status = ?, UpdatedAt = datetime('now')
       WHERE ApplicationID = ?`,
      [status, applicationId]
    );

    // If accepted: trigger project status change to InProgress
    if (status === 'Accepted') {
      await db.query(
        `UPDATE Projects
         SET Status = 'InProgress', UpdatedAt = datetime('now')
         WHERE ProjectID = ?`,
        [app.ProjectID]
      );
    }

    res.json({
      success: true,
      message: `Application status updated to '${status}'.`,
      data: {
        ApplicationID: Number(applicationId),
        ProjectID: app.ProjectID,
        StudentID: app.StudentID,
        NewStatus: status,
        ProjectStatus: status === 'Accepted' ? 'InProgress' : app.ProjectStatus
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  applyToProject,
  getMyApplications,
  getProjectApplications,
  updateApplicationStatus
};
