import express from "express";
import { createCrudRouter } from "../Commons/CommonRouter.js";
import { assetValidationSchema } from "./assetValidation.js";
import { assetController } from "./assetController.js";
import { authenticateToken, authorize } from "../../middleware/auth.js";

const assetRouter = express.Router();

const assetCategoryRouter = createCrudRouter({
  routePath: "/",
  tableName: "asset_category",
  validationSchema: assetValidationSchema.category,
  displayNameField: "category_name",
  entityLabel: "Asset Category",
  uuidEnabled: true,
});

const assetCrudRouter = createCrudRouter({
  routePath: "/",
  tableName: "assets",
  validationSchema: assetValidationSchema.asset,
  displayNameField: "asset_name",
  entityLabel: "Asset",
  uuidEnabled: true,
});

const assetAssignmentRouter = createCrudRouter({
  routePath: "/",
  tableName: "asset_assignment",
  validationSchema: assetValidationSchema.assignment,
  displayNameField: "assigned_date",
  entityLabel: "Asset Assignment",
  uuidEnabled: true,
});

assetRouter.use("/categories", assetCategoryRouter);
assetRouter.use("/items", assetCrudRouter);
assetRouter.use("/assignments", assetAssignmentRouter);

assetRouter.post(
  "/assignments/assign",
  authenticateToken,
  authorize("HR_MANAGER", "HR_OFFICER", "HEAD"),
  assetController.assignAsset
);

assetRouter.post(
  "/assignments/:id/return",
  authenticateToken,
  authorize("HR_MANAGER", "HR_OFFICER", "HEAD"),
  assetController.returnAsset
);

assetRouter.get(
  "/items/available",
  authenticateToken,
  authorize("HR_MANAGER", "HR_OFFICER", "HEAD", "employee"),
  assetController.listAvailableAssets
);

assetRouter.get(
  "/items/:id/summary",
  authenticateToken,
  authorize("HR_MANAGER", "HR_OFFICER", "HEAD"),
  assetController.getAssetSummary
);

assetRouter.get(
  "/employees/:employeeId/assets",
  authenticateToken,
  authorize("HR_MANAGER", "HR_OFFICER", "HEAD"),
  assetController.getEmployeeAssets
);

export default assetRouter;
