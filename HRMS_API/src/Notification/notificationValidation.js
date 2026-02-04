import { z } from "zod";

const uuidSchema = z.string().uuid("Invalid UUID format");
const notificationTypeEnum = z.enum(["info", "warning", "success", "error"]);
const relatedModuleEnum = z.enum([
  "attendance",
  "leave",
  "payroll",
  "recruitment",
  "performance",
  "general",
]);

const booleanString = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const paginationShape = {
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform((value) => Math.min(Number(value), 200))
    .optional(),
  offset: z
    .string()
    .regex(/^\d+$/)
    .transform((value) => Number(value))
    .optional(),
};

const notificationBase = z.object({
  user_id: uuidSchema,
  title: z.string().min(1, "Title is required"),
  title_amharic: z.string().optional().nullable(),
  message: z.string().min(1, "Message is required"),
  message_amharic: z.string().optional().nullable(),
  notification_type: notificationTypeEnum.optional().default("info"),
  related_module: relatedModuleEnum.optional().default("general"),
  related_id: uuidSchema.optional().nullable(),
  is_read: z.boolean().optional().default(false),
});

const notificationUpdate = z
  .object({
    title: z.string().min(1).optional(),
    title_amharic: z.string().nullable().optional(),
    message: z.string().min(1).optional(),
    message_amharic: z.string().nullable().optional(),
    notification_type: notificationTypeEnum.optional(),
    related_module: relatedModuleEnum.optional(),
    related_id: uuidSchema.optional().nullable(),
    is_read: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

const notificationReadSchema = z.object({
  is_read: z.boolean().optional().default(true),
});

const notificationBulkReadSchema = z
  .object({
    notification_ids: z.array(uuidSchema).optional(),
    is_read: z.boolean().optional().default(true),
    mark_all: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    if (!data.mark_all && (!data.notification_ids || data.notification_ids.length === 0)) {
      ctx.addIssue({
        path: ["notification_ids"],
        code: z.ZodIssueCode.custom,
        message: "Provide notification_ids or set mark_all to true",
      });
    }
  });

const queryFilters = z
  .object({
    user_id: uuidSchema.optional(),
    is_read: booleanString.optional(),
    notification_type: notificationTypeEnum.optional(),
    related_module: relatedModuleEnum.optional(),
    ...paginationShape,
  })
  .passthrough();

const userParams = z.object({ userId: uuidSchema });
const notificationIdSchema = z.object({ id: uuidSchema });

export const notificationValidationSchema = {
  notification: {
    create: notificationBase,
    update: notificationUpdate,
    read: notificationReadSchema,
    bulkRead: notificationBulkReadSchema,
    id: notificationIdSchema,
    params: userParams,
    query: queryFilters,
  },
};

export const validateNotification = (schema, source = "body") => {
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
