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
employeeRouter.post(
  "/",
  authenticateToken,
  authorize("HR_MANAGER", "HR_OFFICER"),
  ensureDefaultCompanyIdInBody(),
  validateEmployee(createEmployeeSchema),
  employeeController.create
);

employeeRouter.get(
  "/", 
    authenticateToken,
    authorize("HR_MANAGER", "HR_OFFICER"),
  employeeController.findAll);

employeeRouter.get(
  "/:id",
  authenticateToken,
  authorize("HR_MANAGER", "HR_OFFICER"),
  validateEmployee(employeeIdSchema),
  employeeController.findById
);
  
employeeRouter.put(
  "/:id",
  authenticateToken,
  authorize("HR_MANAGER", "HR_OFFICER"),
  validateEmployee(employeeIdSchema),
  validateEmployee(updateEmployeeSchema),
  employeeController.update
);

// ========== PROFILE PICTURE ROUTES ==========
employeeRouter.post(
  "/:id/profile-picture",
  authenticateToken,
  authorize("HR_MANAGER", "HR_OFFICER"),
  validateEmployee(employeeIdSchema),
  fileUploadService.uploadSingleImage("profile_picture"),
  employeeController.uploadProfilePicture
);

employeeRouter.delete(
  "/:id/profile-picture",
  authenticateToken,
  authorize("HR_MANAGER", "HR_OFFICER"),
  validateEmployee(employeeIdSchema),
  employeeController.deleteProfilePicture
);

// ========== DOCUMENT ROUTES ==========
// Single document upload
employeeRouter.post(
  "/:id/documents",
  authenticateToken,
  authorize("HR_MANAGER", "HR_OFFICER"),
  validateEmployee(employeeIdSchema),
  fileUploadService.uploadSingleDocument("document"),
  employeeController.uploadDocument
);

// Multiple documents upload
employeeRouter.post(
  "/:id/documents/bulk",
  authenticateToken,
  authorize("HR_MANAGER", "HR_OFFICER"),
  validateEmployee(employeeIdSchema),
  fileUploadService.uploadMultipleDocuments("documents", 10),
  employeeController.uploadMultipleDocuments
);

// Get employee documents
employeeRouter.get(
  "/:id/documents",
  authenticateToken,
  authorize("HR_MANAGER", "HR_OFFICER"),
  validateEmployee(employeeIdSchema),
  employeeController.getDocuments
);

// Update document info
employeeRouter.put("/documents/:documentId", employeeController.updateDocument);

// Delete document
employeeRouter.delete(
  "/documents/:documentId",
  authenticateToken,
  authorize("HR_MANAGER", "HR_OFFICER"),
  employeeController.deleteDocument
);

// Verify document
employeeRouter.patch(
  "/documents/:documentId/verify",
  authenticateToken,
  authorize("HR_MANAGER", "HR_OFFICER"),
  employeeController.verifyDocument
);

// Expiring documents alert
employeeRouter.get(
  "/documents/expiring-soon",
  authenticateToken,
  authorize("HR_MANAGER", "HR_OFFICER"),
  employeeController.getExpiringDocuments
);

// ========== EDUCATION ROUTES ==========
employeeRouter.post(
  "/:id/education",
  authenticateToken,
  authorize("HR_MANAGER", "HR_OFFICER"),
  validateEmployee(employeeIdSchema),
  employeeController.addEducation
);

employeeRouter.get(
  "/:id/education",
  authenticateToken,
  authorize("HR_MANAGER", "HR_OFFICER"),
  validateEmployee(employeeIdSchema),
  employeeController.getEducation
);

// ========== SEARCH ROUTES ==========
employeeRouter.get(
  "/search/advanced",
  authenticateToken,
  authorize("HR_MANAGER", "HR_OFFICER"), 
  employeeController.findAll);

export default employeeRouter;
