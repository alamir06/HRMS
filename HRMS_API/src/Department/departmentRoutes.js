import express from "express";
import { createCrudRouter } from "../Commons/CommonRouter.js";
import { departmentValidationSchema } from "./departmentValidation.js";
import { authenticateToken, authorize } from "../../middleware/auth.js";
import departmentCustomController from "./departmentController.js";

const departmentRouter = express.Router();

const departmentCrudRouter = createCrudRouter({
  routePath: "/",
  tableName: "department",
  validationSchema: departmentValidationSchema,
  uuidEnabled: true,
  displayNameField: "department_name",
  entityLabel: "department",
  uuidFields: ["id", "company_id", "college_id", "manager_id"],
  createRoles: ["admin", "super_admin", "hr_manager"],
  readRoles: null,
  updateRoles: ["admin", "super_admin", "hr_manager"],
  deleteRoles: ["super_admin"],
});

departmentRouter.use("/", departmentCrudRouter);
departmentRouter.get(
  "/company/:companyId",
  authenticateToken,
  authorize("admin", "super_admin", "hr_manager", "user"),
  departmentCustomController.getDepartmentsByCompany
);

// Get departments by college
departmentRouter.get(
  "/college/:collegeId",
  authenticateToken,
  authorize("admin", "super_admin", "hr_manager", "user"),
  departmentCustomController.getDepartmentsByCollege
);

// Statistics
departmentRouter.get(
  "/stats/dashboard",
  authenticateToken,
  authorize("admin", "super_admin", "hr_manager"),
  departmentCustomController.getDepartmentStats
);

// Update department manager
departmentRouter.patch(
  "/:id/manager",
  authenticateToken,
  authorize("admin", "super_admin", "hr_manager"),
  departmentCustomController.updateDepartmentManager
);

// Bulk operations
departmentRouter.post(
  "/bulk/update-status",
  authenticateToken,
  authorize("admin", "super_admin"),
  departmentCustomController.bulkUpdateDepartmentStatus
);

departmentRouter.get(
  "/:id/with-details",
  // authenticateToken,
  // authorize("admin", "super_admin", "hr_manager", "user"),
  departmentCustomController.getDepartmentWithDetails
);

departmentRouter.get(
  "/with-relations/all",
  // authenticateToken,
  // authorize("admin", "super_admin", "hr_manager", "user"),
  departmentCustomController.getAllDepartmentsWithRelations
);
export { departmentRouter };
