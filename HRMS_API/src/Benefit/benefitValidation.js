import { z } from "zod";

const uuidSchema = z.string().uuid("Invalid UUID format");

const moneySchema = z
  .number({ invalidTypeError: "Value must be a number" })
  .min(0, "Value cannot be negative");

const benefitBase = z.object({
  benefitName: z.string().min(1, "Benefit name is required"),
  benefitNameAmharic: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  descriptionAmharic: z.string().optional().nullable(),
  benefitType: z.enum(["HEALTH", "RETIREMENT", "INSURANCE", "WELLNESS", "OTHER"]),
  costToCompany: moneySchema.optional().nullable(),
  isActive: z.boolean().optional(),
}).strict();

const enrollmentBase = z.object({
  employeeId: uuidSchema,
  benefitId: uuidSchema,
  enrollmentDate: z
    .string()
    .regex(/^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])$/, "Date must be in YYYY-MM-DD format"),
  coverageAmount: moneySchema.optional().nullable(),
  employeeContribution: moneySchema.optional().nullable(),
  companyContribution: moneySchema.optional().nullable(),
  status: z.enum(["ACTIVE", "CANCELLED", "SUSPENDED"]).optional(),
  endDate: z
    .string()
    .regex(/^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])$/, "Date must be in YYYY-MM-DD format")
    .optional()
    .nullable(),
}).strict();

export const benefitValidationSchema = {
  benefit: {
    create: benefitBase,
    update: benefitBase.partial(),
    id: z.object({ id: uuidSchema }).strict(),
  },
  enrollment: {
    create: enrollmentBase,
    update: enrollmentBase.partial(),
    id: z.object({ id: uuidSchema }).strict(),
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
