import { z } from "zod";

export const designationValidationSchema = {
  create: z.object({
    department_id: z
      .string()
      .uuid("Invalid department ID format")
      .min(1, "Department ID is required"),
    title: z
      .string()
      .min(1, "Title is required")
      .max(255, "Title must be less than 55 characters"),
    title_amharic: z
      .string()
      .max(255, "Amharic title must be less than 55 characters")
      .optional()
      .nullable(),
    job_description: z
      .string()
      .max(2000, "Job description must be less than 200 characters")
      .optional()
      .nullable(),
    job_description_amharic: z
      .string()
      .max(2000, "Amharic job description must be less than 200 characters")
      .optional()
      .nullable(),
    grade_level: z
      .string()
      .max(50, "Grade level must be less than 50 characters")
      .optional()
      .nullable(),
    min_salary: z
      .number()
      .min(0, "Minimum salary cannot be negative")
      .optional()
      .nullable(),
    max_salary: z
      .number()
      .min(0, "Maximum salary cannot be negative")
      .optional()
      .nullable(),
    status: z.enum(["active", "inactive"]).default("active"),
  }),

  update: z.object({
    department_id: z.string().uuid("Invalid department ID format").optional(),
    title: z
      .string()
      .min(1, "Title is required")
      .max(255, "Title must be less than 255 characters")
      .optional(),
    title_amharic: z
      .string()
      .max(255, "Amharic title must be less than 255 characters")
      .optional()
      .nullable(),
    job_description: z
      .string()
      .max(2000, "Job description must be less than 2000 characters")
      .optional()
      .nullable(),
    job_description_amharic: z
      .string()
      .max(2000, "Amharic job description must be less than 2000 characters")
      .optional()
      .nullable(),
    grade_level: z
      .string()
      .max(50, "Grade level must be less than 50 characters")
      .optional()
      .nullable(),
    min_salary: z
      .number()
      .min(0, "Minimum salary cannot be negative")
      .optional()
      .nullable(),
    max_salary: z
      .number()
      .min(0, "Maximum salary cannot be negative")
      .optional()
      .nullable(),
    status: z.enum(["active", "inactive"]).optional(),
  }),

  id: z.object({
    id: z.string().uuid("Invalid designation ID format"),
  }),
};

// For backward compatibility
export const createDesignationSchema = designationValidationSchema.create;
export const updateDesignationSchema = designationValidationSchema.update;
export const designationIdSchema = designationValidationSchema.id;

export const validateDesignation = (schema) => {
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
