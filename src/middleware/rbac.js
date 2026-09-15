/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts route access to specific roles ('Student', 'Client', 'Admin')
 * @param  {...string} allowedRoles
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Authentication required.'
      });
    }

    if (!allowedRoles.includes(req.user.Role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Role '${req.user.Role}' does not have permission to access this resource. Allowed roles: [${allowedRoles.join(', ')}].`
      });
    }

    next();
  };
}

module.exports = {
  authorizeRoles
};
