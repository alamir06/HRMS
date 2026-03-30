// Get full parent hierarchy for a department (from child up to root)

import express from "express";
import { createCrudRouter } from "../Commons/CommonRouter.js";
import { departmentValidationSchema } from "./departmentValidation.js";
import { authenticateToken, authorize } from "../../middleware/auth.js";
import departmentCustomController from "./departmentController.js";
import { ensureDefaultCompanyIdInBody } from "../Commons/defaultCompany.js";

const departmentRouter = express.Router();

const departmentCrudRouter = createCrudRouter({
  routePath: "/",
  tableName: "DEPARTMENT",
  validationSchema: departmentValidationSchema,
  uuidEnabled: true,
  displayNameField: "departmentName",
  entityLabel: "DEPARTMENT",
  uuidFields: ["id", "companyId", "collegeId", "managerId", "parentDepartmentId"],
  createRoles: ["HRMANAGER"],
  readRoles: null,
  updateRoles: ["HRMANAGER"],
  deleteRoles: ["HRMANAGER"],
  middleware: {
    create: [ensureDefaultCompanyIdInBody()],
    read: [],
    update: [],
    delete: [],
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
