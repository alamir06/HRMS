import express from "express";
import { createCrudRouter } from "../Commons/CommonRouter.js";
import { departmentValidationSchema } from "./departmentValidation.js";
import { authenticateToken, authorize } from "../../middleware/auth.js";
import departmentCustomController from "./departmentController.js";
import { ensureDefaultCompanyIdInBody } from "../Commons/defaultCompany.js";

const departmentRouter = express.Router();

const departmentCrudRouter = createCrudRouter({
  routePath: "/",
  tableName: "department",
  validationSchema: departmentValidationSchema,
  uuidEnabled: true,
  displayNameField: "department_name",
  entityLabel: "department",
  uuidFields: ["id", "company_id", "college_id", "manager_id"],
  createRoles: ["HR_MANAGER"],
  readRoles: null,
  updateRoles: ["HR_MANAGER"],
  deleteRoles: ["HR_MANAGER"],
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
  authorize("HR_MANAGER"),
  departmentCustomController.getDepartmentsByCompany
);

// Get departments by college
departmentRouter.get(
  "/college/:collegeId",
  authenticateToken,
  authorize("HR_MANAGER"),
  departmentCustomController.getDepartmentsByCollege
);

// Statistics
departmentRouter.get(
  "/stats/dashboard",
  authenticateToken,
  authorize("HR_MANAGER"),
  departmentCustomController.getDepartmentStats
);

// Update department manager
departmentRouter.patch(
  "/:id/manager",
  authenticateToken,
  authorize("HR_MANAGER"),
  departmentCustomController.updateDepartmentManager
);

// Bulk operations
departmentRouter.post(
  "/bulk/update-status",
  authenticateToken,
  authorize("HR_MANAGER"),
  departmentCustomController.bulkUpdateDepartmentStatus
);

departmentRouter.get(
  "/:id/with-details",
  authenticateToken,
  authorize("HR_MANAGER"),
  departmentCustomController.getDepartmentWithDetails
);

departmentRouter.get(
  "/with-relations/all",
  authenticateToken,
  authorize("HR_MANAGER"),
  departmentCustomController.getAllDepartmentsWithRelations
);
export { departmentRouter };
