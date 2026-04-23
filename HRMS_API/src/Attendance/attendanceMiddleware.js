import pool from "../../config/database.js";

// Helper to fetch extended user details (departmentId, collegeId)
const getExtendedDetails = async (employeeId) => {
  const [rows] = await pool.query(
    `SELECT e.employeeType, BIN_TO_UUID(e.departmentId) AS departmentId, BIN_TO_UUID(ea.collegeId) AS collegeId, BIN_TO_UUID(d.collegeId) as deptCollegeId
     FROM employee e
     LEFT JOIN employeeAcademic ea ON e.id = ea.employeeId
     LEFT JOIN department d ON e.departmentId = d.id
     WHERE e.id = UUID_TO_BIN(?)`,
    [employeeId]
  );
  if (!rows.length) return null;
  const data = rows[0];
  const effectiveCollegeId = data.collegeId || data.deptCollegeId;
  return {
    employeeType: data.employeeType,
    departmentId: data.departmentId,
    collegeId: effectiveCollegeId
  };
};

export const attendanceAuthGuard = async (req, res, next) => {
  try {
    const userRole = req.user.role;
    let targetEmployeeId = req.params.employeeId || req.body.employeeId;

    if (!targetEmployeeId && req.params.id) {
      const [att] = await pool.query(
        "SELECT BIN_TO_UUID(employeeId) as employeeId FROM attendance WHERE id = (?)",
        [req.params.id] // Wait, CrudRouter uses params.id string representing UUID if uuidEnabled
      );

      const [attSafe] = await pool.query(
        "SELECT BIN_TO_UUID(employeeId) as employeeId FROM attendance WHERE id = UUID_TO_BIN(?)",
        [req.params.id]
      );
      if (attSafe.length) {
        targetEmployeeId = attSafe[0].employeeId;
      }
    }

    if (!targetEmployeeId) {
      if (req.method === 'GET') return next(); // If no target employee context (e.g. list), proceed to list guard
      return res.status(400).json({ error: "Target employee identifier could not be determined" });
    }

    // Retrieve details for Requestor and Target
    const requestorDetails = await getExtendedDetails(req.user.employeeId);
    const targetDetails = await getExtendedDetails(targetEmployeeId);

    if (!targetDetails) {
      return res.status(404).json({ error: "Target employee not found" });
    }

    // --- CHECK FOR VIEWING (GET) ---
    if (req.method === 'GET') {
      if (userRole === 'HRMANAGER') return next();
      if (userRole === 'DEAN') {
        if (targetDetails.collegeId && requestorDetails.collegeId === targetDetails.collegeId) return next();
        return res.status(403).json({ error: "DEAN can only view attendance for employees in their college." });
      }
      if (userRole === 'HEAD') {
        if (targetDetails.departmentId && requestorDetails.departmentId === targetDetails.departmentId) return next();
         // Wait, the prompt says "tracke by department head and viewing...". 
         // If they have same department, HEAD can view tracking targets.
        return res.status(403).json({ error: "HEAD can only view attendance for employees in their department." });
      }
      // Employee looking at their own? (If we removed employee from general read, they won't even hit this, 
      // but if we allow them limited access to their own):
      if (req.user.employeeId === targetEmployeeId) {
         return next();
      }
      return res.status(403).json({ error: "Not authorized to view this employee's attendance" });
    }

    // --- CHECK FOR TRACKING (POST/PUT/PATCH/DELETE) ---
    if (targetDetails.employeeType === 'ACADEMIC') {
      if (userRole !== 'HEAD') {
        return res.status(403).json({ error: "Academic employee attendance can only be tracked by a HEAD." });
      }
      if (requestorDetails.departmentId !== targetDetails.departmentId) {
        return res.status(403).json({ error: "You can only track attendance for academics within your own department." });
      }
      return next();
    } else if (targetDetails.employeeType === 'ADMINISTRATIVE') {
      if (userRole !== 'HRMANAGER') {
        return res.status(403).json({ error: "Administrative employee attendance can only be tracked by an HRMANAGER." });
      }
      return next();
    } else {
       // What about OUTSOURCE etc.? default fallback
       if (userRole === 'HRMANAGER') return next();
       return res.status(403).json({ error: "Action blocked by RBAC framework." });
    }

  } catch (error) {
    console.error("Attendance RBAC Error:", error);
    res.status(500).json({ error: "Internal error enforcing authorization matrix." });
  }
};
