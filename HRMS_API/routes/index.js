import express from "express";
import testRouter from "../src/test/testRouter.js";
import companyRouter from "../src/Company/companyRouter.js";
import collegeRouter from "../src/Colleges/CollegeRouter.js";
import { departmentRouter } from "../src/Department/departmentRoutes.js";
import { designationRouter } from "../src/Designation/designationRoutes.js";
import employeeRouter from "../src/Employee/employeeRoutes.js";

const appRouter=express.Router();

appRouter.use("/test",testRouter);
appRouter.use("/companies", companyRouter);
appRouter.use("/colleges", collegeRouter);
appRouter.use("/departments", departmentRouter);
appRouter.use("/designations", designationRouter);
appRouter.use("/employees", employeeRouter);


export default appRouter;
