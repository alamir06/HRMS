import express from "express";
import testRouter from "../src/test/testRouter.js";
import collegeRouter from "../src/Colleges/CollegeRouter.js";
import { departmentRouter } from "../src/Department/departmentRoutes.js";
import { designationRouter } from "../src/Designation/designationRoutes.js";
import employeeRouter from "../src/Employee/employeeRoutes.js";
import attendanceRouter from "../src/Attendance/attendanceRouter.js";
import leaveRouter from "../src/Leave/leaveRouter.js";
import assetRouter from "../src/Asset/assetRouter.js";
import benefitRouter from "../src/Benefit/benefitRouter.js";
import recruitmentRouter from "../src/Recruitment/recruitmentRouter.js";
import noticeRouter from "../src/Notice/noticeRouter.js";
import notificationRouter from "../src/Notification/notificationRouter.js";
import payrollRouter from "../src/Payroll/payrollRouter.js";
import authRouter from "../src/Auth/authRouter.js";
import outsourcingCompanyRouter from "../src/OutsourcingCompany/outsourcingCompanyRouter.js";

const appRouter=express.Router();

appRouter.use("/test",testRouter);
appRouter.use("/colleges", collegeRouter);
appRouter.use("/departments", departmentRouter);
appRouter.use("/designations", designationRouter);
appRouter.use("/employees", employeeRouter);
appRouter.use("/attendance", attendanceRouter);
appRouter.use("/leave", leaveRouter);
appRouter.use("/assets", assetRouter);
appRouter.use("/benefits", benefitRouter);
appRouter.use("/recruitment", recruitmentRouter);
appRouter.use("/notices", noticeRouter);
appRouter.use("/notifications", notificationRouter);
appRouter.use("/payroll", payrollRouter);
appRouter.use("/auth", authRouter);
appRouter.use("/outsourcing-companies", outsourcingCompanyRouter);

export default appRouter;
