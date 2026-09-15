const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');
const { validateApplication } = require('../middleware/validation');

// Student submits an application
router.post(
  '/',
  authenticateToken,
  authorizeRoles('Student'),
  validateApplication,
  applicationController.applyToProject
);

// Student views their own submitted applications
router.get(
  '/my',
  authenticateToken,
  authorizeRoles('Student'),
  applicationController.getMyApplications
);

// Client views applications for a specific project
router.get(
  '/project/:projectId',
  authenticateToken,
  authorizeRoles('Client', 'Admin'),
  applicationController.getProjectApplications
);

// Client accepts / rejects applicant
router.patch(
  '/:id/status',
  authenticateToken,
  authorizeRoles('Client', 'Admin'),
  applicationController.updateApplicationStatus
);

module.exports = router;
