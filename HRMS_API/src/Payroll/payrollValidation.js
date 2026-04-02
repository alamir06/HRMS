import { z } from "zod";

const uuidSchema = z.string().uuid("Invalid UUID format");
const dateSchema = z
  .string()
  .regex(/^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])$/, "Date must be in YYYY-MM-DD format");

const currencySchema = z.coerce
  .number({ invalidTypeError: "Value must be a number" })
  .min(0, "Value cannot be negative");

const payrollStatusEnum = z.enum(["Pending", "Paid", "Unpaid"]);

const earningsSchema = z.object({
  basicSalary: currencySchema,
  houseRentAllowance: currencySchema.optional().default(0),
  travelAllowance: currencySchema.optional().default(0),
  medicalAllowance: currencySchema.optional().default(0),
  overtimeAllowance: currencySchema.optional().default(0),
  otherAllowances: currencySchema.optional().default(0),
}).strict();

const deductionsSchema = z.object({
  taxDeduction: currencySchema.optional().default(0),
  providentFund: currencySchema.optional().default(0),
  leaveDeduction: currencySchema.optional().default(0),
  otherDeductions: currencySchema.optional().default(0),
}).strict();

const basePayrollSchema = z
  .object({
    employeeId: uuidSchema,
    payPeriodStart: dateSchema,
    payPeriodEnd: dateSchema,
    paymentDate: dateSchema.optional().nullable(),
    paymentStatus: payrollStatusEnum.optional().default("Pending"),
    generatedBy: uuidSchema,
  })
  .merge(earningsSchema)
  .merge(deductionsSchema)
  .superRefine((data, ctx) => {
    if (data.payPeriodEnd < data.payPeriodStart) {
      ctx.addIssue({
        path: ["payPeriodEnd"],
        code: z.ZodIssueCode.custom,
        message: "Pay period end cannot be before start date",
      });
    }

    if (data.paymentDate && data.paymentDate < data.payPeriodEnd) {
      ctx.addIssue({
        path: ["paymentDate"],
        code: z.ZodIssueCode.custom,
        message: "Payment date cannot be before the pay period ends",
      });
    }
  });

const payrollUpdateSchema = z
  .object({
    employeeId: uuidSchema.optional(),
    payPeriodStart: dateSchema.optional(),
    payPeriodEnd: dateSchema.optional(),
    paymentDate: dateSchema.optional().nullable(),
    paymentStatus: payrollStatusEnum.optional(),
    generatedBy: uuidSchema.optional(),
  })
  .merge(earningsSchema.partial())
  .merge(deductionsSchema.partial())
  .superRefine((data, ctx) => {
    if (data.payPeriodStart && data.payPeriodEnd && data.payPeriodEnd < data.payPeriodStart) {
      ctx.addIssue({
        path: ["payPeriodEnd"],
        code: z.ZodIssueCode.custom,
        message: "Pay period end cannot be before start date",
      });
    }

    if (data.paymentDate && data.payPeriodEnd && data.paymentDate < data.payPeriodEnd) {
      ctx.addIssue({
        path: ["paymentDate"],
        code: z.ZodIssueCode.custom,
        message: "Payment date cannot be before the pay period ends",
      });
    }
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

const markPaidSchema = z
  .object({
    paymentDate: dateSchema.optional().nullable(),
    paymentStatus: payrollStatusEnum.optional().default("Paid"),
  })
  .superRefine((data, ctx) => {
    if (data.paymentStatus && data.paymentStatus !== "Paid") {
      ctx.addIssue({
        path: ["paymentStatus"],
        code: z.ZodIssueCode.custom,
        message: "Payment status must be set to Paid when marking as paid",
      });
    }
  });

const payrollQuerySchema = z
  .object({
    employeeId: uuidSchema.optional(),
    paymentStatus: payrollStatusEnum.optional(),
    startDate: dateSchema.optional(),
    endDate: dateSchema.optional(),
    includePending: z.enum(["true", "false"]).transform((val) => val === "true").optional(),
    limit: z
      .string()
      .regex(/^\d+$/)
      .transform((val) => Math.min(Number(val), 200))
      .optional(),
    offset: z
      .string()
      .regex(/^\d+$/)
      .transform((val) => Number(val))
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        path: ["endDate"],
        code: z.ZodIssueCode.custom,
        message: "End date cannot be before start date",
      });
    }
  })
  .passthrough();

const payrollIdSchema = z.object({ id: uuidSchema }).strict();
const employeeParamSchema = z.object({ employeeId: uuidSchema }).strict();

export const payrollValidationSchema = {
  payroll: {
    create: basePayrollSchema,
    update: payrollUpdateSchema,
    markPaid: markPaidSchema,
    id: payrollIdSchema,
    query: payrollQuerySchema,
    employee: employeeParamSchema,
  },
};

export const validatePayroll = (schema, source = "body") => {
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
