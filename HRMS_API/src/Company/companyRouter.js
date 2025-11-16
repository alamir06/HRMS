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
  createRoles: ["admin", "super_admin"],
  readRoles: null, // Public read access
  updateRoles: ["admin", "super_admin"],
  deleteRoles: ["super_admin"],
});

companyRouter.use("/", companyCrudRouter);


// Statistics and Analytics
companyRouter.get(
  "/stats/dashboard",
  authenticateToken,
  authorize("admin", "super_admin", "hr_manager"),
  companyCustomController.getCompanyStats
);

// Search Operations
companyRouter.get(
  "/search/advanced",
  // authenticateToken,
  // authorize("admin", "super_admin", "hr_manager", "user"),
  companyCustomController.advancedSearch
);

// Bulk Operations
companyRouter.post(
  "/bulk/update-status",
  authenticateToken,
  authorize("admin", "super_admin"),
  companyCustomController.bulkUpdateStatus
);

// Export Operations
companyRouter.get(
  "/export",
  authenticateToken,
  authorize("admin", "super_admin"),
  companyCustomController.exportCompanies
);

// Validation Operations
companyRouter.get(
  "/validate",
  authenticateToken,
  authorize("admin", "super_admin", "hr_manager"),
  companyCustomController.validateCompany
);

// Analytics by Year
companyRouter.get(
  "/analytics/year/:year",
  authenticateToken,
  authorize("admin", "super_admin", "hr_manager"),
  companyCustomController.getCompaniesByYear
);

export default companyRouter;
