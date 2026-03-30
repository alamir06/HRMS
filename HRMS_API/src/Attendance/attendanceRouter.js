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
  authorize("HRMANAGER", "HROFFICER", "HEAD", "EMPLOYEE"),
  attendanceController.checkIn
);

attendanceRouter.post(
  "/employees/:employeeId/check-out",
  authenticateToken,
  authorize("HRMANAGER", "HROFFICER", "HEAD", "EMPLOYEE"),
  attendanceController.checkOut
);

attendanceRouter.get(
  "/employees/:employeeId",
  authenticateToken,
  authorize("HRMANAGER", "HROFFICER", "HEAD", "EMPLOYEE"),
  attendanceController.getEmployeeAttendance
);

attendanceRouter.get(
  "/employees/:employeeId/summary",
  authenticateToken,
  authorize("HRMANAGER", "HROFFICER", "HEAD", "EMPLOYEE"),
  attendanceController.getEmployeeSummary
);

export default attendanceRouter;
