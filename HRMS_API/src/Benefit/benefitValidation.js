import { z } from "zod";

const uuidSchema = z.string().uuid("Invalid UUID format");

const moneySchema = z
  .number({ invalid_type_error: "Value must be a number" })
  .min(0, "Value cannot be negative");

const benefitBase = z.object({
  benefit_name: z.string().min(1, "Benefit name is required"),
  benefit_name_amharic: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  description_amharic: z.string().optional().nullable(),
  benefit_type: z.enum(["health", "retirement", "insurance", "wellness", "other"]),
  cost_to_company: moneySchema.optional().nullable(),
  is_active: z.boolean().optional(),
});

const enrollmentBase = z.object({
  employee_id: uuidSchema,
  benefit_id: uuidSchema,
  enrollment_date: z
    .string()
    .regex(/^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])$/, "Date must be in YYYY-MM-DD format"),
  coverage_amount: moneySchema.optional().nullable(),
  employee_contribution: moneySchema.optional().nullable(),
  company_contribution: moneySchema.optional().nullable(),
  status: z.enum(["active", "cancelled", "suspended"]).optional(),
  end_date: z
    .string()
    .regex(/^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])$/, "Date must be in YYYY-MM-DD format")
    .optional()
    .nullable(),
});

export const benefitValidationSchema = {
  benefit: {
    create: benefitBase,
    update: benefitBase.partial(),
    id: z.object({ id: uuidSchema }),
  },
  enrollment: {
    create: enrollmentBase,
    update: enrollmentBase.partial(),
    id: z.object({ id: uuidSchema }),
  },
};

export const validateBenefit = (schema) => {
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
