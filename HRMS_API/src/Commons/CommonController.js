import { CrudService } from "./CommonServices.js";

export class CrudController {
  constructor(service, validationSchema) {
    this.service = service;
    this.validationSchema = validationSchema;
  }

  // Create record with validation
  create = async (req, res) => {
    try {
      // Use validation schema if provided
      const validatedData = this.validationSchema?.create
        ? this.validationSchema.create.parse(req.body)
        : req.body;

      const result = await this.service.create(validatedData);

      res.status(201).json({
        success: true,
        message: "Record created successfully",
        data: result,
      });
    } catch (error) {
      this.handleError(res, error, "Create operation failed");
    }
  };

  // Get all records
  findAll = async (req, res) => {
    try {
      const options = {
        page: req.query.page || 1,
        limit: req.query.limit || 10,
        search: req.query.search,
        searchFields: req.query.searchFields
          ? req.query.searchFields.split(",")
          : [],
        filters: { ...req.query },
        sortBy: req.query.sortBy || "created_at",
        sortOrder: req.query.sortOrder || "DESC",
      };

      // Remove pagination and sorting params from filters
      [
        "page",
        "limit",
        "search",
        "searchFields",
        "sortBy",
        "sortOrder",
      ].forEach((param) => {
        delete options.filters[param];
      });

      const result = await this.service.findAll(options);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      this.handleError(res, error, "Find all operation failed");
    }
  };

  // Get record by ID
  findById = async (req, res) => {
    try {
      const { id } = req.params;

      // Validate ID if schema provided
      if (this.validationSchema?.id) {
        this.validationSchema.id.parse({ id });
      }

      const result = await this.service.findById(id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      this.handleError(res, error, "Find by ID operation failed");
    }
  };

  // Update record with validation
  update = async (req, res) => {
    try {
      const { id } = req.params;

      // Validate ID if schema provided
      if (this.validationSchema?.id) {
        this.validationSchema.id.parse({ id });
      }

      // Use validation schema if provided
      const validatedData = this.validationSchema?.update
        ? this.validationSchema.update.parse(req.body)
        : req.body;

      const result = await this.service.update(id, validatedData);

      res.json({
        success: true,
        message: "Record updated successfully",
        data: result,
      });
    } catch (error) {
      this.handleError(res, error, "Update operation failed");
    }
  };

  // Delete record
  delete = async (req, res) => {
    try {
      const { id } = req.params;

      // Validate ID if schema provided
      if (this.validationSchema?.id) {
        this.validationSchema.id.parse({ id });
      }

      await this.service.delete(id);

      res.json({
        success: true,
        message: "Record deleted successfully",
      });
    } catch (error) {
      this.handleError(res, error, "Delete operation failed");
    }
  };

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
      });
    }

    // Foreign key constraint errors
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        success: false,
        error: "Cannot delete record. It is being used by other records.",
      });
    }

    // Default error
    res.status(500).json({
      success: false,
      error: defaultMessage,
      message: error.message,
    });
  }
}
