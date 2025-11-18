import { CrudService } from "./CommonServices.js";

export class CrudController {
  constructor(service, validationSchema) {
    this.service = service;
    this.validationSchema = validationSchema;
  }
  create = async (req, res) => {
    try {
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
  findAll = async (req, res) => {
    try {
      const { include } = req.query;
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
        include: include
          ? include.split(",").filter((item) => item.trim() !== "")
          : [],
      };
      [
        "page",
        "limit",
        "search",
        "searchFields",
        "sortBy",
        "sortOrder",
        "include",
      ].forEach((param) => {
        delete options.filters[param];
      });

      const result = await this.service.findAll(options);
      const transformedData = this.transformResponseWithIncludes(
        result.data,
        options.include
      );

      res.json({
        success: true,
        data: transformedData,
        pagination: result.pagination,
      });
    } catch (error) {
      this.handleError(res, error, "Find all operation failed");
    }
  };

  findById = async (req, res) => {
    try {
      const { id } = req.params;
      const { include } = req.query;
      if (this.validationSchema?.id) {
        this.validationSchema.id.parse({ id });
      }
      const includeArray = include
        ? include.split(",").filter((item) => item.trim() !== "")
        : [];
      const result = await this.service.findById(id, ["*"], includeArray);
      const transformedData = this.transformSingleResponseWithIncludes(
        result,
        includeArray
      );
      res.json({
        success: true,
        data: transformedData,
      });
    } catch (error) {
      this.handleError(res, error, "Find by ID operation failed");
    }
  };

  update = async (req, res) => {
    try {
      const { id } = req.params;
      if (this.validationSchema?.id) {
        this.validationSchema.id.parse({ id });
      }
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

  delete = async (req, res) => {
    try {
      const { id } = req.params;
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

  transformSingleResponseWithIncludes(data, includeArray) {
    if (!data || includeArray.length === 0) {
      return data;
    }
    const transformed = { ...data };
    includeArray.forEach((relation) => {
      const relationData = {};
      const prefix = `${relation}_`;
      Object.keys(data).forEach((key) => {
        if (key.startsWith(prefix)) {
          const fieldName = key.slice(prefix.length);
          relationData[fieldName] = data[key];
          delete transformed[key];
        }
      });
      if (Object.keys(relationData).length > 0) {
        transformed[relation] = relationData;
      }
    });

    return transformed;
  }
  transformResponseWithIncludes(dataArray, includeArray) {
    if (!dataArray || !Array.isArray(dataArray) || includeArray.length === 0) {
      return dataArray;
    }

    return dataArray.map((item) =>
      this.transformSingleResponseWithIncludes(item, includeArray)
    );
  }
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
        error: "Duplicate entry found",
      });
    }
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        success: false,
        error: "Cannot delete record. It is being used by other records.",
      });
    }
    res.status(500).json({
      success: false,
      error: defaultMessage,
      message: error.message,
    });
  }
}
