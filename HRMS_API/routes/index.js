import express from "express";
import testRouter from "../src/test/testRouter.js";

const appRouter=express.Router();


appRouter.use("/test",testRouter);


export default appRouter;