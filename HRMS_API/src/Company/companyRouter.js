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
  createRoles: ["HR_MANAGER", "DEAN", "employee", "HEAD", "FINANCE_OFFICER"],
  readRoles: null,
  updateRoles: ["HR_MANAGER", "DEAN", "employee", "HEAD", "FINANCE_OFFICER"],
  deleteRoles: ["suHR_MANAGERper_admin"],
});

companyRouter.use("/", companyCrudRouter);

companyRouter.get(
  "/stats/dashboard",
  authenticateToken,
  authorize("HR_MANAGER", "DEAN", 'employee', 'HEAD', 'FINANCE_OFFICER'),
  companyCustomController.getCompanyStats
);

// Search Operations
companyRouter.get(
  "/search/advanced",
  authenticateToken,
  authorize("HR_MANAGER", "DEAN", 'employee', 'HEAD', 'FINANCE_OFFICER'),
  companyCustomController.advancedSearch
);

companyRouter.post(
  "/bulk/update-status",
  authenticateToken,
  authorize("HR_MANAGER", "DEAN", 'employee', 'HEAD', 'FINANCE_OFFICER'),
  companyCustomController.bulkUpdateStatus
);

companyRouter.get(
  "/export",
  authenticateToken,
  authorize("HR_MANAGER", "DEAN", 'employee', 'HEAD', 'FINANCE_OFFICER'),
  companyCustomController.exportCompanies
);

companyRouter.get(
  "/validate",
  authenticateToken,
  authorize("HR_MANAGER", "DEAN", 'employee', 'HEAD', 'FINANCE_OFFICER'),
  companyCustomController.validateCompany
);

companyRouter.get(
  "/analytics/year/:year",
  authenticateToken,
  authorize("HR_MANAGER", "DEAN", "employee", "HEAD", "FINANCE_OFFICER"),
  companyCustomController.getCompaniesByYear
);

export default companyRouter;
