import { z } from "zod";

const uuidSchema = z.string().uuid("Invalid UUID format");
const dateSchema = z
  .string()
  .regex(/^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])$/, "Date must be in YYYY-MM-DD format");

const assetCategoryBase = z.object({
  categoryName: z.string().min(1, "Category name is required"),
  categoryNameAmharic: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  descriptionAmharic: z.string().optional().nullable(),
}).strict();

const moneySchema = z
  .number({ invalidTypeError: "Value must be a number" })
  .nonnegative("Value cannot be negative")
  .optional()
  .nullable();

const assetBase = z.object({
  assetName: z.string().min(1, "Asset name is required"),
  assetNameAmharic: z.string().optional().nullable(),
  assetCategoryId: uuidSchema,
  serialNumber: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  purchaseDate: dateSchema.optional().nullable(),
  purchaseCost: moneySchema,
  currentValue: moneySchema,
  status: z.enum(["AVAILABLE", "ASSIGNED", "MAINTENANCE", "DISPOSED"]).optional(),
  location: z.string().optional().nullable(),
  locationAmharic: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  notesAmharic: z.string().optional().nullable(),
}).strict();

const assignmentBase = z.object({
  assetId: uuidSchema,
  employeeId: uuidSchema,
  assignedDate: dateSchema,
  expectedReturnDate: dateSchema.optional().nullable(),
  assignmentReason: z.string().optional().nullable(),
  assignmentReasonAmharic: z.string().optional().nullable(),
  conditionAssigned: z.string().optional().nullable(),
  conditionAssignedAmharic: z.string().optional().nullable(),
  assignedBy: uuidSchema,
}).strict();

const returnSchema = z.object({
  actualReturnDate: dateSchema.optional().nullable(),
  conditionReturned: z.string().optional().nullable(),
  conditionReturnedAmharic: z.string().optional().nullable(),
  status: z.enum(["RETURNED", "OVERDUE"]).optional(),
}).strict();

export const assetValidationSchema = {
  category: {
    create: assetCategoryBase,
    update: assetCategoryBase.partial(),
    id: z.object({ id: uuidSchema }).strict(),
  },
  asset: {
    create: assetBase,
    update: assetBase.partial(),
    id: z.object({ id: uuidSchema }).strict(),
  },
  assignment: {
    create: assignmentBase,
    update: assignmentBase.partial(),
    id: z.object({ id: uuidSchema }).strict(),
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
