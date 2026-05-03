import { z } from "zod";

export const recommendationValidationSchema = {
  create: z.object({
    recommendationType: z.enum(['EDUCATION', 'PROFESSIONAL_LICENSE', 'MAYOR_OFFICE', 'MINISTRY_OF_EDUCATION', 'WORK_EXPERIENCE', 'GUARANTEE_LETTER', 'HOUSING_COOPERATIVE'], {
      required_error: "Recommendation type is required",
    }),
    reason: z.string().optional(),
    degreeProgram: z.string().optional(),
    institutionName: z.string().optional(),
  }),
  
  query: z.object({
    status: z.preprocess(val => val === '' ? undefined : val, z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional()),
    type: z.preprocess(val => val === '' ? undefined : val, z.enum(['EDUCATION', 'PROFESSIONAL_LICENSE', 'MAYOR_OFFICE', 'MINISTRY_OF_EDUCATION', 'WORK_EXPERIENCE', 'GUARANTEE_LETTER', 'HOUSING_COOPERATIVE']).optional()),
    employeeId: z.string().uuid("Invalid employee ID").optional(),
  }),
  
  id: z.object({
    id: z.string().uuid("Invalid recommendation ID"),
  }),
  
  statusUpdate: z.object({
    status: z.enum(['APPROVED', 'REJECTED'], {
      required_error: "Status is required",
    }),
    rejectionReason: z.string().optional(),
  }),
};

export const validateRecommendation = (schema, source = "body") => {
  return (req, res, next) => {
    try {
      const dataToValidate = req[source];
      const validatedData = schema.parse(dataToValidate);
      Object.assign(req[source], validatedData);
      next();
    } catch (error) {
      if (error && error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
};
