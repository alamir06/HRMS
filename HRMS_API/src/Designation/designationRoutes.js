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
            BIN_TO_UUID(des.employee_id) AS employee_id,
            BIN_TO_UUID(des.department_id) AS department_id,
            d.department_type
       FROM designations des
       LEFT JOIN department d ON des.department_id = d.id
      WHERE des.id = UUID_TO_BIN(?)
      LIMIT 1`,
    [designationId]
  );

  if (!rows.length) return;

  const { title, employee_id: employeeId, department_id: deptId, department_type: deptType } = rows[0];
  if (!employeeId || !deptId) return;

  const t = (title || "").toLowerCase();
  const isAcademic = deptType === "academic";
  const isHead = t.includes("head");
  const isManager = t.includes("manager");
  const isDea = t.includes("dea") || t.includes("dean");

  if (isDea) return;

  const shouldAssign = (isAcademic && isHead) || (!isAcademic && (isManager || !isHead));

  if (shouldAssign) {
    await connection.query(
      `UPDATE department SET manager_id = UUID_TO_BIN(?) WHERE id = UUID_TO_BIN(?)`,
      [employeeId, deptId]
    );
  }
};

const designationRouter = express.Router();
// Custom create with manager auto-assign
designationRouter.post(
  "/",
  authenticateToken,
  authorize("HR_MANAGER"),
  async (req, res) => {
    try {
      const payload = designationValidationSchema.create.parse(req.body);
      const id = uuidv4();
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        const {
          employee_id,
          department_id,
          college_id,
          title,
          title_amharic,
          job_description,
          job_description_amharic,
          grade_level,
          min_salary,
          max_salary,
          status = "active",
        } = payload;

        await connection.query(
          `INSERT INTO designations (
            id, employee_id, department_id, college_id, title, title_amharic,
            job_description, job_description_amharic, grade_level, min_salary, max_salary, status
          ) VALUES (
            UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, ?, ?, ?, ?, ?, ?
          )`,
          [
            id,
            employee_id,
            department_id || null,
            college_id || null,
            title,
            title_amharic || null,
            job_description || null,
            job_description_amharic || null,
            grade_level || null,
            min_salary ?? null,
            max_salary ?? null,
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
  authorize("HR_MANAGER"),
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

        const updateQuery = `UPDATE designations SET ${fields.join(", ")}, updated_at = NOW() WHERE id = UUID_TO_BIN(?)`;
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
  uuidFields: ["id", "employee_id", "department_id", "college_id"],
  createRoles: ["HR_MANAGER"],
  readRoles: null,
  updateRoles: ["HR_MANAGER"],
  deleteRoles: ["HR_MANAGER"],
});

designationRouter.use("/", designationCrudRouter);

// Get designations by department
designationRouter.get(
  "/department/:departmentId",
  authenticateToken,
  authorize('HR_MANAGER'),
  designationCustomController.getDesignationsByDepartment
);

// Statistics
designationRouter.get(
  "/stats/dashboard",
    authenticateToken,
    authorize('HR_MANAGER'),
  designationCustomController.getDesignationStats
);

// Search operations
designationRouter.get(
  "/search/global",
  authenticateToken,
  authorize('HR_MANAGER'),
  designationCustomController.searchDesignations
);

// Bulk operations
designationRouter.post(
  "/bulk/update-status",
  authenticateToken,
  authorize('HR_MANAGER'),
  designationCustomController.bulkUpdateStatus
);

export { designationRouter };
