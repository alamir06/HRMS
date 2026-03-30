import express from "express";
import { createCrudRouter } from "../Commons/CommonRouter.js";
import { leaveValidationSchema } from "./leaveValidation.js";
import { leaveController } from "./leaveController.js";
import { authenticateToken, authorize } from "../../middleware/auth.js";

const leaveRouter = express.Router();

leaveRouter.post(
  "/requests/apply",
  authenticateToken,
  authorize("HRMANAGER", "HROFFICER", "HEAD", "EMPLOYEE"),
  leaveController.applyForLeave
);

leaveRouter.post(
  "/requests/:id/approve",
  authenticateToken,
  authorize("HRMANAGER", "HROFFICER"),
  leaveController.approveLeave
);

leaveRouter.post(
  "/requests/:id/reject",
  authenticateToken,
  authorize("HRMANAGER", "HROFFICER"),
  leaveController.rejectLeave
);

leaveRouter.get(
  "/employees/:employeeId/summary",
  authenticateToken,
  authorize("HRMANAGER", "HROFFICER", "HEAD", "EMPLOYEE"),
  leaveController.getEmployeeLeaveSummary
);

leaveRouter.get(
  "/employees/:employeeId/history",
  authenticateToken,
  authorize("HRMANAGER", "HROFFICER", "HEAD", "EMPLOYEE"),
  leaveController.getEmployeeLeaveHistory
);

const leaveTypeRouter = createCrudRouter({
  routePath: "/",
  tableName: "leaveTypes",
  validationSchema: leaveValidationSchema.type,
  displayNameField: "leaveName",
  entityLabel: "Leave Type",
  uuidEnabled: true,
});

const leaveBalanceRouter = createCrudRouter({
  routePath: "/",
  tableName: "leaveBalance",
  validationSchema: leaveValidationSchema.balance,
  displayNameField: "year",
  entityLabel: "Leave Balance",
  uuidEnabled: true,
});

const leaveRequestCrudRouter = createCrudRouter({
  routePath: "/",
  tableName: "leaveRequest",
  validationSchema: leaveValidationSchema.request,
  displayNameField: "startDate",
  entityLabel: "Leave Request",
  uuidEnabled: true,
});

leaveRouter.use("/types", leaveTypeRouter);
leaveRouter.use("/balances", leaveBalanceRouter);
leaveRouter.use("/requests", leaveRequestCrudRouter);

export default leaveRouter;
