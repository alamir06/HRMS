import { z } from "zod";

export const designationValidationSchema = {
  create: z.object({
    employeeId: z
      .string()
      .uuid("Invalid employee ID format"),
    departmentId: z
      .string()
      .uuid("Invalid department ID format")
      .optional(),
    collegeId: z
      .string()
      .uuid("Invalid college ID format")
      .optional(),
    title: z
      .string()
      .min(1, "Title is required")
      .max(255, "Title must be less than 55 characters"),
    titleAmharic: z
      .string()
      .max(255, "Amharic title must be less than 55 characters")
      .optional()
      .nullable(),
    jobDescription: z
      .string()
      .max(2000, "Job description must be less than 200 characters")
      .optional()
      .nullable(),
    jobDescriptionAmharic: z
      .string()
      .max(2000, "Amharic job description must be less than 200 characters")
      .optional()
      .nullable(),
    gradeLevel: z
      .string()
      .max(50, "Grade level must be less than 50 characters")
      .optional()
      .nullable(),
    minSalary: z
      .number()
      .min(0, "Minimum salary cannot be negative")
      .optional()
      .nullable(),
    maxSalary: z
      .number()
      .min(0, "Maximum salary cannot be negative")
      .optional()
      .nullable(),
    status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  }).strict(),

  update: z.object({
    employeeId: z.string().uuid("Invalid employee ID format").optional(),
    departmentId: z.string().uuid("Invalid department ID format").optional(),
    collegeId: z.string().uuid("Invalid college ID format").optional(),
    title: z
      .string()
      .min(1, "Title is required")
      .max(255, "Title must be less than 255 characters")
      .optional(),
    titleAmharic: z
      .string()
      .max(255, "Amharic title must be less than 255 characters")
      .optional()
      .nullable(),
    jobDescription: z
      .string()
      .max(2000, "Job description must be less than 2000 characters")
      .optional()
      .nullable(),
    jobDescriptionAmharic: z
      .string()
      .max(2000, "Amharic job description must be less than 2000 characters")
      .optional()
      .nullable(),
    gradeLevel: z
      .string()
      .max(50, "Grade level must be less than 50 characters")
      .optional()
      .nullable(),
    minSalary: z
      .number()
      .min(0, "Minimum salary cannot be negative")
      .optional()
      .nullable(),
    maxSalary: z
      .number()
      .min(0, "Maximum salary cannot be negative")
      .optional()
      .nullable(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  }).strict(),

  id: z.object({
    id: z.string().uuid("Invalid designation ID format"),
  }).strict(),
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
  const hasDept = Boolean(data.departmentId);
  const hasCollege = Boolean(data.collegeId);
  const hasEmployee = Boolean(data.employeeId);
  const isDea = title.includes("dea") || title.includes("DEAN");
  const isHead = title.includes("HEAD") || title.includes("department head");

  if (!hasEmployee) {
    ctx.addIssue({ path: ["employeeId"], code: z.ZodIssueCode.custom, message: "employeeId is required" });
  }

  if (isDea) {
    if (!hasCollege) {
      ctx.addIssue({ path: ["collegeId"], code: z.ZodIssueCode.custom, message: "collegeId is required for dean/DEA designations" });
    }
    if (hasDept) {
      ctx.addIssue({ path: ["departmentId"], code: z.ZodIssueCode.custom, message: "departmentId must be omitted for dean/DEA designations" });
    }
    return;
  }

  if (isHead) {
    // Academic department head: require both collegeId and departmentId
    if (!hasDept) {
      ctx.addIssue({ path: ["departmentId"], code: z.ZodIssueCode.custom, message: "departmentId is required for department head designations" });
    }
    if (!hasCollege) {
      ctx.addIssue({ path: ["collegeId"], code: z.ZodIssueCode.custom, message: "collegeId is required for department head designations" });
    }
    return;
  }

  // Default: other designations require a departmentId
  if (!hasDept) {
    ctx.addIssue({ path: ["departmentId"], code: z.ZodIssueCode.custom, message: "departmentId is required for this designation" });
  }
});

designationValidationSchema.update = designationValidationSchema.update.superRefine((data, ctx) => {
  const title = data.title ? (data.title || "").toLowerCase() : null;
  const hasDept = "departmentId" in data && Boolean(data.departmentId);
  const hasCollege = "collegeId" in data && Boolean(data.collegeId);
  const hasEmployee = "employeeId" in data && Boolean(data.employeeId);
  const isDea = title && (title.includes("dea") || title.includes("DEAN"));
  const isHead = title && (title.includes("HEAD") || title.includes("department head"));

  if (!hasEmployee) {
    ctx.addIssue({ path: ["employeeId"], code: z.ZodIssueCode.custom, message: "employeeId is required" });
  }

  if (isDea) {
    if (!hasCollege) {
      ctx.addIssue({ path: ["collegeId"], code: z.ZodIssueCode.custom, message: "collegeId is required for dean/DEA designations" });
    }
    if (hasDept) {
      ctx.addIssue({ path: ["departmentId"], code: z.ZodIssueCode.custom, message: "departmentId must be omitted for dean/DEA designations" });
    }
    return;
  }

  if (isHead) {
    if (!hasDept) {
      ctx.addIssue({ path: ["departmentId"], code: z.ZodIssueCode.custom, message: "departmentId is required for department head designations" });
    }
    if (!hasCollege) {
      ctx.addIssue({ path: ["collegeId"], code: z.ZodIssueCode.custom, message: "collegeId is required for department head designations" });
    }
    return;
  }

  if (!title && !hasDept && !hasCollege) {
    ctx.addIssue({ path: ["departmentId"], code: z.ZodIssueCode.custom, message: "departmentId is required for this designation" });
  }
});
