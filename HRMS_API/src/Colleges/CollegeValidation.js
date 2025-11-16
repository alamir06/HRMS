import { z } from 'zod';

export const collegeValidationSchema = {
  create: z.object({
    company_id: z.string()
      .uuid('Invalid company ID format')
      .min(1, 'Company ID is required'),
    college_name: z.string()
      .min(1, 'College name is required')
      .max(255, 'College name must be less than 255 characters'),
    college_name_amharic: z.string()
      .max(255, 'Amharic college name must be less than 255 characters')
      .optional()
      .nullable(),
    college_description: z.string()
      .max(1000, 'Description must be less than 1000 characters')
      .optional()
      .nullable(),
    college_description_amharic: z.string()
      .max(1000, 'Amharic description must be less than 1000 characters')
      .optional()
      .nullable()
  }),

  update: z.object({
    company_id: z.string()
      .uuid('Invalid company ID format')
      .optional(),
    college_name: z.string()
      .min(1, 'College name is required')
      .max(255, 'College name must be less than 255 characters')
      .optional(),
    college_name_amharic: z.string()
      .max(255, 'Amharic college name must be less than 255 characters')
      .optional()
      .nullable(),
    college_description: z.string()
      .max(1000, 'Description must be less than 1000 characters')
      .optional()
      .nullable(),
    college_description_amharic: z.string()
      .max(1000, 'Amharic description must be less than 1000 characters')
      .optional()
      .nullable()
  }),

  id: z.object({
    id: z.string().uuid('Invalid college ID format')
  })
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
