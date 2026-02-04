import { CrudService } from "./CommonServices.js";
import { ZodError } from "zod";

export class CrudController {
  constructor(service, validationSchema,options={}) {
    this.service = service;
    this.validationSchema = validationSchema;
    this.displayNameField = options.displayNameField;
    this.entityLabel = options.entityLabel || "Record";
  }

create = async (req, res) => {
  try {
    const validatedData = this.validationSchema?.create
      ? this.validationSchema.create.parse(req.body)
      : req.body;
    const result = await this.service.create(validatedData);
    const displayName =
      this.displayNameField && validatedData[this.displayNameField]
        ? `'${validatedData[this.displayNameField]}'`
        : "";
    res.status(201).json({
      success: true,
      message: `${this.entityLabel} ${displayName} created successfully`,
      data: result,
    });
  } catch (error) {
    if (error.type === "DUPLICATE") {
      return res.status(409).json({
        success: false,
        message: `${this.entityLabel} with this ${error.field} already exists`,
      });
    }
    this.handleError(res, error, `${this.entityLabel} creation failed`);
  }
};

bulkCreate = async (req, res) => {
    try {
      const validatedData = this.validationSchema?.bulk
        ? this.validationSchema.bulk.parse(req.body)
        : req.body;
      const result = await this.service.bulkCreate(validatedData.items || validatedData);
      res.status(201).json({
        success: true,
        message: `${result.length} records created successfully`,
        data: result,
      });
    } catch (error) {
      this.handleError(res, error, "Bulk create operation failed");
    }
  };

  findAll = async (req, res) => {
    try {
      const { include } = req.query;
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
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

      // Remove pagination and sorting params from filters
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

  count = async (req, res) => {
    try {
      const filters = { ...req.query };
      
      // Remove pagination and sorting params from filters
      ['page', 'limit', 'search', 'searchFields', 'sortBy', 'sortOrder', 'include'].forEach(
        param => delete filters[param]
      );

      const count = await this.service.count(filters);
      
      res.json({
        success: true,
        data: { count }
      });
    } catch (error) {
      this.handleError(res, error, "Count operation failed");
    }
  };

  exists = async (req, res) => {
    try {
      const { id } = req.params;
      
      if (this.validationSchema?.id) {
        this.validationSchema.id.parse({ id });
      }

      const exists = await this.service.exists(id);
      
      res.json({
        success: true,
        data: { exists }
      });
    } catch (error) {
      this.handleError(res, error, "Exists check failed");
    }
  };

  transformSingleResponseWithIncludes(data, includeArray) {
    if (!data || !includeArray || includeArray.length === 0) {
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
    if (!dataArray || !Array.isArray(dataArray) || !includeArray || includeArray.length === 0) {
      return dataArray;
    }

    return dataArray.map((item) =>
      this.transformSingleResponseWithIncludes(item, includeArray)
    );
  }

handleError(res, error, defaultMessage) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.errors.map(err => ({
        field: err.path.join("."),
        message: err.message,
      })),
    });
  }

  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      success: false,
      message: "Duplicate record exists",
    });
  }

  if (error.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(400).json({
      success: false,
      message: "Invalid reference provided",
      details: error.sqlMessage,
    });
  }

  console.error(error);
  return res.status(500).json({
    success: false,
    message: defaultMessage,
  });
}
}
