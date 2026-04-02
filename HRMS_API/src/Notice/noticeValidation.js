import { z } from "zod";

const uuidSchema = z.string().uuid("Invalid UUID format");
const dateSchema = z
  .string()
  .regex(/^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])$/, "Date must be in YYYY-MM-DD format");

const targetAudienceEnum = z.enum(["ALL", "DEPARTMENT", "INDIVIDUAL"]);
const noticeTypeEnum = z.enum(["GENERAL", "POLICY", "EVENT", "URGENT"]);

const audienceConstraint = (schema) =>
  schema.superRefine((data, ctx) => {
    const audience = data.targetAudience ?? null;
    const departmentId = data.targetDepartmentId ?? null;
    const employeeId = data.targetEmployeeId ?? null;

    if (audience === "DEPARTMENT" && !departmentId) {
      ctx.addIssue({
        path: ["targetDepartmentId"],
        code: z.ZodIssueCode.custom,
        message: "Department target is required for department audience",
      });
    }

    if (audience === "INDIVIDUAL" && !employeeId) {
      ctx.addIssue({
        path: ["targetEmployeeId"],
        code: z.ZodIssueCode.custom,
        message: "Employee target is required for individual audience",
      });
    }

    if ((departmentId || employeeId) && audience === "ALL") {
      ctx.addIssue({
        path: ["targetAudience"],
        code: z.ZodIssueCode.custom,
        message: "Audience selection must match the provided targets",
      });
    }

    if (data.publishDate && data.expiryDate && data.expiryDate < data.publishDate) {
      ctx.addIssue({
        path: ["expiryDate"],
        code: z.ZodIssueCode.custom,
        message: "Expiry date cannot be before publish date",
      });
    }
  });

const noticeBase = audienceConstraint(
  z.object({
    title: z.string().min(1, "Title is required"),
    titleAmharic: z.string().optional().nullable(),
    content: z.string().min(1, "Content is required"),
    contentAmharic: z.string().optional().nullable(),
    noticeType: noticeTypeEnum.optional().default("GENERAL"),
    targetAudience: targetAudienceEnum.optional().default("ALL"),
    targetDepartmentId: uuidSchema.optional().nullable(),
    targetEmployeeId: uuidSchema.optional().nullable(),
    publishDate: dateSchema,
    expiryDate: dateSchema.optional().nullable(),
    isPublished: z.boolean().optional().default(false),
    createdBy: uuidSchema,
  }).strict()
);

const noticeUpdate = audienceConstraint(
  z
    .object({
      title: z.string().min(1).optional(),
      titleAmharic: z.string().nullable().optional(),
      content: z.string().min(1).optional(),
      contentAmharic: z.string().nullable().optional(),
      noticeType: noticeTypeEnum.optional(),
      targetAudience: targetAudienceEnum.optional(),
      targetDepartmentId: uuidSchema.optional().nullable(),
      targetEmployeeId: uuidSchema.optional().nullable(),
      publishDate: dateSchema.optional(),
      expiryDate: dateSchema.optional().nullable(),
      isPublished: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided",
    })
);

const noticePublish = z
  .object({
    isPublished: z.boolean(),
    publishDate: dateSchema.optional(),
    expiryDate: dateSchema.optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.expiryDate && data.publishDate && data.expiryDate < data.publishDate) {
      ctx.addIssue({
        path: ["expiryDate"],
        code: z.ZodIssueCode.custom,
        message: "Expiry date cannot be before publish date",
      });
    }
  });

const noticeIdSchema = z.object({ id: uuidSchema }).strict();
const noticeQuerySchema = z
  .object({
    noticeType: noticeTypeEnum.optional(),
    targetAudience: targetAudienceEnum.optional(),
    departmentId: uuidSchema.optional(),
    employeeId: uuidSchema.optional(),
    isPublished: z.enum(["true", "false"]).transform((val) => val === "true").optional(),
    activeOnly: z.enum(["true", "false"]).transform((val) => val === "true").optional(),
  })
  .passthrough();

export const noticeValidationSchema = {
  notice: {
    create: noticeBase,
    update: noticeUpdate,
    publish: noticePublish,
    id: noticeIdSchema,
    query: noticeQuerySchema,
  },
};

export const validateNotice = (schema, source = "body") => {
  return (req, res, next) => {
    try {
      const result = schema.parse(req[source]);
      req[source] = result;
      next();
    } catch (error) {
      res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors?.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
    }
  };
};
