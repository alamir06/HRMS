import jwt from "jsonwebtoken";
import pool from "../config/database.js";

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await pool.execute(
      `SELECT 
         BIN_TO_UUID(u.id) AS id,
         u.username,
         u.is_active,
         u.must_change_password,
         BIN_TO_UUID(u.employee_id) AS employee_id,
         e.employee_role,
         e.employment_status,
         ep.first_name,
         ep.middle_name,
         ep.last_name
       FROM users u
       JOIN employee e ON u.employee_id = e.id
       LEFT JOIN employee_personal ep ON e.id = ep.employee_id
       WHERE u.id = UUID_TO_BIN(?) AND u.is_active = TRUE
       LIMIT 1`,
      [decoded.userId]
    );

    if (!rows.length) {
      return res.status(401).json({ error: "User not found or inactive" });
    }

    const user = rows[0];
    req.user = {
      id: user.id,
      username: user.username,
      role: user.employee_role,
      employmentStatus: user.employment_status,
      employeeId: user.employee_id,
      mustChangePassword: Boolean(user.must_change_password),
      name: [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(" ") || user.username,
    };

    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
};
