import express from "express";
import { createCrudRouter } from "../Commons/CommonRouter.js";
import { assetValidationSchema } from "./assetValidation.js";
import { assetController } from "./assetController.js";
import { authenticateToken, authorize } from "../../middleware/auth.js";

const assetRouter = express.Router();

const assetCategoryRouter = createCrudRouter({
  routePath: "/",
  tableName: "assetCategory",
  validationSchema: assetValidationSchema.category,
  displayNameField: "categoryName",
  entityLabel: "Asset Category",
  uuidEnabled: true,
});

const assetCrudRouter = createCrudRouter({
  routePath: "/",
  tableName: "assets",
  validationSchema: assetValidationSchema.asset,
  displayNameField: "assetName",
  entityLabel: "Asset",
  uuidEnabled: true,
});

const assetAssignmentRouter = createCrudRouter({
  routePath: "/",
  tableName: "assetAssignment",
  validationSchema: assetValidationSchema.assignment,
  displayNameField: "assignedDate",
  entityLabel: "Asset Assignment",
  uuidEnabled: true,
});

assetRouter.use("/categories", assetCategoryRouter);
assetRouter.use("/items", assetCrudRouter);
assetRouter.use("/assignments", assetAssignmentRouter);

assetRouter.post(
  "/assignments/assign",
  authenticateToken,
  authorize("HRMANAGER", "HROFFICER", "HEAD"),
  assetController.assignAsset
);

assetRouter.post(
  "/assignments/:id/return",
  authenticateToken,
  authorize("HRMANAGER", "HROFFICER", "HEAD"),
  assetController.returnAsset
);

assetRouter.get(
  "/items/available",
  authenticateToken,
  authorize("HRMANAGER", "HROFFICER", "HEAD", "EMPLOYEE"),
  assetController.listAvailableAssets
);

assetRouter.get(
  "/items/:id/summary",
  authenticateToken,
  authorize("HRMANAGER", "HROFFICER", "HEAD"),
  assetController.getAssetSummary
);

assetRouter.get(
  "/employees/:employeeId/assets",
  authenticateToken,
  authorize("HRMANAGER", "HROFFICER", "HEAD"),
  assetController.getEmployeeAssets
);

export default assetRouter;
