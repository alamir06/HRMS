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
  displayNameField: "benefit_name",
  entityLabel: "Benefit",
  uuidEnabled: true,
});

const enrollmentCrudRouter = createCrudRouter({
  routePath: "/",
  tableName: "employee_benefits",
  validationSchema: benefitValidationSchema.enrollment,
  displayNameField: "enrollment_date",
  entityLabel: "Employee Benefit",
  uuidEnabled: true,
});

benefitRouter.use("/catalog", benefitCrudRouter);
benefitRouter.use("/enrollments", enrollmentCrudRouter);

benefitRouter.post(
  "/enrollments/enroll",
  authenticateToken,
  authorize("HR_MANAGER", "HR_OFFICER"),
  benefitController.enrollEmployee
);

benefitRouter.post(
  "/enrollments/:id/status",
  authenticateToken,
  authorize("HR_MANAGER", "HR_OFFICER"),
  benefitController.updateEnrollmentStatus
);

benefitRouter.get(
  "/catalog/:id/summary",
  authenticateToken,
  authorize("HR_MANAGER", "HR_OFFICER"),
  benefitController.getBenefitSummary
);

benefitRouter.get(
  "/employees/:employeeId",
  authenticateToken,
  authorize("HR_MANAGER", "HR_OFFICER", "employee"),
  benefitController.getEmployeeBenefits
);

export default benefitRouter;
