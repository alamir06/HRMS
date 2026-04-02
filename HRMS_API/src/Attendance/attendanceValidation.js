import { z } from "zod";

const uuidSchema = z.string().uuid("Invalid UUID format");
const dateSchema = z
  .string()
  .regex(/^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])$/, "Date must be in YYYY-MM-DD format");
const timeSchema = z
  .string()
  .regex(/^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, "Time must be in HH:MM or HH:MM:SS format");

const baseSchema = z.object({
  employeeId: uuidSchema,
  date: dateSchema,
  checkIn: timeSchema.optional().nullable(),
  checkOut: timeSchema.optional().nullable(),
  status: z
    .enum(["Present", "Late", "Absent", "HALFDAY", "HOLIDAY", "WEEKEND"])
    .optional(),
  lateMinutes: z
    .number({ invalidTypeError: "Late minutes must be a number" })
    .min(0, "Late minutes cannot be negative")
    .optional()
    .nullable(),
  overtimeMinutes: z
    .number({ invalidTypeError: "Overtime minutes must be a number" })
    .min(0, "Overtime minutes cannot be negative")
    .optional()
    .nullable(),
  notes: z.string().optional().nullable(),
  notesAmharic: z.string().optional().nullable(),
}).strict();

export const attendanceValidationSchema = {
  create: baseSchema,
  update: baseSchema.partial(),
  id: z.object({
    id: uuidSchema,
  }).strict(),
};

export const validateAttendance = (schema) => {
  return (req, res, next) => {
    try {
      if (schema === attendanceValidationSchema.id) {
        schema.parse({ id: req.params.id });
      } else {
        schema.parse(req.body);
      }
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
