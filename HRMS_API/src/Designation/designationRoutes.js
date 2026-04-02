import express from "express";
import { v4 as uuidv4 } from "uuid";
import pool from "../../config/database.js";
import { createCrudRouter } from "../Commons/CommonRouter.js";
import { designationValidationSchema } from "./designationValidation.js";
import { authenticateToken, authorize } from "../../middleware/auth.js";
import designationCustomController from "./designationController.js";

const assignManagerForDesignation = async (connection, designationId) => {
  const [rows] = await connection.query(
    `SELECT des.title,
            BIN_TO_UUID(des.employeeId) AS employeeId,
            BIN_TO_UUID(des.departmentId) AS departmentId,
            d.departmentType
       FROM designations des
       LEFT JOIN department d ON des.departmentId = d.id
      WHERE des.id = UUID_TO_BIN(?)
      LIMIT 1`,
    [designationId]
  );

  if (!rows.length) return;

  const { title, employeeId: employeeId, departmentId: deptId, departmentType: deptType } = rows[0];
  if (!employeeId || !deptId) return;

  const t = (title || "").toLowerCase();
  const isAcademic = deptType === "ACADEMIC";
  const isHead = t.includes("HEAD");
  const isManager = t.includes("manager");
  const isDea = t.includes("dea") || t.includes("DEAN");

  if (isDea) return;

  const shouldAssign = (isAcademic && isHead) || (!isAcademic && (isManager || !isHead));

  if (shouldAssign) {
    await connection.query(
      `UPDATE department SET managerId = UUID_TO_BIN(?) WHERE id = UUID_TO_BIN(?)`,
      [employeeId, deptId]
    );
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

        await connection.commit();

        return res.status(201).json({ success: true, data: { id } });
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
