/**
 * Input sanitization and validation middleware helpers
 */

function validateRegister(req, res, next) {
  const { Name, Email, Password, Role } = req.body;

  if (!Name || typeof Name !== 'string' || Name.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Name is required and must be at least 2 characters long.'
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!Email || !emailRegex.test(Email)) {
    return res.status(400).json({
      success: false,
      message: 'A valid email address is required.'
    });
  }

  if (!Password || typeof Password !== 'string' || Password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password is required and must be at least 6 characters long.'
    });
  }

  const validRoles = ['Student', 'Client', 'Admin'];
  if (Role && !validRoles.includes(Role)) {
    return res.status(400).json({
      success: false,
      message: `Invalid role specified. Must be one of: ${validRoles.join(', ')}.`
    });
  }

  next();
}

function validateLogin(req, res, next) {
  const { Email, Password } = req.body;

  if (!Email || !Password) {
    return res.status(400).json({
      success: false,
      message: 'Both Email and Password are required.'
    });
  }

  next();
}

function validateProject(req, res, next) {
  const { Title, Description, Category, RequiredSkills, Budget, Deadline } = req.body;

  if (!Title || Title.trim().length < 5) {
    return res.status(400).json({
      success: false,
      message: 'Project Title is required (minimum 5 characters).'
    });
  }

  if (!Description || Description.trim().length < 15) {
    return res.status(400).json({
      success: false,
      message: 'Project Description is required (minimum 15 characters).'
    });
  }

  if (!RequiredSkills || RequiredSkills.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Required skills must be specified (comma-separated).'
    });
  }

  if (Budget === undefined || isNaN(Number(Budget)) || Number(Budget) < 0) {
    return res.status(400).json({
      success: false,
      message: 'Budget must be a non-negative number.'
    });
  }

  if (!Deadline) {
    return res.status(400).json({
      success: false,
      message: 'Project Deadline is required.'
    });
  }

  const deadlineDate = new Date(Deadline);
  if (isNaN(deadlineDate.getTime())) {
    return res.status(400).json({
      success: false,
      message: 'Invalid deadline date format.'
    });
  }

  next();
}

function validateApplication(req, res, next) {
  const { ProjectID, CoverMessage } = req.body;

  if (!ProjectID || isNaN(Number(ProjectID))) {
    return res.status(400).json({
      success: false,
      message: 'A valid ProjectID is required.'
    });
  }

  if (!CoverMessage || CoverMessage.trim().length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Cover message is required (minimum 10 characters).'
    });
  }

  next();
}

module.exports = {
  validateRegister,
  validateLogin,
  validateProject,
  validateApplication
};
