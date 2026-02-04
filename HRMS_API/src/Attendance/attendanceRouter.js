import express from "express";
import { createCrudRouter } from "../Commons/CommonRouter.js";
import { attendanceValidationSchema } from "./attendanceValidation.js";
import { attendanceController } from "./attendanceController.js";
import { authenticateToken, authorize } from "../../middleware/auth.js";

const attendanceRouter = express.Router();

const attendanceCrudRouter = createCrudRouter({
  routePath: "/",
  tableName: "attendance",
  validationSchema: attendanceValidationSchema,
  displayNameField: "date",
  entityLabel: "Attendance",
  uuidEnabled: true,
});

attendanceRouter.use("/", attendanceCrudRouter);

attendanceRouter.post(
  "/employees/:employeeId/check-in",
  authenticateToken,
  authorize("HR_MANAGER", "HR_OFFICER", "HEAD", "employee"),
  attendanceController.checkIn
);

attendanceRouter.post(
  "/employees/:employeeId/check-out",
  authenticateToken,
  authorize("HR_MANAGER", "HR_OFFICER", "HEAD", "employee"),
  attendanceController.checkOut
);

attendanceRouter.get(
  "/employees/:employeeId",
  authenticateToken,
  authorize("HR_MANAGER", "HR_OFFICER", "HEAD", "employee"),
  attendanceController.getEmployeeAttendance
);

attendanceRouter.get(
  "/employees/:employeeId/summary",
  authenticateToken,
  authorize("HR_MANAGER", "HR_OFFICER", "HEAD", "employee"),
  attendanceController.getEmployeeSummary
);

export default attendanceRouter;
