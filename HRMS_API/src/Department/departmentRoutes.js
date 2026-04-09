// Get full parent hierarchy for a department (from child up to root)

import express from "express";
import { createCrudRouter } from "../Commons/CommonRouter.js";
import { departmentValidationSchema } from "./departmentValidation.js";
import { authenticateToken, authorize } from "../../middleware/auth.js";
import departmentCustomController from "./departmentController.js";
import { ensureDefaultCompanyIdInBody } from "../Commons/defaultCompany.js";
import pool from "../../config/database.js";

const validateDepartmentRelations = async (req, res, next) => {
  const { departmentType, collegeId, parentDepartmentId } = req.body;
  try {
    if (departmentType === 'ACADEMIC' && collegeId) {
      const [rows] = await pool.query('SELECT 1 FROM college WHERE id = UUID_TO_BIN(?)', [collegeId]);
      if (rows.length === 0) {
         return res.status(404).json({
            success: false,
            error: "Validation failed",
            details: [{ field: "collegeId", message: "The specified college does not exist." }]
         });
      }
    }
    
    if (departmentType === 'ADMINISTRATIVE' && parentDepartmentId) {
      const [rows] = await pool.query('SELECT 1 FROM department WHERE id = UUID_TO_BIN(?)', [parentDepartmentId]);
      if (rows.length === 0) {
         return res.status(404).json({
            success: false,
            error: "Validation failed",
            details: [{ field: "parentDepartmentId", message: "The specified parent department does not exist." }]
         });
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

const departmentRouter = express.Router();

const validateDepartmentDeletion = async (req, res, next) => {
  const { id } = req.params;
  try {
    const [childDepartments] = await pool.query('SELECT id FROM department WHERE parentDepartmentId = UUID_TO_BIN(?) LIMIT 1', [id]);
    if (childDepartments.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        message: "Cannot delete this department because it has child departments.",
        details: [{ field: "id", message: "Cannot delete this department because it has child departments." }]
      });
    }

    const [employees] = await pool.query('SELECT id FROM employee WHERE departmentId = UUID_TO_BIN(?) LIMIT 1', [id]);
    if (employees.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        message: "Cannot delete this department because it has employees assigned to it.",
        details: [{ field: "id", message: "Cannot delete this department because it has employees assigned to it." }]
      });
    }
    
    const [designations] = await pool.query('SELECT id FROM designations WHERE departmentId = UUID_TO_BIN(?) LIMIT 1', [id]);
    if (designations.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        message: "Cannot delete this department because it has designations associated with it.",
        details: [{ field: "id", message: "Cannot delete this department because it has designations associated with it." }]
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

const departmentCrudRouter = createCrudRouter({
  routePath: "/",
  tableName: "DEPARTMENT",
  validationSchema: departmentValidationSchema,
  uuidEnabled: true,
  displayNameField: "departmentName",
  entityLabel: "DEPARTMENT",
  uuidFields: ["id", "companyId", "collegeId", "managerId", "parentDepartmentId"],
  createRoles: ["HRMANAGER"],
  readRoles: ["HRMANAGER"],
  updateRoles: ["HRMANAGER"],
  deleteRoles: ["HRMANAGER"],
  middleware: {
    create: [ensureDefaultCompanyIdInBody(), validateDepartmentRelations],
    read: [],
    update: [validateDepartmentRelations],
    delete: [validateDepartmentDeletion],
    list: [],
    count: [],
  },
});

departmentRouter.use("/", departmentCrudRouter);
departmentRouter.get(
  "/company/:companyId",
  authenticateToken,
  authorize("HRMANAGER"),
  departmentCustomController.getDepartmentsByCompany
);

// Get departments by college
departmentRouter.get(
  "/college/:collegeId",
  authenticateToken,
  authorize("HRMANAGER"),
  departmentCustomController.getDepartmentsByCollege
);
departmentRouter.get(
  "/:departmentId/parent-hierarchy",
  authenticateToken,
  authorize("HRMANAGER"),
  departmentCustomController.getDepartmentParentHierarchy
);
// Get departments by parent (for administrative hierarchy)
departmentRouter.get(
  "/parent/:parentId",
  authenticateToken,
  authorize("HRMANAGER"),
  departmentCustomController.getDepartmentsByParent
);

// Statistics
departmentRouter.get(
  "/stats/dashboard",
  authenticateToken,
  authorize("HRMANAGER"),
  departmentCustomController.getDepartmentStats
);

// Update department manager
departmentRouter.patch(
  "/:id/manager",
  authenticateToken,
  authorize("HRMANAGER"),
  departmentCustomController.updateDepartmentManager
);

// Bulk operations
departmentRouter.post(
  "/bulk/update-status",
  authenticateToken,
  authorize("HRMANAGER"),
  departmentCustomController.bulkUpdateDepartmentStatus
);

departmentRouter.get(
  "/:id/with-details",
  authenticateToken,
  authorize("HRMANAGER"),
  departmentCustomController.getDepartmentWithDetails
);

departmentRouter.get(
  "/with-relations/all",
  authenticateToken,
  authorize("HRMANAGER"),
  departmentCustomController.getAllDepartmentsWithRelations
);
export { departmentRouter };
