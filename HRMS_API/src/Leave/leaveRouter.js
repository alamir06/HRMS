import express from "express";
import { createCrudRouter } from "../Commons/CommonRouter.js";
import { leaveValidationSchema } from "./leaveValidation.js";
import { leaveController } from "./leaveController.js";
import { authenticateToken, authorize } from "../../middleware/auth.js";

const leaveRouter = express.Router();

leaveRouter.post(
  "/requests/apply",
  authenticateToken,
  authorize("HR_MANAGER", "HR_OFFICER", "HEAD", "employee"),
  leaveController.applyForLeave
);

leaveRouter.post(
  "/requests/:id/approve",
  authenticateToken,
  authorize("HR_MANAGER", "HR_OFFICER"),
  leaveController.approveLeave
);

leaveRouter.post(
  "/requests/:id/reject",
  authenticateToken,
  authorize("HR_MANAGER", "HR_OFFICER"),
  leaveController.rejectLeave
);

leaveRouter.get(
  "/employees/:employeeId/summary",
  authenticateToken,
  authorize("HR_MANAGER", "HR_OFFICER", "HEAD", "employee"),
  leaveController.getEmployeeLeaveSummary
);

leaveRouter.get(
  "/employees/:employeeId/history",
  authenticateToken,
  authorize("HR_MANAGER", "HR_OFFICER", "HEAD", "employee"),
  leaveController.getEmployeeLeaveHistory
);

const leaveTypeRouter = createCrudRouter({
  routePath: "/",
  tableName: "leave_types",
  validationSchema: leaveValidationSchema.type,
  displayNameField: "leave_name",
  entityLabel: "Leave Type",
  uuidEnabled: true,
});

const leaveBalanceRouter = createCrudRouter({
  routePath: "/",
  tableName: "leave_balance",
  validationSchema: leaveValidationSchema.balance,
  displayNameField: "year",
  entityLabel: "Leave Balance",
  uuidEnabled: true,
});

const leaveRequestCrudRouter = createCrudRouter({
  routePath: "/",
  tableName: "leave_request",
  validationSchema: leaveValidationSchema.request,
  displayNameField: "start_date",
  entityLabel: "Leave Request",
  uuidEnabled: true,
});

leaveRouter.use("/types", leaveTypeRouter);
leaveRouter.use("/balances", leaveBalanceRouter);
leaveRouter.use("/requests", leaveRequestCrudRouter);

export default leaveRouter;
