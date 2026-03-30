import { z } from "zod";

const uuidSchema = z.string().uuid("Invalid UUID format");
const notificationTypeEnum = z.enum(["INFO", "WARNING", "SUCCESS", "ERROR"]);
const relatedModuleEnum = z.enum([
  "attendance",
  "leave",
  "payroll",
  "recruitment",
  "PERFORMANCE",
  "GENERAL",
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
  userId: uuidSchema,
  title: z.string().min(1, "Title is required"),
  titleAmharic: z.string().optional().nullable(),
  message: z.string().min(1, "Message is required"),
  messageAmharic: z.string().optional().nullable(),
  notificationType: notificationTypeEnum.optional().default("INFO"),
  relatedModule: relatedModuleEnum.optional().default("GENERAL"),
  relatedId: uuidSchema.optional().nullable(),
  isRead: z.boolean().optional().default(false),
}).strict();

const notificationUpdate = z
  .object({
    title: z.string().min(1).optional(),
    titleAmharic: z.string().nullable().optional(),
    message: z.string().min(1).optional(),
    messageAmharic: z.string().nullable().optional(),
    notificationType: notificationTypeEnum.optional(),
    relatedModule: relatedModuleEnum.optional(),
    relatedId: uuidSchema.optional().nullable(),
    isRead: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

const notificationReadSchema = z.object({
  isRead: z.boolean().optional().default(true),
}).strict();

const notificationBulkReadSchema = z
  .object({
    notificationIds: z.array(uuidSchema).optional(),
    isRead: z.boolean().optional().default(true),
    markAll: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    if (!data.markAll && (!data.notificationIds || data.notificationIds.length === 0)) {
      ctx.addIssue({
        path: ["notificationIds"],
        code: z.ZodIssueCode.custom,
        message: "Provide notificationIds or set markAll to true",
      });
    }
  });

const queryFilters = z
  .object({
    userId: uuidSchema.optional(),
    isRead: booleanString.optional(),
    notificationType: notificationTypeEnum.optional(),
    relatedModule: relatedModuleEnum.optional(),
    ...paginationShape,
  })
  .passthrough();

const userParams = z.object({ userId: uuidSchema }).strict();
const notificationIdSchema = z.object({ id: uuidSchema }).strict();

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
