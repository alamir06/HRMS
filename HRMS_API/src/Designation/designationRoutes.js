import express from "express";
import { createCrudRouter } from "../Commons/CommonRouter.js";
import { designationValidationSchema } from "./designationValidation.js";
import { authenticateToken, authorize } from "../../middleware/auth.js";
import designationCustomController from "./designationController.js";

const designationRouter = express.Router();
const designationCrudRouter = createCrudRouter({
  routePath: "/",
  tableName: "designations",
  validationSchema: designationValidationSchema,
  uuidEnabled: true,
  uuidFields: ["id", "department_id"],
  createRoles: ["admin", "super_admin", "hr_manager"],
  readRoles: null,
  updateRoles: ["admin", "super_admin", "hr_manager"],
  deleteRoles: ["super_admin"],
});

designationRouter.use("/", designationCrudRouter);

// Get designations by department
designationRouter.get(
  "/department/:departmentId",
  // authenticateToken,
  // authorize('admin', 'super_admin', 'hr_manager', 'user'),
  designationCustomController.getDesignationsByDepartment
);

// Statistics
designationRouter.get(
  "/stats/dashboard",
  // authenticateToken,
  // authorize('admin', 'super_admin', 'hr_manager'),
  designationCustomController.getDesignationStats
);

// Search operations
designationRouter.get(
  "/search/global",
  // authenticateToken,
  // authorize('admin', 'super_admin', 'hr_manager', 'user'),
  designationCustomController.searchDesignations
);

// Bulk operations
designationRouter.post(
  "/bulk/update-status",
  // authenticateToken,
  // authorize('admin', 'super_admin'),
  designationCustomController.bulkUpdateStatus
);

export { designationRouter };
