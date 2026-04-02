import { z } from 'zod';

export const collegeValidationSchema = {
  create: z.object({
    companyId: z.string()
      .uuid('Invalid company ID format')
      .min(1, 'Company ID is required'),
    collegeName: z.string()
      .min(1, 'College name is required')
      .max(255, 'College name must be less than 255 characters'),
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
  }).strict(),

  update: z.object({
    companyId: z.string()
      .uuid('Invalid company ID format')
      .optional(),
    collegeName: z.string()
      .min(1, 'College name is required')
      .max(255, 'College name must be less than 255 characters')
      .optional(),
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
  }).strict(),

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
