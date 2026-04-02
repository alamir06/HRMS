import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, "Password must include upper, lower case letters and a number");

const uuidSchema = z.string().uuid("Invalid UUID");

export const authValidation = {
  login: z.object({
    identifier: z.string().min(1, "Username, email or phone is required"),
    password: z.string().min(1, "Password is required"),
  }).strict(),
  createUser: z.object({
    employeeId: uuidSchema,
    username: z
      .string()
      .min(4, "Username must be at least 4 characters")
      .regex(/^[a-zA-Z0-9._-]+$/, "Username may include letters, numbers, ., _ or -"),
    systemRole: z
      .enum([
        'HRMANAGER',
        'DEAN',
        'EMPLOYEE',
        'HEAD',
        'HROFFICER',
        'RECRUITER',
        'PAYROLLOFFICER',
      ])
      .optional(),
    temporaryPassword: passwordSchema.optional(),
    sendEmail: z.boolean().optional().default(true),
  }).strict(),
  changePassword: z
    .object({
      currentPassword: z.string().min(1, "Current password is required"),
      newPassword: passwordSchema,
      confirmPassword: z.string().min(1, "Confirm password is required"),
    })
    .superRefine((data, ctx) => {
      if (data.newPassword !== data.confirmPassword) {
        ctx.addIssue({
          path: ["confirmPassword"],
          code: z.ZodIssueCode.custom,
          message: "Passwords do not match",
        });
      }
    }),
};

export const validate = (schema, source = "body") => (req, res, next) => {
  try {
    const parsed = schema.parse(req[source]);
    req[source] = parsed;
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      error: "Validation failed",
      details: error.errors?.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
};
