import { z } from "zod";

export const departmentValidationSchema = {
  create: z.object({
    company_id: z
      .string()
      .uuid("Invalid company ID format")
      .min(1, "Company ID is required"),
    department_type: z.enum(["academic", "administrative"], {
      errorMap: () => ({ message: "Invalid department type" }),
    }),
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
    parent_department_id: z.string().uuid("Invalid parent department ID format").optional().nullable(),
    manager_id: z.string().uuid().nullable().optional(),
    department_status: z.enum(["active", "inactive"]).default("active"),
  }).superRefine((data, ctx) => {
    const type = data.department_type;
    const hasCollege = Boolean(data.college_id);
    const hasParent = Boolean(data.parent_department_id);

    if (type === "academic") {
      if (!hasCollege) {
        ctx.addIssue({
          path: ["college_id"],
          code: z.ZodIssueCode.custom,
          message: "college_id is required for academic departments",
        });
      }
      if (hasParent) {
        ctx.addIssue({
          path: ["parent_department_id"],
          code: z.ZodIssueCode.custom,
          message: "parent_department_id must be omitted for academic departments",
        });
      }
    } else {
      if (hasCollege) {
        ctx.addIssue({
          path: ["college_id"],
          code: z.ZodIssueCode.custom,
          message: "college_id must be omitted for non-academic departments",
        });
      }
      // For administrative, parent_department_id is allowed (nullable for top-level)
    }
  }),

  update: z.object({
    company_id: z.string().uuid("Invalid company ID format").optional(),
    department_type: z
      .enum(["academic", "administrative"], {
        errorMap: () => ({ message: "Invalid department type" }),
      })
      .optional(),
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
    parent_department_id: z.string().uuid("Invalid parent department ID format").optional().nullable(),
    manager_id: z
      .string()
      .uuid("Invalid manager ID format")
      .optional()
      .nullable(),
    department_status: z.enum(["active", "inactive"]).optional(),
  }).superRefine((data, ctx) => {
    if ("department_type" in data && data.department_type === "academic") {
      if (!("college_id" in data) || !data.college_id) {
        ctx.addIssue({
          path: ["college_id"],
          code: z.ZodIssueCode.custom,
          message: "Updating to 'academic' requires providing college_id",
        });
      }
      if ("parent_department_id" in data && data.parent_department_id) {
        ctx.addIssue({
          path: ["parent_department_id"],
          code: z.ZodIssueCode.custom,
          message: "parent_department_id must be omitted for academic departments",
        });
      }
    }
    if ("department_type" in data && data.department_type === "administrative") {
      if ("college_id" in data && data.college_id) {
        ctx.addIssue({
          path: ["college_id"],
          code: z.ZodIssueCode.custom,
          message: "college_id must be omitted for administrative departments",
        });
      }
      // parent_department_id is allowed (nullable for top-level)
    }
  }),

  id: z.object({
    id: z.string().uuid("Invalid department ID format"),
  }),
};

// Conditional rules enforced at application level to give clear errors before DB triggers
// Create: require college_id when department_type === 'academic'; forbid college_id for non-academic
departmentValidationSchema.create = departmentValidationSchema.create.superRefine((data, ctx) => {
  const type = data.department_type;
  const hasCollege = Boolean(data.college_id);

  if (type === "academic") {
    if (!hasCollege) {
      ctx.addIssue({
        path: ["college_id"],
        code: z.ZodIssueCode.custom,
        message: "college_id is required for academic departments",
      });
    }
  } else {
    if (hasCollege) {
      ctx.addIssue({
        path: ["college_id"],
        code: z.ZodIssueCode.custom,
        message: "college_id must be omitted for non-academic departments",
      });
    }
  }
});

// Update: enforce consistency only when both fields are present in the payload
departmentValidationSchema.update = departmentValidationSchema.update.superRefine((data, ctx) => {
  if ("department_type" in data && data.department_type === "academic") {
    if (!("college_id" in data) || !data.college_id) {
      ctx.addIssue({
        path: ["college_id"],
        code: z.ZodIssueCode.custom,
        message: "Updating to 'academic' requires providing college_id",
      });
    }
  }

  if ("college_id" in data && data.college_id && "department_type" in data && data.department_type !== "academic") {
    ctx.addIssue({
      path: ["department_type"],
      code: z.ZodIssueCode.custom,
      message: "Cannot set college_id when department_type is not 'academic'",
    });
  }
});

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
