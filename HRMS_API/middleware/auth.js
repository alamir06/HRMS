import jwt from "jsonwebtoken";
import pool from "../config/database.js";

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Access Token Required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.execute(
      `SELECT 
         BIN_TO_UUID(u.id) AS id,
         u.username,
         u.isActive,
         u.mustChangePassword,
         BIN_TO_UUID(u.employeeId) AS employeeId,
         e.employeeRole,
         e.employmentStatus,
         ep.firstName,
         ep.middleName,
         ep.lastName
       FROM users u
       JOIN employee e ON u.employeeId = e.id
       LEFT JOIN employeePersonal ep ON e.id = ep.employeeId
       WHERE u.id = UUID_TO_BIN(?) AND u.isActive = TRUE
       LIMIT 1`,
      [decoded.userId]
    );

    if (!rows.length) {
      return res.status(401).json({ error: "User Not Found or Inactive" });
    }

    const user = rows[0];
    req.user = {
      id: user.id,
      username: user.username,
      role: user.employeeRole,
      employmentStatus: user.employmentStatus,
      employeeId: user.employeeId,
      mustChangePassword: Boolean(user.mustChangePassword),
      name: [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ") || user.username,
    };

    if (
      req.user.employmentStatus === 'ONLEAVE' &&
      req.method !== 'GET' &&
      !req.originalUrl.includes('/auth/change-password')
    ) {
      return res.status(403).json({ error: "Access denied. Actions are restricted to view-only while on leave." });
    }

    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or Expired Token" });
  }
};
  
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient Permissions" });
    }
    next();
  };
};
