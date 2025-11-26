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

// ========== EMPLOYEE CRUD ROUTES ==========
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
  validateEmployee(employeeIdSchema),
  validateEmployee(updateEmployeeSchema),
  employeeController.update
);

// ========== PROFILE PICTURE ROUTES ==========
employeeRouter.post(
  "/:id/profile-picture",
  validateEmployee(employeeIdSchema),
  fileUploadService.uploadSingleImage("profile_picture"),
  employeeController.uploadProfilePicture
);

employeeRouter.delete(
  "/:id/profile-picture",
  validateEmployee(employeeIdSchema),
  employeeController.deleteProfilePicture
);

// ========== DOCUMENT ROUTES ==========
// Single document upload
employeeRouter.post(
  "/:id/documents",
  validateEmployee(employeeIdSchema),
  fileUploadService.uploadSingleDocument("document"),
  employeeController.uploadDocument
);

// Multiple documents upload
employeeRouter.post(
  "/:id/documents/bulk",
  validateEmployee(employeeIdSchema),
  fileUploadService.uploadMultipleDocuments("documents", 10),
  employeeController.uploadMultipleDocuments
);

// Get employee documents
employeeRouter.get(
  "/:id/documents",
  validateEmployee(employeeIdSchema),
  employeeController.getDocuments
);

// Update document info
employeeRouter.put("/documents/:documentId", employeeController.updateDocument);

// Delete document
employeeRouter.delete(
  "/documents/:documentId",
  employeeController.deleteDocument
);

// Verify document
employeeRouter.patch(
  "/documents/:documentId/verify",
  employeeController.verifyDocument
);

// Expiring documents alert
employeeRouter.get(
  "/documents/expiring-soon",
  employeeController.getExpiringDocuments
);

// ========== EDUCATION ROUTES ==========
employeeRouter.post(
  "/:id/education",
  validateEmployee(employeeIdSchema),
  employeeController.addEducation
);

employeeRouter.get(
  "/:id/education",
  validateEmployee(employeeIdSchema),
  employeeController.getEducation
);

// ========== SEARCH ROUTES ==========
employeeRouter.get("/search/advanced", employeeController.findAll);

export default employeeRouter;
