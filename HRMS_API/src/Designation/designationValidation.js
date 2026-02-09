import { z } from "zod";

export const designationValidationSchema = {
  create: z.object({
    employee_id: z
      .string()
      .uuid("Invalid employee ID format"),
    department_id: z
      .string()
      .uuid("Invalid department ID format")
      .optional(),
    college_id: z
      .string()
      .uuid("Invalid college ID format")
      .optional(),
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
    employee_id: z.string().uuid("Invalid employee ID format").optional(),
    department_id: z.string().uuid("Invalid department ID format").optional(),
    college_id: z.string().uuid("Invalid college ID format").optional(),
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

// Conditional validation rules based on `title` intent
designationValidationSchema.create = designationValidationSchema.create.superRefine((data, ctx) => {
  const title = (data.title || "").toLowerCase();
  const hasDept = Boolean(data.department_id);
  const hasCollege = Boolean(data.college_id);
  const hasEmployee = Boolean(data.employee_id);
  const isDea = title.includes("dea") || title.includes("dean");
  const isHead = title.includes("head") || title.includes("department head");

  if (!hasEmployee) {
    ctx.addIssue({ path: ["employee_id"], code: z.ZodIssueCode.custom, message: "employee_id is required" });
  }

  if (isDea) {
    if (!hasCollege) {
      ctx.addIssue({ path: ["college_id"], code: z.ZodIssueCode.custom, message: "college_id is required for dean/DEA designations" });
    }
    if (hasDept) {
      ctx.addIssue({ path: ["department_id"], code: z.ZodIssueCode.custom, message: "department_id must be omitted for dean/DEA designations" });
    }
    return;
  }

  if (isHead) {
    // Academic department head: require both college_id and department_id
    if (!hasDept) {
      ctx.addIssue({ path: ["department_id"], code: z.ZodIssueCode.custom, message: "department_id is required for department head designations" });
    }
    if (!hasCollege) {
      ctx.addIssue({ path: ["college_id"], code: z.ZodIssueCode.custom, message: "college_id is required for department head designations" });
    }
    return;
  }

  // Default: other designations require a department_id
  if (!hasDept) {
    ctx.addIssue({ path: ["department_id"], code: z.ZodIssueCode.custom, message: "department_id is required for this designation" });
  }
});

designationValidationSchema.update = designationValidationSchema.update.superRefine((data, ctx) => {
  const title = data.title ? (data.title || "").toLowerCase() : null;
  const hasDept = "department_id" in data && Boolean(data.department_id);
  const hasCollege = "college_id" in data && Boolean(data.college_id);
  const hasEmployee = "employee_id" in data && Boolean(data.employee_id);
  const isDea = title && (title.includes("dea") || title.includes("dean"));
  const isHead = title && (title.includes("head") || title.includes("department head"));

  if (!hasEmployee) {
    ctx.addIssue({ path: ["employee_id"], code: z.ZodIssueCode.custom, message: "employee_id is required" });
  }

  if (isDea) {
    if (!hasCollege) {
      ctx.addIssue({ path: ["college_id"], code: z.ZodIssueCode.custom, message: "college_id is required for dean/DEA designations" });
    }
    if (hasDept) {
      ctx.addIssue({ path: ["department_id"], code: z.ZodIssueCode.custom, message: "department_id must be omitted for dean/DEA designations" });
    }
    return;
  }

  if (isHead) {
    if (!hasDept) {
      ctx.addIssue({ path: ["department_id"], code: z.ZodIssueCode.custom, message: "department_id is required for department head designations" });
    }
    if (!hasCollege) {
      ctx.addIssue({ path: ["college_id"], code: z.ZodIssueCode.custom, message: "college_id is required for department head designations" });
    }
    return;
  }

  if (!title && !hasDept && !hasCollege) {
    ctx.addIssue({ path: ["department_id"], code: z.ZodIssueCode.custom, message: "department_id is required for this designation" });
  }
});
