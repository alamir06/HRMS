import { z } from 'zod';

export const createCompanySchema = z.object({
  company_name: z.string().min(1, "Company name is required").max(255),
  company_name_amharic: z.string().max(255).optional().nullable(),
  company_address: z.string().min(1, "Company address is required"),
  company_address_amharic: z.string().optional().nullable(),
  company_phone: z.string().min(1, "Company phone is required").max(20),
  company_email: z.string().email("Invalid email format").max(150),
  company_website: z.string().url("Invalid website URL").max(255).optional().nullable(),
  company_logo: z.string().max(255).optional().nullable(),
  company_established_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  company_tin_number: z.string().min(1, "TIN number is required").max(50)
});

export const updateCompanySchema = createCompanySchema.partial();

export const companyIdSchema = z.object({
  id: z.string().uuid("Invalid company ID format")
});

// Validation middleware
export const validateCompany = (schema) => {
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