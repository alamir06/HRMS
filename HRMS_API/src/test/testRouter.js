import { Router } from "express";
import testController from "./testController.js";


const testRouter=Router();

testRouter.get("/getTest",testController.getTest)

export default testRouter;