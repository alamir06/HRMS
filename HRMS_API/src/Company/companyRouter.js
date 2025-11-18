// routes/companyRoutes.js
import express from "express";
import { createCrudRouter } from "../Commons/CommonRouter.js";
import { companyValidationSchema } from "./companyValidator.js";
import { authenticateToken, authorize } from "../../middleware/auth.js";
import  companyCustomController  from "./companyController.js";
const companyRouter = express.Router();

const companyCrudRouter = createCrudRouter({
  routePath: "/",
  tableName: "company",
  validationSchema: companyValidationSchema,
  uuidEnabled: true,
  uuidFields: ["id"],
  createRoles: ["HR_MANAGER", "DEAN", 'employee', 'HEAD', 'FINANCE_OFFICER'],
  readRoles: null,
  updateRoles: ["HR_MANAGER", "DEAN", 'employee', 'HEAD', 'FINANCE_OFFICER'],
  deleteRoles: ["super_admin"],
});

companyRouter.use("/", companyCrudRouter);

companyRouter.get(
  "/stats/dashboard",
  authenticateToken,
  authorize("admin", "super_admin", "hr_manager"),
  companyCustomController.getCompanyStats
);

// Search Operations
companyRouter.get(
  "/search/advanced",
  authenticateToken,
  authorize("admin", "super_admin", "hr_manager", "user"),
  companyCustomController.advancedSearch
);

companyRouter.post(
  "/bulk/update-status",
  authenticateToken,
  authorize("admin", "super_admin"),
  companyCustomController.bulkUpdateStatus
);

companyRouter.get(
  "/export",
  authenticateToken,
  authorize("admin", "super_admin"),
  companyCustomController.exportCompanies
);

companyRouter.get(
  "/validate",
  authenticateToken,
  authorize("admin", "super_admin", "hr_manager"),
  companyCustomController.validateCompany
);

companyRouter.get(
  "/analytics/year/:year",
  authenticateToken,
  authorize("admin", "super_admin", "hr_manager"),
  companyCustomController.getCompaniesByYear
);

export default companyRouter;
