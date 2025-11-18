import { employeeService } from "./EmployeeService.js";
import { fileUploadService } from "../../Commons/FileUploadService.js";
import { employeeValidationSchema } from "./employeeValidation.js";

export class EmployeeController {
  // Create employee
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
      });
    } catch (error) {
      this.handleError(res, error, "Find employees failed");
    }
  };

  // Get employee by ID
  findById = async (req, res) => {
    try {
      const { id } = req.params;
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

  // Upload profile picture
  uploadProfilePicture = async (req, res) => {
    try {
      const { id } = req.params;

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
          profile_picture: result.profile_picture,
        },
      });
    } catch (error) {
      // Delete uploaded file if there was an error
      if (req.file) {
        await fileUploadService
          .deleteFile(req.file.filename)
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

  // Update employee
// In EmployeeController.js - update method
 update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Use the custom update method instead of the generic one
    const result = await employeeService.updateEmployee(id, updateData);
    
    res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      data: result
    });
  } catch (error) {
    console.error('Update employee failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

  // Common error handler
  handleError(res, error, defaultMessage) {
    console.error(`${defaultMessage}:`, error);

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

    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        error: "Duplicate employee code found",
      });
    }

    res.status(500).json({
      success: false,
      error: defaultMessage,
      message: error.message,
    });
  }
}

export const employeeController = new EmployeeController();
