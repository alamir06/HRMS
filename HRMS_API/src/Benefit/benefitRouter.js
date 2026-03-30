import express from "express";
import { createCrudRouter } from "../Commons/CommonRouter.js";
import { benefitValidationSchema } from "./benefitValidation.js";
import { benefitController } from "./benefitController.js";
import { authenticateToken, authorize } from "../../middleware/auth.js";

const benefitRouter = express.Router();

const benefitCrudRouter = createCrudRouter({
  routePath: "/",
  tableName: "benefits",
  validationSchema: benefitValidationSchema.benefit,
  displayNameField: "benefitName",
  entityLabel: "Benefit",
  uuidEnabled: true,
});

const enrollmentCrudRouter = createCrudRouter({
  routePath: "/",
  tableName: "employeeBenefits",
  validationSchema: benefitValidationSchema.enrollment,
  displayNameField: "enrollmentDate",
  entityLabel: "Employee Benefit",
  uuidEnabled: true,
});

benefitRouter.use("/catalog", benefitCrudRouter);
benefitRouter.use("/enrollments", enrollmentCrudRouter);

benefitRouter.post(
  "/enrollments/enroll",
  authenticateToken,
  authorize("HRMANAGER", "HROFFICER"),
  benefitController.enrollEmployee
);

benefitRouter.post(
  "/enrollments/:id/status",
  authenticateToken,
  authorize("HRMANAGER", "HROFFICER"),
  benefitController.updateEnrollmentStatus
);

benefitRouter.get(
  "/catalog/:id/summary",
  authenticateToken,
  authorize("HRMANAGER", "HROFFICER"),
  benefitController.getBenefitSummary
);

benefitRouter.get(
  "/employees/:employeeId",
  authenticateToken,
  authorize("HRMANAGER", "HROFFICER", "EMPLOYEE"),
  benefitController.getEmployeeBenefits
);

export default benefitRouter;
