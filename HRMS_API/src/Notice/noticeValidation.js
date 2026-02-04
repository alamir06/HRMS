import { z } from "zod";

const uuidSchema = z.string().uuid("Invalid UUID format");
const dateSchema = z
  .string()
  .regex(/^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])$/, "Date must be in YYYY-MM-DD format");

const targetAudienceEnum = z.enum(["all", "department", "individual"]);
const noticeTypeEnum = z.enum(["general", "policy", "event", "urgent"]);

const audienceConstraint = (schema) =>
  schema.superRefine((data, ctx) => {
    const audience = data.target_audience ?? null;
    const departmentId = data.target_department_id ?? null;
    const employeeId = data.target_employee_id ?? null;

    if (audience === "department" && !departmentId) {
      ctx.addIssue({
        path: ["target_department_id"],
        code: z.ZodIssueCode.custom,
        message: "Department target is required for department audience",
      });
    }

    if (audience === "individual" && !employeeId) {
      ctx.addIssue({
        path: ["target_employee_id"],
        code: z.ZodIssueCode.custom,
        message: "Employee target is required for individual audience",
      });
    }

    if ((departmentId || employeeId) && audience === "all") {
      ctx.addIssue({
        path: ["target_audience"],
        code: z.ZodIssueCode.custom,
        message: "Audience selection must match the provided targets",
      });
    }

    if (data.publish_date && data.expiry_date && data.expiry_date < data.publish_date) {
      ctx.addIssue({
        path: ["expiry_date"],
        code: z.ZodIssueCode.custom,
        message: "Expiry date cannot be before publish date",
      });
    }
  });

const noticeBase = audienceConstraint(
  z.object({
    title: z.string().min(1, "Title is required"),
    title_amharic: z.string().optional().nullable(),
    content: z.string().min(1, "Content is required"),
    content_amharic: z.string().optional().nullable(),
    notice_type: noticeTypeEnum.optional().default("general"),
    target_audience: targetAudienceEnum.optional().default("all"),
    target_department_id: uuidSchema.optional().nullable(),
    target_employee_id: uuidSchema.optional().nullable(),
    publish_date: dateSchema,
    expiry_date: dateSchema.optional().nullable(),
    is_published: z.boolean().optional().default(false),
    created_by: uuidSchema,
  })
);

const noticeUpdate = audienceConstraint(
  z
    .object({
      title: z.string().min(1).optional(),
      title_amharic: z.string().nullable().optional(),
      content: z.string().min(1).optional(),
      content_amharic: z.string().nullable().optional(),
      notice_type: noticeTypeEnum.optional(),
      target_audience: targetAudienceEnum.optional(),
      target_department_id: uuidSchema.optional().nullable(),
      target_employee_id: uuidSchema.optional().nullable(),
      publish_date: dateSchema.optional(),
      expiry_date: dateSchema.optional().nullable(),
      is_published: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided",
    })
);

const noticePublish = z
  .object({
    is_published: z.boolean(),
    publish_date: dateSchema.optional(),
    expiry_date: dateSchema.optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.expiry_date && data.publish_date && data.expiry_date < data.publish_date) {
      ctx.addIssue({
        path: ["expiry_date"],
        code: z.ZodIssueCode.custom,
        message: "Expiry date cannot be before publish date",
      });
    }
  });

const noticeIdSchema = z.object({ id: uuidSchema });
const noticeQuerySchema = z
  .object({
    notice_type: noticeTypeEnum.optional(),
    target_audience: targetAudienceEnum.optional(),
    department_id: uuidSchema.optional(),
    employee_id: uuidSchema.optional(),
    is_published: z.enum(["true", "false"]).transform((val) => val === "true").optional(),
    active_only: z.enum(["true", "false"]).transform((val) => val === "true").optional(),
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
