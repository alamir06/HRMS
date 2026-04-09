import express from "express";
import { employeeController } from "./EmployeeController.js";
import { fileUploadService } from "../../Commons/FileUploadService.js";
import { validateEmployee } from "./employeeValidation.js";
import { authenticateToken, authorize } from '../../middleware/auth.js';
import { ensureDefaultCompanyIdInBody } from "../Commons/defaultCompany.js";

import {
  createEmployeeSchema,
  updateEmployeeSchema,
  employeeIdSchema,
} from "./employeeValidation.js";


const employeeRouter = express.Router();

// ========== EMPLOYEE CRUD ROUTES ==========
console.log(authenticateToken);

employeeRouter.post(
  "/",
  authenticateToken,
  authorize("HRMANAGER", "RECRUITER"),
  ensureDefaultCompanyIdInBody(),
  validateEmployee(createEmployeeSchema),
  employeeController.create
);

employeeRouter.get(
  "/", 
    authenticateToken,
    authorize("HRMANAGER", "HROFFICER","RECRUITER"),
  employeeController.findAll);

employeeRouter.get(
  "/terminated",
  authenticateToken,
  authorize("HRMANAGER", "HROFFICER", "RECRUITER"),
  employeeController.findTerminated
);

employeeRouter.get(
  "/:id",
  authenticateToken,
  authorize("HRMANAGER", "HROFFICER","RECRUITER", "EMPLOYEE"),
  validateEmployee(employeeIdSchema),
  employeeController.findById
);
  
employeeRouter.put(
  "/:id",
  authenticateToken,
  authorize("HRMANAGER"),
  validateEmployee(employeeIdSchema),
  validateEmployee(updateEmployeeSchema),
  employeeController.update
);

employeeRouter.delete(
  "/:id",
  authenticateToken,
  authorize("HRMANAGER", "HROFFICER"),
  validateEmployee(employeeIdSchema),
  employeeController.delete
);

// ========== PROFILE PICTURE ROUTES ==========
employeeRouter.post(
  "/:id/profile-picture",
  authenticateToken,
  authorize("HRMANAGER", "HROFFICER","EMPLOYEE"),
  validateEmployee(employeeIdSchema),
  fileUploadService.uploadSingleImage("profilePicture"),
  employeeController.uploadProfilePicture
);

employeeRouter.delete(
  "/:id/profile-picture",
  authenticateToken,
  authorize("HRMANAGER", "HROFFICER"),
  validateEmployee(employeeIdSchema),
  employeeController.deleteProfilePicture
);

// ========== DOCUMENT ROUTES ==========
// Single document upload
employeeRouter.post(
  "/:id/documents",
  authenticateToken,
  authorize("HRMANAGER", "HROFFICER"),
  validateEmployee(employeeIdSchema),
  fileUploadService.uploadSingleDocument("document"),
  employeeController.uploadDocument
);

// Multiple documents upload
employeeRouter.post(
  "/:id/documents/bulk",
  authenticateToken,
  authorize("HRMANAGER", "HROFFICER"),
  validateEmployee(employeeIdSchema),
  fileUploadService.uploadMultipleDocuments("documents", 10),
  employeeController.uploadMultipleDocuments
);

// Get employee documents
employeeRouter.get(
  "/:id/documents",
  authenticateToken,
  authorize("HRMANAGER", "HROFFICER", "EMPLOYEE"),
  validateEmployee(employeeIdSchema),
  employeeController.getDocuments
);

// Update document info
employeeRouter.put("/documents/:documentId", employeeController.updateDocument);

// Delete document
employeeRouter.delete(
  "/documents/:documentId",
  authenticateToken,
  authorize("HRMANAGER", "HROFFICER"),
  employeeController.deleteDocument
);

// Verify document
employeeRouter.patch(
  "/documents/:documentId/verify",
  authenticateToken,
  authorize("HRMANAGER", "HROFFICER"),
  employeeController.verifyDocument
);

// Expiring documents alert
employeeRouter.get(
  "/documents/expiring-soon",
  authenticateToken,
  authorize("HRMANAGER", "HROFFICER"),
  employeeController.getExpiringDocuments
);

// ========== EDUCATION ROUTES ==========
employeeRouter.post(
  "/:id/education",
  authenticateToken,
  authorize("HRMANAGER", "HROFFICER"),
  validateEmployee(employeeIdSchema),
  employeeController.addEducation
);

employeeRouter.get(
  "/:id/education",
  authenticateToken,
  authorize("HRMANAGER", "HROFFICER"),
  validateEmployee(employeeIdSchema),
  employeeController.getEducation
);

// ========== SEARCH ROUTES ==========
employeeRouter.get(
  "/search/advanced",
  authenticateToken,
  authorize("HRMANAGER", "HROFFICER"), 
  employeeController.findAll);

export default employeeRouter;
