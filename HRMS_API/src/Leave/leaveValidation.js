import { z } from "zod";

const uuidSchema = z.string().uuid("Invalid UUID format");
const dateSchema = z
  .string()
  .regex(/^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])$/, "Date must be in YYYY-MM-DD format");

const positiveDayCount = z
  .number({ invalidTypeError: "Value must be a number" })
  .min(0, "Value cannot be negative");

const leaveTypeBase = z.object({
  leaveName: z.string().min(1, "Leave name is required"),
  leaveNameAmharic: z.string().optional().nullable(),
  leaveDescription: z.string().optional().nullable(),
  leaveDescriptionAmharic: z.string().optional().nullable(),
  maxDaysPerYear: positiveDayCount,
  carryForwardDays: positiveDayCount.optional().nullable(),
  requiresApproval: z.boolean().optional(),
  color: z
    .string()
    .regex(/^#?[0-9A-Fa-f]{6}$/i, "Color must be a HEX value")
    .optional()
    .nullable(),
}).strict();

const leaveBalanceBase = z.object({
  employeeId: uuidSchema,
  leaveTypeId: uuidSchema,
  year: z
    .number({ invalidTypeError: "Year must be a number" })
    .min(2000, "Year must be greater than or equal to 2000"),
  totalAllocatedDays: positiveDayCount,
  usedDays: positiveDayCount.optional().nullable(),
  remainingDays: positiveDayCount.optional().nullable(),
  carryForwardDays: positiveDayCount.optional().nullable(),
}).strict();

const leaveRequestBase = z.object({
  employeeId: uuidSchema,
  leaveTypeId: uuidSchema,
  startDate: dateSchema,
  endDate: dateSchema,
  totalDays: positiveDayCount.optional(),
  reason: z.string().optional().nullable(),
  reasonAmharic: z.string().optional().nullable(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  approvedBy: uuidSchema.optional().nullable(),
  approvedAt: z.string().optional().nullable(),
  comments: z.string().optional().nullable(),
  commentsAmharic: z.string().optional().nullable(),
}).strict();

export const leaveValidationSchema = {
  type: {
    create: leaveTypeBase,
    update: leaveTypeBase.partial(),
    id: z.object({ id: uuidSchema }).strict(),
  },
  balance: {
    create: leaveBalanceBase,
    update: leaveBalanceBase.partial(),
    id: z.object({ id: uuidSchema }).strict(),
  },
  request: {
    create: leaveRequestBase,
    update: leaveRequestBase.partial(),
    id: z.object({ id: uuidSchema }).strict(),
  },
  id: z.object({
    id: uuidSchema,
  }).strict(),
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
