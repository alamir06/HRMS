import express from "express";
import { employeeController } from "./EmployeeController.js";
import { fileUploadService } from "../../Commons/FileUploadService.js";
import { validateEmployee } from "./employeeValidation.js";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  employeeIdSchema,
} from "./employeeValidation.js";

const employeeRouter = express.Router();

// CRUD Routes
employeeRouter.post(
  "/",
  validateEmployee(createEmployeeSchema),
  employeeController.create
);

employeeRouter.get("/", employeeController.findAll);

employeeRouter.get(
  "/:id",
  validateEmployee(employeeIdSchema),
  employeeController.findById
);

employeeRouter.put(
  "/:id",
  validateEmployee(employeeIdSchema), // Validate the ID parameter first
  validateEmployee(updateEmployeeSchema), // Then validate the request body
  employeeController.update
);
// File upload routes
employeeRouter.post(
  "/:id/profile-picture",
  validateEmployee(employeeIdSchema), // Validate ID first
  fileUploadService.uploadSingle("profile_picture"),
  employeeController.uploadProfilePicture
);

employeeRouter.delete(
  "/:id/profile-picture",
  validateEmployee(employeeIdSchema), // Validate ID first
  employeeController.deleteProfilePicture
);

// Custom routes
employeeRouter.get("/search/advanced", employeeController.findAll);

export default employeeRouter;
