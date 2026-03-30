import express from "express";
import { createCrudRouter } from "../Commons/CommonRouter.js";
import { outsourcingCompanyValidationSchema } from "./outsourcingCompanyValidation.js";
import { ensureDefaultCompanyIdInBody } from "../Commons/defaultCompany.js";

const outsourcingCompanyRouter = express.Router();

const outsourcingCrudRouter = createCrudRouter({
  routePath: "/",
  tableName: "outsourcingCompanies",
  validationSchema: outsourcingCompanyValidationSchema,
  displayNameField: "companyName",
  entityLabel: "Outsourcing Company",
  uuidEnabled: true,
  uuidFields: ["id", "companyId"],
  createRoles: ["HRMANAGER"],
  readRoles: ["HRMANAGER"],
  updateRoles: ["HRMANAGER"],
  deleteRoles: ["HRMANAGER"],
  middleware: {
    create: [ensureDefaultCompanyIdInBody()],
    read: [],
    update: [],
    delete: [],
    list: [],
    count: [],
  },
});

outsourcingCompanyRouter.use("/", outsourcingCrudRouter);

export default outsourcingCompanyRouter;
