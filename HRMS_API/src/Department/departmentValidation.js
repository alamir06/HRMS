import { z } from "zod";

export const departmentValidationSchema = {
  create: z.object({
    company_id: z
      .string()
      .uuid("Invalid company ID format")
      .min(1, "Company ID is required"),
    college_id: z
      .string()
      .uuid("Invalid college ID format")
      .optional()
      .nullable(),
    department_name: z
      .string()
      .min(1, "Department name is required")
      .max(255, "Department name must be less than 255 characters"),
    department_name_amharic: z
      .string()
      .max(255, "Amharic department name must be less than 255 characters")
      .optional()
      .nullable(),
    department_description: z
      .string()
      .max(1000, "Description must be less than 1000 characters")
      .optional()
      .nullable(),
    department_description_amharic: z
      .string()
      .max(1000, "Amharic description must be less than 1000 characters")
      .optional()
      .nullable(),
    manager_id: z
      .string()
      .uuid("Invalid manager ID format")
      .optional()
      .nullable(),
    department_status: z.enum(["active", "inactive"]).default("active"),
  }),

  update: z.object({
    company_id: z.string().uuid("Invalid company ID format").optional(),
    college_id: z
      .string()
      .uuid("Invalid college ID format")
      .optional()
      .nullable(),
    department_name: z
      .string()
      .min(1, "Department name is required")
      .max(255, "Department name must be less than 255 characters")
      .optional(),
    department_name_amharic: z
      .string()
      .max(255, "Amharic department name must be less than 255 characters")
      .optional()
      .nullable(),
    department_description: z
      .string()
      .max(1000, "Description must be less than 1000 characters")
      .optional()
      .nullable(),
    department_description_amharic: z
      .string()
      .max(1000, "Amharic description must be less than 1000 characters")
      .optional()
      .nullable(),
    manager_id: z
      .string()
      .uuid("Invalid manager ID format")
      .optional()
      .nullable(),
    department_status: z.enum(["active", "inactive"]).optional(),
  }),

  id: z.object({
    id: z.string().uuid("Invalid department ID format"),
  }),
};

// For backward compatibility
export const createDepartmentSchema = departmentValidationSchema.create;
export const updateDepartmentSchema = departmentValidationSchema.update;
export const departmentIdSchema = departmentValidationSchema.id;

export const validateDepartment = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
    }
  };
};
