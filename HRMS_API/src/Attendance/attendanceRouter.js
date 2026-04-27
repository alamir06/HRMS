import express from "express";
import { createCrudRouter } from "../Commons/CommonRouter.js";
import { attendanceValidationSchema } from "./attendanceValidation.js";
import { attendanceController } from "./attendanceController.js";
import { authenticateToken, authorize } from "../../middleware/auth.js";
import { attendanceAuthGuard } from "./attendanceMiddleware.js";
import { attendanceService } from "./attendanceService.js";

const attendanceRouter = express.Router();

// Trigger daily absent seeding (runs once per server process per day)
let lastSeededDate = null;
attendanceRouter.use(async (req, res, next) => {
  const today = new Date().toISOString().slice(0, 10);
  if (lastSeededDate !== today) {
    lastSeededDate = today;
    // Run in background without blocking the request
    attendanceService.seedDailyAbsentRecords().catch(err => {
      console.error("Background seeding failed:", err);
      lastSeededDate = null; // Reset so it tries again
    });
  }
  next();
});

// Intercept specific global scopes
attendanceRouter.get(
  "/",
  authenticateToken,
  authorize("HRMANAGER", "DEAN", "HEAD"),
  attendanceController.getAllScopedAttendance
);

const attendanceCrudRouter = createCrudRouter({
  routePath: "/",
  tableName: "attendance",
  validationSchema: attendanceValidationSchema,
  displayNameField: "date",
  entityLabel: "Attendance",
  uuidEnabled: true,
  createRoles: ["HRMANAGER", "HEAD"], 
  updateRoles: ["HRMANAGER", "HEAD"],
  deleteRoles: ["HRMANAGER", "HEAD"],
  readRoles: ["HRMANAGER", "HEAD", "DEAN", "EMPLOYEE"], 
  middleware: {
    create: [attendanceAuthGuard],
    update: [attendanceAuthGuard],
    delete: [attendanceAuthGuard],
    read: [attendanceAuthGuard]
  }
});


attendanceRouter.post(
  "/employees/:employeeId/check-in",
  authenticateToken,
  authorize("HRMANAGER", "HEAD"),
  attendanceAuthGuard,
  attendanceController.checkIn
);

attendanceRouter.post(
  "/employees/:employeeId/check-out",
  authenticateToken,
  authorize("HRMANAGER", "HEAD"),
  attendanceAuthGuard,
  attendanceController.checkOut
);

attendanceRouter.get(
  "/employees/:employeeId",
  authenticateToken,
  authorize("HRMANAGER", "DEAN", "HEAD", "EMPLOYEE"),
  attendanceAuthGuard,
  attendanceController.getEmployeeAttendance
);

attendanceRouter.get(
  "/employees/:employeeId/summary",
  authenticateToken,
  authorize("HRMANAGER", "DEAN", "HEAD", "EMPLOYEE"),
  attendanceAuthGuard,
  attendanceController.getEmployeeSummary
);

attendanceRouter.use("/", attendanceCrudRouter);

export default attendanceRouter;
