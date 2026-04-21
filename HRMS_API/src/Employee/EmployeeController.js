import { employeeService } from "./EmployeeService.js";
import { documentService } from "../../Commons/Services/DocumentService.js";
import { fileUploadService } from "../../Commons/FileUploadService.js";
import { employeeValidationSchema } from "./employeeValidation.js";

export class EmployeeController {
  create = async (req, res) => {
    try {
      const validatedData = employeeValidationSchema.create.parse(req.body);
      const result = await employeeService.createEmployee(validatedData);
      res.status(201).json({
        success: true,
        message: "Employee created successfully",
        data: result,
      });
    } catch (error) {
      this.handleError(res, error, "Create employee failed");
    }
  };

  // Get all employees
  findAll = async (req, res) => {
    try {
      const { include, ...filters } = req.query;

      if (String(filters.employmentStatus || "").toUpperCase() === "TERMINATED") {
        return res.status(400).json({
          success: false,
          error: "Use /employees/terminated endpoint to fetch terminated employees.",
        });
      }

      if ("includeTerminated" in filters) {
        delete filters.includeTerminated;
      }

      const includeArray = include
        ? include.split(",").filter((item) => item.trim() !== "")
        : [];

      const result = await employeeService.searchEmployees(
        filters,
        includeArray
      );

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        summary: result.summary,
      });
    } catch (error) {
      this.handleError(res, error, "Find employees failed");
    }
  };

  // Get terminated employees only
  findTerminated = async (req, res) => {
    try {
      const { include, ...filters } = req.query;
      const includeArray = include
        ? include.split(",").filter((item) => item.trim() !== "")
        : [];

      const result = await employeeService.searchTerminatedEmployees(
        filters,
        includeArray
      );

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        summary: result.summary,
      });
    } catch (error) {
      this.handleError(res, error, "Find terminated employees failed");
    }
  };

  // Get employee by ID
  findById = async (req, res) => {
    try {
      const { id } = req.params;

      if (req.user && req.user.role === 'EMPLOYEE' && req.user.employeeId !== id) {
        return res.status(403).json({ success: false, error: "Access denied. You can only view your own profile." });
      }

      const { include } = req.query;
      const includeArray = include
        ? include.split(",").filter((item) => item.trim() !== "")
        : [];

      employeeValidationSchema.id.parse({ id });

      const result = await employeeService.getEmployeeWithDetails(
        id,
        includeArray
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      this.handleError(res, error, "Find employee failed");
    }
  };

  // Update employee
  update = async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      employeeValidationSchema.id.parse({ id });
      const result = await employeeService.updateEmployee(id, updateData);
      res.status(200).json({
        success: true,
        message: "Employee updated successfully",
        data: result,
      });
    } catch (error) {
      this.handleError(res, error, "Update employee failed");
    }
  };

  // Delete employee (soft delete via inherited service)
  delete = async (req, res) => {
    try {
      const { id } = req.params;
      employeeValidationSchema.id.parse({ id });
      // Call the soft-delete function inherited from CrudService
      await employeeService.delete(id);
      res.status(200).json({
        success: true,
        message: "Employee deleted successfully"
      });
    } catch (error) {
      this.handleError(res, error, "Delete employee failed");
    }
  };

  // ========== PROFILE PICTURE OPERATIONS ==========

  // Upload profile picture
  uploadProfilePicture = async (req, res) => {
    try {
      const { id } = req.params;

      if (req.user && req.user.role === 'EMPLOYEE' && req.user.employeeId !== id) {
         if (req.file) await fileUploadService.deleteFile(req.file.filename, "image").catch(console.error);
         return res.status(403).json({ success: false, error: "Access denied. You can only modify your own picture." });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded",
        });
      }

      employeeValidationSchema.id.parse({ id });

      const result = await employeeService.uploadProfilePicture(id, req.file);

      res.json({
        success: true,
        message: result.message,
        data: {
          profilePicture: result.profilePicture,
        },
      });
    } catch (error) {
      // Delete uploaded file if there was an error
      if (req.file) {
        await fileUploadService
          .deleteFile(req.file.filename, "image")
          .catch(console.error);
      }

      this.handleError(res, error, "Upload profile picture failed");
    }
  };

  // Delete profile picture
  deleteProfilePicture = async (req, res) => {
    try {
      const { id } = req.params;

      employeeValidationSchema.id.parse({ id });

      const result = await employeeService.deleteProfilePicture(id);

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      this.handleError(res, error, "Delete profile picture failed");
    }
  };

  uploadDocument = async (req, res) => {
    try {
      const { id } = req.params;
      const documentData = req.body;

      // Validate employee ID
      employeeValidationSchema.id.parse({ id });

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file uploaded",
        });
      }

      const result = await documentService.uploadDocument(
        id,
        req.file,
        documentData
      );

      res.json({
        success: true,
        message: result.message,
        data: {
          document: result.document,
        },
      });
    } catch (error) {
      // Delete uploaded file if there was an error
      if (req.file) {
        await fileUploadService
          .deleteFile(req.file.filename, "document")
          .catch(console.error);
      }

      this.handleError(res, error, "Upload document failed");
    }
  };

  // Upload multiple documents
  // In EmployeeController.js - update the uploadMultipleDocuments method

  uploadMultipleDocuments = async (req, res) => {
    try {
      const { id } = req.params;

      employeeValidationSchema.id.parse({ id });

      // Handle mixed form-data with same key name
      let files = [];
      let documentsData = [];

      if (req.files) {
        files = req.files;
      }

      // Extract JSON data from form-data
      if (req.body.documents) {
        try {
          // If it's already an array (from form-data parsing)
          if (Array.isArray(req.body.documents)) {
            // Filter out files and get only the JSON string
            const jsonData = req.body.documents.find(
              (item) => typeof item === "string" && item.startsWith("[")
            );
            if (jsonData) {
              documentsData = JSON.parse(jsonData);
            }
          } else if (typeof req.body.documents === "string") {
            // If it's a string, parse it directly
            documentsData = JSON.parse(req.body.documents);
          }
        } catch (parseError) {
          console.error("Error parsing documents JSON:", parseError);
          return res.status(400).json({
            success: false,
            error: "Invalid documents JSON format",
          });
        }
      }

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No files uploaded",
        });
      }

      if (files.length !== documentsData.length) {
        return res.status(400).json({
          success: false,
          error: `Number of files (${files.length}) does not match number of document entries (${documentsData.length})`,
        });
      }

      const result = await documentService.uploadMultipleDocuments(
        id,
        files,
        documentsData
      );

      res.json({
        success: true,
        message: result.message,
        data: {
          documents: result.documents,
        },
      });
    } catch (error) {
      // Delete all uploaded files if there was an error
      if (req.files) {
        for (const file of req.files) {
          await fileUploadService
            .deleteFile(file.filename, "document")
            .catch(console.error);
        }
      }

      this.handleError(res, error, "Upload multiple documents failed");
    }
  };

  // Get employee documents
  getDocuments = async (req, res) => {
    try {
      const { id } = req.params;

      if (req.user && req.user.role === 'EMPLOYEE' && req.user.employeeId !== id) {
        return res.status(403).json({ success: false, error: "Access denied. You can only view your own documents." });
      }

      const { type, page = 1, limit = 10, verifiedOnly } = req.query;

      employeeValidationSchema.id.parse({ id });

      const options = {
        documentType: type || null,
        page: parseInt(page),
        limit: parseInt(limit),
        verifiedOnly: verifiedOnly === "true",
      };

      const result = await documentService.getEmployeeDocuments(id, options);

      res.json({
        success: true,
        data: result.documents,
        pagination: result.pagination,
      });
    } catch (error) {
      this.handleError(res, error, "Get documents failed");
    }
  };

  // Update document information
  updateDocument = async (req, res) => {
    try {
      const { documentId } = req.params;
      const updateData = req.body;

      const result = await documentService.updateDocument(
        documentId,
        updateData
      );

      res.json({
        success: true,
        message: result.message,
        data: {
          document: result.document,
        },
      });
    } catch (error) {
      this.handleError(res, error, "Update document failed");
    }
  };

  // Delete document
  deleteDocument = async (req, res) => {
    try {
      const { documentId } = req.params;

      const result = await documentService.deleteDocument(documentId);

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      this.handleError(res, error, "Delete document failed");
    }
  };

  // Verify document
  verifyDocument = async (req, res) => {
    try {
      const { documentId } = req.params;
      const { verifiedBy } = req.body;

      if (!verifiedBy) {
        return res.status(400).json({
          success: false,
          error: "Verifier ID is required",
        });
      }

      const result = await documentService.verifyDocument(
        documentId,
        verifiedBy
      );

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      this.handleError(res, error, "Verify document failed");
    }
  };

  // Get expiring documents
  getExpiringDocuments = async (req, res) => {
    try {
      const { days = 30 } = req.query;

      const documents = await documentService.getExpiringDocuments(
        parseInt(days)
      );

      res.json({
        success: true,
        data: documents,
      });
    } catch (error) {
      this.handleError(res, error, "Get expiring documents failed");
    }
  };

  // ========== EDUCATION OPERATIONS ==========

  // Add education record
  addEducation = async (req, res) => {
    try {
      const { id } = req.params;
      const educationData = req.body;

      employeeValidationSchema.id.parse({ id });

      const result = await employeeService.addEmployeeEducation(
        id,
        educationData
      );

      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          educationId: result.id,
        },
      });
    } catch (error) {
      this.handleError(res, error, "Add education record failed");
    }
  };

  // Get employee education records
  getEducation = async (req, res) => {
    try {
      const { id } = req.params;

      employeeValidationSchema.id.parse({ id });

      const education = await employeeService.getEmployeeEducation(id);

      res.json({
        success: true,
        data: education,
      });
    } catch (error) {
      this.handleError(res, error, "Get education records failed");
    }
  };

  // ========== COMMON METHODS ==========

  // Common error handler
  handleError(res, error, defaultMessage) {
    console.error(`${defaultMessage}:`, error);

    // Zod validation errors
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
    }

    // Not found errors
    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    // Duplicate entry errors
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        error: "Duplicate entry found",
        message: error.message,
      });
    }

    // Foreign key constraint errors
    if (
      error.code === "ER_ROW_IS_REFERENCED_2" ||
      error.code === "ER_NO_REFERENCED_ROW_2"
    ) {
      return res.status(409).json({
        success: false,
        error: "Cannot complete operation due to relationship constraints",
        message: error.message,
      });
    }

    // File validation errors
    if (
      error.message.includes("Invalid file type") ||
      error.message.includes("File size exceeds")
    ) {
      return res.status(400).json({
        success: false,
        error: "File validation failed",
        message: error.message,
      });
    }

    // Default server error
    res.status(500).json({
      success: false,
      error: defaultMessage,
      message: error.message,
      sqlMessage: error.sqlMessage,
      ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    });
  }
}

export const employeeController = new EmployeeController();
