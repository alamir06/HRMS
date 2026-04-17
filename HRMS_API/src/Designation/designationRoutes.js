import express from "express";
import { v4 as uuidv4 } from "uuid";
import pool from "../../config/database.js";
import { createCrudRouter } from "../Commons/CommonRouter.js";
import { designationValidationSchema } from "./designationValidation.js";
import { authenticateToken, authorize } from "../../middleware/auth.js";
import designationCustomController from "./designationController.js";
import { sendEmail } from "../../utils/emailService.js";

const assignManagerForDesignation = async (connection, designationId) => {
  const [rows] = await connection.query(
    `SELECT des.title,
            BIN_TO_UUID(des.employeeId) AS employeeId,
            BIN_TO_UUID(des.departmentId) AS departmentId,
            BIN_TO_UUID(des.collegeId) AS collegeId,
            d.departmentType,
            ep.firstName,
            ep.lastName,
            ep.personalEmail
       FROM designations des
       LEFT JOIN department d ON des.departmentId = d.id
       LEFT JOIN employeePersonal ep ON des.employeeId = ep.employeeId
       LEFT JOIN employeeEmployment ee ON des.employeeId = ee.employeeId
      WHERE des.id = UUID_TO_BIN(?)
      LIMIT 1`,
    [designationId]
  );

  if (!rows.length) return;

  const { title, employeeId, departmentId: deptId, collegeId, departmentType: deptType, firstName, lastName, personalEmail } = rows[0];
  if (!employeeId) return;

  const titleStr = (title || "").toLowerCase();
  const isHead = titleStr.includes("head");
  const isDea = titleStr.includes("dea") || titleStr.includes("dean");

  // 1. UPDATE EMPLOYEE ROLE, DEPARTMENT, AND TYPE
  let roleQueryPart = "";
  if (isHead) roleQueryPart = "employeeRole = 'HEAD'";
  else if (isDea) roleQueryPart = "employeeRole = 'DEAN'";
  else roleQueryPart = "employeeRole = 'EMPLOYEE'"; // dynamically strip previous structural authority when moving to normal roles

  if (deptId && deptType) {
    // Structurally transfer the employee into this specific department and adopt its Type (e.g. ACADEMIC/ADMINISTRATIVE)
    await connection.query(
      `UPDATE employee 
          SET ${roleQueryPart},
              departmentId = UUID_TO_BIN(?),
              employeeType = ?
        WHERE id = UUID_TO_BIN(?)`,
      [deptId, deptType, employeeId]
    );
  } else {
    // If no department is designated (e.g., College Dean), just update their structural role mapping
    await connection.query(
      `UPDATE employee SET ${roleQueryPart} WHERE id = UUID_TO_BIN(?)`,
      [employeeId]
    );
  }

  // 2. HIERARCHY CASCADING
  if (isHead && deptId) {
    await connection.query(
      `UPDATE department SET managerId = UUID_TO_BIN(?) WHERE id = UUID_TO_BIN(?)`,
      [employeeId, deptId]
    );

    // Set this person as the managerId for ALL employees inside this department
    await connection.query(
      `UPDATE employee SET managerId = UUID_TO_BIN(?) WHERE departmentId = UUID_TO_BIN(?) AND id != UUID_TO_BIN(?)`,
      [employeeId, deptId, employeeId]
    );

    // Get the collegeId of this department to find the Dean
    const [deptRows] = await connection.query(
      `SELECT BIN_TO_UUID(collegeId) as collegeId FROM department WHERE id = UUID_TO_BIN(?)`,
      [deptId]
    );
    if (deptRows.length && deptRows[0].collegeId) {
       const colId = deptRows[0].collegeId;
       // Find the Dean of this college (if any) and set as Head's manager
       const [deanRows] = await connection.query(
         `SELECT BIN_TO_UUID(employeeId) as deanId 
            FROM designations 
           WHERE collegeId = UUID_TO_BIN(?) 
             AND (LOWER(title) LIKE '%dean%' OR LOWER(title) LIKE '%dea%') 
             AND status = 'ACTIVE' LIMIT 1`,
         [colId]
       );
       if (deanRows.length && deanRows[0].deanId) {
          await connection.query(
            `UPDATE employee SET managerId = UUID_TO_BIN(?) WHERE id = UUID_TO_BIN(?)`,
            [deanRows[0].deanId, employeeId]
          );
       }
    }
  }

  if (isDea && collegeId) {
    // Find all Departments inside this College
    const [collegeDepts] = await connection.query(
      `SELECT BIN_TO_UUID(id) as deptId FROM department WHERE collegeId = UUID_TO_BIN(?)`,
      [collegeId]
    );
    // For each department, update its Head's managerId to this Dean's ID
    if (collegeDepts.length > 0) {
      for (const dept of collegeDepts) {
        await connection.query(
           `UPDATE employee SET managerId = UUID_TO_BIN(?) WHERE departmentId = UUID_TO_BIN(?) AND employeeRole = 'HEAD'`,
           [employeeId, dept.deptId]
        );
      }
    }

    // Set the Dean's managerId to the HR Manager's ID
    const [hrRows] = await connection.query(
      `SELECT BIN_TO_UUID(employeeId) as hrId FROM users WHERE systemRole = 'HRMANAGER' LIMIT 1`
    );
    if (hrRows.length && hrRows[0].hrId) {
       await connection.query(
         `UPDATE employee SET managerId = UUID_TO_BIN(?) WHERE id = UUID_TO_BIN(?)`,
         [hrRows[0].hrId, employeeId]
       );
    }
  }

  // 3. Auto-assign System Role based on designation title
  let systemRole = 'EMPLOYEE';
  if (isDea) systemRole = 'DEAN';
  else if (isHead) systemRole = 'HEAD';
  else if (titleStr.includes("hr manager") || titleStr.includes("hrmanager")) systemRole = 'HRMANAGER';
  else if (titleStr.includes("hr officer") || titleStr.includes("hrofficer")) systemRole = 'HROFFICER';
  else if (titleStr.includes("recruiter")) systemRole = 'RECRUITER';
  else if (titleStr.includes("payroll")) systemRole = 'PAYROLLOFFICER';

  if (systemRole !== 'EMPLOYEE') {
    await connection.query(
      `UPDATE users SET systemRole = ? WHERE employeeId = UUID_TO_BIN(?)`,
      [systemRole, employeeId]
    );
  }

  // 4. Send Email Notification
  if (personalEmail) {
    try {
      await sendEmail({
        to: personalEmail,
        subject: `Notice of Designation: ${title}`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
            <h2>Congratulations ${firstName || 'Employee'} ${lastName || ''},</h2>
            <p>You have officially been designated as <strong>${title}</strong>.</p>
            <p>Your Role has been appropriately updated in the system architecture, routing the necessary personnel under your management.</p>
            <br/>
            <p><strong>Note:</strong> Your login credentials remain identical. Please login to review your newly granted portal access.</p>
            <br/>
            <p>Regards,<br>HR Management Team</p>
          </div>
        `
      });
    } catch (e) {
      console.error("Failed to email designation notice", e);
    }
  }
};

const designationRouter = express.Router();
// Custom create with manager auto-assign
designationRouter.post(
  "/",
  authenticateToken,
  authorize("HRMANAGER"),
  async (req, res) => {
    try {
      const payload = designationValidationSchema.create.parse(req.body);
      const id = uuidv4();
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        const {
          employeeId,
          departmentId,
          collegeId,
          title,
          titleAmharic,
          jobDescription,
          jobDescriptionAmharic,
          gradeLevel,
          minSalary,
          maxSalary,
          status = "ACTIVE",
        } = payload;

        await connection.query(
          `INSERT INTO designations (
            id, employeeId, departmentId, collegeId, title, titleAmharic,
            jobDescription, jobDescriptionAmharic, gradeLevel, minSalary, maxSalary, status
          ) VALUES (
            UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, ?, ?, ?, ?, ?, ?
          )`,
          [
            id,
            employeeId,
            departmentId || null,
            collegeId || null,
            title,
            titleAmharic || null,
            jobDescription || null,
            jobDescriptionAmharic || null,
            gradeLevel || null,
            minSalary ?? null,
            maxSalary ?? null,
            status,
          ]
        );

        await assignManagerForDesignation(connection, id);

        const [newDesig] = await connection.query(`
          SELECT 
            BIN_TO_UUID(des.id) as id,
            BIN_TO_UUID(des.employeeId) as employeeId,
            COALESCE(BIN_TO_UUID(des.departmentId), BIN_TO_UUID(e.departmentId)) as departmentId,
            COALESCE(BIN_TO_UUID(des.collegeId), BIN_TO_UUID(d.collegeId), BIN_TO_UUID(empDept.collegeId)) as collegeId,
            des.title,
            des.titleAmharic,
            des.gradeLevel,
            des.status,
            COALESCE(d.departmentName, empDept.departmentName) as departmentName,
            COALESCE(c.collegeName, dCollege.collegeName, empCollege.collegeName) as collegeName,
            ep.firstName,
            ep.lastName,
            ep.personalEmail,
            des.createdAt
          FROM designations des
          LEFT JOIN department d ON des.departmentId = d.id
          LEFT JOIN college c ON des.collegeId = c.id
          LEFT JOIN college dCollege ON d.collegeId = dCollege.id
          LEFT JOIN employee e ON des.employeeId = e.id
          LEFT JOIN department empDept ON e.departmentId = empDept.id
          LEFT JOIN college empCollege ON empDept.collegeId = empCollege.id
          LEFT JOIN employeePersonal ep ON des.employeeId = ep.employeeId
          WHERE des.id = UUID_TO_BIN(?)
        `, [id]);

        await connection.commit();

        return res.status(201).json({ success: true, message: "Designation created successfully", data: newDesig[0] });
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error("Create designation error", error);
      return res.status(400).json({ success: false, error: error.message || "Failed to create designation" });
    }
  }
);

// Custom update with manager auto-assign
designationRouter.put(
  "/:id",
  authenticateToken,
  authorize("HRMANAGER"),
  async (req, res) => {
    const { id } = req.params;
    try {
      const payload = designationValidationSchema.update.parse(req.body);
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        const fields = [];
        const values = [];

        Object.entries(payload).forEach(([key, value]) => {
          if (value === undefined) return;
          if (key.endsWith("_id")) {
            fields.push(`${key} = UUID_TO_BIN(?)`);
            values.push(value);
          } else {
            fields.push(`${key} = ?`);
            values.push(value);
          }
        });

        if (!fields.length) {
          throw new Error("No valid fields to update");
        }

        const updateQuery = `UPDATE designations SET ${fields.join(", ")}, updatedAt = NOW() WHERE id = UUID_TO_BIN(?)`;
        values.push(id);

        const [result] = await connection.query(updateQuery, values);

        if (result.affectedRows === 0) {
          throw new Error("Designation not found");
        }

        await assignManagerForDesignation(connection, id);

        await connection.commit();

        return res.json({ success: true, message: "Designation updated" });
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error("Update designation error", error);
      return res.status(400).json({ success: false, error: error.message || "Failed to update designation" });
    }
  }
);

// Fallback CRUD for read/delete/list
const designationCrudRouter = createCrudRouter({
  routePath: "/",
  tableName: "designations",
  validationSchema: designationValidationSchema,
  uuidEnabled: true,
  uuidFields: ["id", "employeeId", "departmentId", "collegeId"],
  createRoles: ["HRMANAGER"],
  readRoles: null,
  updateRoles: ["HRMANAGER"],
  deleteRoles: ["HRMANAGER"],
});

designationRouter.use("/", designationCrudRouter);

// Get designations by department
designationRouter.get(
  "/department/:departmentId",
  authenticateToken,
  authorize('HRMANAGER'),
  designationCustomController.getDesignationsByDepartment
);

// Statistics
designationRouter.get(
  "/stats/dashboard",
    authenticateToken,
    authorize('HRMANAGER'),
  designationCustomController.getDesignationStats
);

// Search operations
designationRouter.get(
  "/search/global",
  authenticateToken,
  authorize('HRMANAGER'),
  designationCustomController.searchDesignations
);

// Bulk operations
designationRouter.post(
  "/bulk/update-status",
  authenticateToken,
  authorize('HRMANAGER'),
  designationCustomController.bulkUpdateStatus
);

export { designationRouter };
