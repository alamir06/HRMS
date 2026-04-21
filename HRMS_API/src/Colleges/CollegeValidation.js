import { z } from 'zod';

export const collegeValidationSchema = {
  create: z.object({
    companyId: z.string()
      .uuid('Invalid Company ID format')
      .min(1, 'Company ID is required'),
    collegeName: z.string()
      .max(255, 'College name must be less than 255 characters')
      .optional()
      .nullable(),
    collegeNameAmharic: z.string()
      .max(255, 'Amharic college name must be less than 255 characters')
      .optional()
      .nullable(),
    collegeDescription: z.string()
      .max(1000, 'Description must be less than 1000 characters')
      .optional()
      .nullable(),
    collegeDescriptionAmharic: z.string()
      .max(1000, 'Amharic description must be less than 1000 characters')
      .optional()
      .nullable()
  }).refine(data => data.collegeName || data.collegeNameAmharic, {
    message: "At least one college name (English or Amharic) must be provided",
    path: ["collegeName"],
  }),

  update: z.object({
    companyId: z.string()
      .uuid('Invalid company ID format')
      .optional(),
    collegeName: z.string()
      .max(255, 'College name must be less than 255 characters')
      .optional()
      .nullable(),
    collegeNameAmharic: z.string()
      .max(255, 'Amharic college name must be less than 255 characters')
      .optional()
      .nullable(),
    collegeDescription: z.string()
      .max(1000, 'Description must be less than 1000 characters')
      .optional()
      .nullable(),
    collegeDescriptionAmharic: z.string()
      .max(1000, 'Amharic description must be less than 1000 characters')
      .optional()
      .nullable()
  }),

  id: z.object({
    id: z.string().uuid('Invalid college ID format')
  }).strict()
};

// For backward compatibility
export const createCollegeSchema = collegeValidationSchema.create;
export const updateCollegeSchema = collegeValidationSchema.update;
export const collegeIdSchema = collegeValidationSchema.id;

export const validateCollege = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
  };
};
