const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');
const { validateProject } = require('../middleware/validation');

// Public project browsing & details
router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProjectById);

// Client-only endpoints
router.post(
  '/',
  authenticateToken,
  authorizeRoles('Client'),
  validateProject,
  projectController.createProject
);

router.get(
  '/my/client',
  authenticateToken,
  authorizeRoles('Client'),
  projectController.getMyClientProjects
);

// Update/Delete project (Client owner or Admin)
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('Client', 'Admin'),
  projectController.updateProject
);

router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('Client', 'Admin'),
  projectController.deleteProject
);

module.exports = router;
