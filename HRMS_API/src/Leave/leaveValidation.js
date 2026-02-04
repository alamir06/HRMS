import { z } from "zod";

const uuidSchema = z.string().uuid("Invalid UUID format");
const dateSchema = z
  .string()
  .regex(/^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])$/, "Date must be in YYYY-MM-DD format");

const positiveDayCount = z
  .number({ invalid_type_error: "Value must be a number" })
  .min(0, "Value cannot be negative");

const leaveTypeBase = z.object({
  leave_name: z.string().min(1, "Leave name is required"),
  leave_name_amharic: z.string().optional().nullable(),
  leave_description: z.string().optional().nullable(),
  leave_description_amharic: z.string().optional().nullable(),
  max_days_per_year: positiveDayCount,
  carry_forward_days: positiveDayCount.optional().nullable(),
  requires_approval: z.boolean().optional(),
  color: z
    .string()
    .regex(/^#?[0-9A-Fa-f]{6}$/i, "Color must be a HEX value")
    .optional()
    .nullable(),
});

const leaveBalanceBase = z.object({
  employee_id: uuidSchema,
  leave_type_id: uuidSchema,
  year: z
    .number({ invalid_type_error: "Year must be a number" })
    .min(2000, "Year must be greater than or equal to 2000"),
  total_allocated_days: positiveDayCount,
  used_days: positiveDayCount.optional().nullable(),
  remaining_days: positiveDayCount.optional().nullable(),
  carry_forward_days: positiveDayCount.optional().nullable(),
});

const leaveRequestBase = z.object({
  employee_id: uuidSchema,
  leave_type_id: uuidSchema,
  start_date: dateSchema,
  end_date: dateSchema,
  total_days: positiveDayCount.optional(),
  reason: z.string().optional().nullable(),
  reason_amharic: z.string().optional().nullable(),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  approved_by: uuidSchema.optional().nullable(),
  approved_at: z.string().optional().nullable(),
  comments: z.string().optional().nullable(),
  comments_amharic: z.string().optional().nullable(),
});

export const leaveValidationSchema = {
  type: {
    create: leaveTypeBase,
    update: leaveTypeBase.partial(),
    id: z.object({ id: uuidSchema }),
  },
  balance: {
    create: leaveBalanceBase,
    update: leaveBalanceBase.partial(),
    id: z.object({ id: uuidSchema }),
  },
  request: {
    create: leaveRequestBase,
    update: leaveRequestBase.partial(),
    id: z.object({ id: uuidSchema }),
  },
  id: z.object({
    id: uuidSchema,
  }),
};

export const validateLeave = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
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
