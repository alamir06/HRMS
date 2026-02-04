import { z } from "zod";

const uuidSchema = z.string().uuid("Invalid UUID format");
const dateSchema = z
  .string()
  .regex(/^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])$/, "Date must be in YYYY-MM-DD format");

const assetCategoryBase = z.object({
  category_name: z.string().min(1, "Category name is required"),
  category_name_amharic: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  description_amharic: z.string().optional().nullable(),
});

const moneySchema = z
  .number({ invalid_type_error: "Value must be a number" })
  .nonnegative("Value cannot be negative")
  .optional()
  .nullable();

const assetBase = z.object({
  asset_name: z.string().min(1, "Asset name is required"),
  asset_name_amharic: z.string().optional().nullable(),
  asset_category_id: uuidSchema,
  serial_number: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  purchase_date: dateSchema.optional().nullable(),
  purchase_cost: moneySchema,
  current_value: moneySchema,
  status: z.enum(["available", "assigned", "maintenance", "disposed"]).optional(),
  location: z.string().optional().nullable(),
  location_amharic: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  notes_amharic: z.string().optional().nullable(),
});

const assignmentBase = z.object({
  asset_id: uuidSchema,
  employee_id: uuidSchema,
  assigned_date: dateSchema,
  expected_return_date: dateSchema.optional().nullable(),
  assignment_reason: z.string().optional().nullable(),
  assignment_reason_amharic: z.string().optional().nullable(),
  condition_assigned: z.string().optional().nullable(),
  condition_assigned_amharic: z.string().optional().nullable(),
  assigned_by: uuidSchema,
});

const returnSchema = z.object({
  actual_return_date: dateSchema.optional().nullable(),
  condition_returned: z.string().optional().nullable(),
  condition_returned_amharic: z.string().optional().nullable(),
  status: z.enum(["returned", "overdue"]).optional(),
});

export const assetValidationSchema = {
  category: {
    create: assetCategoryBase,
    update: assetCategoryBase.partial(),
    id: z.object({ id: uuidSchema }),
  },
  asset: {
    create: assetBase,
    update: assetBase.partial(),
    id: z.object({ id: uuidSchema }),
  },
  assignment: {
    create: assignmentBase,
    update: assignmentBase.partial(),
    id: z.object({ id: uuidSchema }),
    return: returnSchema,
  },
};

export const validateAsset = (schema) => {
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
