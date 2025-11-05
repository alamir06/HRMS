import express from "express";
import testRouter from "../src/test/testRouter.js";
import companyRouter from "../src/Company/companyRouter.js";

const appRouter=express.Router();


appRouter.use("/test",testRouter);
appRouter.use("/companies",companyRouter);
// appRouter.use("/test",employeeRouter);


export default appRouter;