import { z } from "zod";

const uuidSchema = z.string().uuid("Invalid UUID format");
const dateSchema = z
  .string()
  .regex(/^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])$/, "Date must be in YYYY-MM-DD format");

const currencySchema = z.coerce
  .number({ invalid_type_error: "Value must be a number" })
  .min(0, "Value cannot be negative");

const payrollStatusEnum = z.enum(["Pending", "Paid", "Unpaid"]);

const earningsSchema = z.object({
  basic_salary: currencySchema,
  house_rent_allowance: currencySchema.optional().default(0),
  travel_allowance: currencySchema.optional().default(0),
  medical_allowance: currencySchema.optional().default(0),
  overtime_allowance: currencySchema.optional().default(0),
  other_allowances: currencySchema.optional().default(0),
});

const deductionsSchema = z.object({
  tax_deduction: currencySchema.optional().default(0),
  provident_fund: currencySchema.optional().default(0),
  leave_deduction: currencySchema.optional().default(0),
  other_deductions: currencySchema.optional().default(0),
});

const basePayrollSchema = z
  .object({
    employee_id: uuidSchema,
    pay_period_start: dateSchema,
    pay_period_end: dateSchema,
    payment_date: dateSchema.optional().nullable(),
    payment_status: payrollStatusEnum.optional().default("Pending"),
    generated_by: uuidSchema,
  })
  .merge(earningsSchema)
  .merge(deductionsSchema)
  .superRefine((data, ctx) => {
    if (data.pay_period_end < data.pay_period_start) {
      ctx.addIssue({
        path: ["pay_period_end"],
        code: z.ZodIssueCode.custom,
        message: "Pay period end cannot be before start date",
      });
    }

    if (data.payment_date && data.payment_date < data.pay_period_end) {
      ctx.addIssue({
        path: ["payment_date"],
        code: z.ZodIssueCode.custom,
        message: "Payment date cannot be before the pay period ends",
      });
    }
  });

const payrollUpdateSchema = z
  .object({
    employee_id: uuidSchema.optional(),
    pay_period_start: dateSchema.optional(),
    pay_period_end: dateSchema.optional(),
    payment_date: dateSchema.optional().nullable(),
    payment_status: payrollStatusEnum.optional(),
    generated_by: uuidSchema.optional(),
  })
  .merge(earningsSchema.partial())
  .merge(deductionsSchema.partial())
  .superRefine((data, ctx) => {
    if (data.pay_period_start && data.pay_period_end && data.pay_period_end < data.pay_period_start) {
      ctx.addIssue({
        path: ["pay_period_end"],
        code: z.ZodIssueCode.custom,
        message: "Pay period end cannot be before start date",
      });
    }

    if (data.payment_date && data.pay_period_end && data.payment_date < data.pay_period_end) {
      ctx.addIssue({
        path: ["payment_date"],
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
    payment_date: dateSchema.optional().nullable(),
    payment_status: payrollStatusEnum.optional().default("Paid"),
  })
  .superRefine((data, ctx) => {
    if (data.payment_status && data.payment_status !== "Paid") {
      ctx.addIssue({
        path: ["payment_status"],
        code: z.ZodIssueCode.custom,
        message: "Payment status must be set to Paid when marking as paid",
      });
    }
  });

const payrollQuerySchema = z
  .object({
    employee_id: uuidSchema.optional(),
    payment_status: payrollStatusEnum.optional(),
    start_date: dateSchema.optional(),
    end_date: dateSchema.optional(),
    include_pending: z.enum(["true", "false"]).transform((val) => val === "true").optional(),
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
    if (data.start_date && data.end_date && data.end_date < data.start_date) {
      ctx.addIssue({
        path: ["end_date"],
        code: z.ZodIssueCode.custom,
        message: "End date cannot be before start date",
      });
    }
  })
  .passthrough();

const payrollIdSchema = z.object({ id: uuidSchema });
const employeeParamSchema = z.object({ employeeId: uuidSchema });

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
