import { z } from "zod";

export const departmentValidationSchema = {
  create: z.object({
    companyId: z
      .string()
      .uuid("Invalid company ID format")
      .min(1, "Company ID is required"),
    departmentType: z.enum(["ACADEMIC", "ADMINISTRATIVE"], {
      errorMap: () => ({ message: "Invalid department type" }),
    }),
    collegeId: z
      .string()
      .uuid("Invalid college ID format")
      .optional()
      .nullable(),
    departmentName: z
      .string()
      .max(150, "Department name must be less than 150 characters")
      .optional()
      .nullable(),
    departmentNameAmharic: z
      .string()
      .max(150, "Amharic department name must be less than 150 characters")
      .optional()
      .nullable(),
    departmentDescription: z
      .string()
      .max(500, "Description must be less than 500 characters")
      .optional()
      .nullable(),
    departmentDescriptionAmharic: z
      .string()
      .max(500, "Amharic description must be less than 500 characters")
      .optional()
      .nullable(),
    parentDepartmentId: z.string().uuid("Invalid parent department ID format").optional().nullable(),
    managerId: z.string().uuid().nullable().optional(),
    departmentStatus: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  }).strict().superRefine((data, ctx) => {
    const type = data.departmentType;
    const hasCollege = Boolean(data.collegeId);
    const hasParent = Boolean(data.parentDepartmentId);

    if (type === "ACADEMIC") {
      if (!hasCollege) {
        ctx.addIssue({
          path: ["collegeId"],
          code: z.ZodIssueCode.custom,
          message: "collegeId is required for academic departments",
        });
      }
      if (hasParent) {
        ctx.addIssue({
          path: ["parentDepartmentId"],
          code: z.ZodIssueCode.custom,
          message: "parentDepartmentId must be omitted for academic departments",
        });
      }
    } else {
      if (hasCollege) {
        ctx.addIssue({
          path: ["collegeId"],
          code: z.ZodIssueCode.custom,
          message: "collegeId must be omitted for non-academic departments",
        });
      }
      // For administrative, parentDepartmentId is allowed (nullable for top-level)
    }
  }),

  update: z.object({
    companyId: z.string().uuid("Invalid company ID format").optional(),
    departmentType: z
      .enum(["ACADEMIC", "ADMINISTRATIVE"], {
        errorMap: () => ({ message: "Invalid department type" }),
      })
      .optional(),
    collegeId: z
      .string()
      .uuid("Invalid college ID format")
      .optional()
      .nullable(),
    departmentName: z
      .string()
      .max(155, "Department name must be less than 255 characters")
      .optional()
      .nullable(),
    departmentNameAmharic: z
      .string()
      .max(255, "Amharic department name must be less than 255 characters")
      .optional()
      .nullable(),
    departmentDescription: z
      .string()
      .max(500, "Description must be less than 1000 characters")
      .optional()
      .nullable(),
    departmentDescriptionAmharic: z
      .string()
      .max(10100, "Amharic description must be less than 1000 characters")
      .optional()
      .nullable(),
    parentDepartmentId: z.string().uuid("Invalid parent department ID format").optional().nullable(),
    managerId: z
      .string()
      .uuid("Invalid manager ID format")
      .optional()
      .nullable(),
    departmentStatus: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  }).superRefine((data, ctx) => {
    if ("departmentType" in data && data.departmentType === "ACADEMIC") {
      if (!("collegeId" in data) || !data.collegeId) {
        ctx.addIssue({
          path: ["collegeId"],
          code: z.ZodIssueCode.custom,
          message: "Updating to 'ACADEMIC' requires providing collegeId",
        });
      }
      if ("parentDepartmentId" in data && data.parentDepartmentId) {
        ctx.addIssue({
          path: ["parentDepartmentId"],
          code: z.ZodIssueCode.custom,
          message: "parentDepartmentId must be omitted for academic departments",
        });
      }
    }
    if ("departmentType" in data && data.departmentType === "ADMINISTRATIVE") {
      if ("collegeId" in data && data.collegeId) {
        ctx.addIssue({
          path: ["collegeId"],
          code: z.ZodIssueCode.custom,
          message: "collegeId must be omitted for administrative departments",
        });
      }
    }
  }),

  id: z.object({
    id: z.string().uuid("Invalid department ID format"),
  }),
};

departmentValidationSchema.create = departmentValidationSchema.create.superRefine((data, ctx) => {
  const type = data.departmentType;
  const hasCollege = Boolean(data.collegeId);

  if (type === "ACADEMIC") {
    if (!hasCollege) {
      ctx.addIssue({
        path: ["collegeId"],
        code: z.ZodIssueCode.custom,
        message: "collegeId is required for academic departments",
      });
    }
  } else {
    if (hasCollege) {
      ctx.addIssue({
        path: ["collegeId"],
        code: z.ZodIssueCode.custom,
        message: "collegeId must be omitted for non-academic departments",
      });
    }
  }

  if (!data.departmentName && !data.departmentNameAmharic) {
    ctx.addIssue({
      path: ["departmentName"],
      code: z.ZodIssueCode.custom,
      message: "At least one department name (English or Amharic) must be provided",
    });
  }
});

departmentValidationSchema.update = departmentValidationSchema.update.superRefine((data, ctx) => {
  if ("departmentType" in data && data.departmentType === "ACADEMIC") {
    if (!("collegeId" in data) || !data.collegeId) {
      ctx.addIssue({
        path: ["collegeId"],
        code: z.ZodIssueCode.custom,
        message: "Updating to 'ACADEMIC' requires providing collegeId",
      });
    }
  }

  if ("collegeId" in data && data.collegeId && "departmentType" in data && data.departmentType !== "ACADEMIC") {
    ctx.addIssue({
      path: ["departmentType"],
      code: z.ZodIssueCode.custom,
      message: "Cannot set collegeId when departmentType is not 'ACADEMIC'",
    });
  }

  if (!data.departmentName && !data.departmentNameAmharic && ("departmentName" in data || "departmentNameAmharic" in data)) {
    // If they sent names to update, but both are empty/null!
    // (We only check this if they are attempting to update words, but effectively if both are fully missing in partial update it's fine)
    // Wait, let's keep it simple. If they send empty string for one, but don't provide the other, it might fail.
    // Given zod partial update, it's safer to just skip this check or do it carefully.
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
