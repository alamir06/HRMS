import express from "express";
import { createCrudRouter } from "../Commons/CommonRouter.js";
import { outsourcingCompanyValidationSchema } from "./outsourcingCompanyValidation.js";
import { ensureDefaultCompanyIdInBody } from "../Commons/defaultCompany.js";

const outsourcingCompanyRouter = express.Router();

const outsourcingCrudRouter = createCrudRouter({
  routePath: "/",
  tableName: "outsourcing_companies",
  validationSchema: outsourcingCompanyValidationSchema,
  displayNameField: "company_name",
  entityLabel: "Outsourcing Company",
  uuidEnabled: true,
  uuidFields: ["id", "company_id"],
  createRoles: ["HR_MANAGER"],
  readRoles: ["HR_MANAGER"],
  updateRoles: ["HR_MANAGER"],
  deleteRoles: ["HR_MANAGER"],
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
