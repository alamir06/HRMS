import { z } from "zod";

const uuidSchema = z.string().uuid("Invalid UUID format");
const emailSchema = z.string().email("Invalid email format");
const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s-()]+$/, "Invalid phone number format");
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");
const documentSchema = z.object({
  document_type: z.enum([
    "id_document",
    "education",
    "certification",
    "contract",
    "other",
  ]),
  document_name: z.string().min(1, "Document name is required"),
  document_name_amharic: z.string().optional().nullable(),
  file_name: z.string().min(1, "File name is required"),
  file_path: z.string().min(1, "File path is required"),
  file_size: z.number().positive().optional().nullable(),
  mime_type: z.string().optional().nullable(),
  issue_date: dateSchema.optional().nullable(),
  expiry_date: dateSchema.optional().nullable(),
  issuing_authority: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  description_amharic: z.string().optional().nullable(),
});

// Education schema
const educationSchema = z.object({
  institution_name: z.string().min(1, "Institution name is required"),
  institution_name_amharic: z.string().optional().nullable(),
  qualification: z.string().min(1, "Qualification is required"),
  qualification_amharic: z.string().optional().nullable(),
  field_of_study: z.string().optional().nullable(),
  field_of_study_amharic: z.string().optional().nullable(),
  start_date: dateSchema,
  end_date: dateSchema.optional().nullable(),
  graduation_date: dateSchema.optional().nullable(),
  grade: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  description_amharic: z.string().optional().nullable(),
  document_id: z.string().uuid("Invalid document ID").optional().nullable(),
});
// Base employee schema
const employeeBaseSchema = z.object({
  employee_code: z.string().min(1, "Employee code is required"),
  company_id: z.string().uuid("Invalid company ID format"),
  employee_category: z.enum(["hr_officer", "academic", "outsource"], {
    errorMap: () => ({
      message:
        "Employee category must be 'hr_officer', 'academic', or 'outsource'",
    }),
  }),
  employee_type: z.string().optional(),
  department_id: z.string().uuid("Invalid department ID format").optional().nullable(),
  manager_id: z
    .string()
    .uuid("Invalid manager ID format")
    .nullable()
    .optional(),
  hire_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Hire date must be in YYYY-MM-DD format"),
  employment_type: z.string().min(1, "Employment type is required"),
  employment_status: z
    .string()
    .min(1, "Employment status is required")
    .default("active"),
  termination_date: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "Termination date must be in YYYY-MM-DD format"
    )
    .nullable()
    .optional(),
  personal: z.object({
    first_name: z.string().min(1, "First name is required"),
    first_name_amharic: z.string().optional().nullable(),
    middle_name: z.string().optional().nullable(),
    middle_name_amharic: z.string().optional().nullable(),
    last_name: z.string().min(1, "Last name is required"),
    last_name_amharic: z.string().optional().nullable(),
    gender: z.string().optional().nullable(),
    date_of_birth: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "Date of birth must be in YYYY-MM-DD format"
      )
      .optional()
      .nullable(),
    personal_email: z
      .string()
      .email("Invalid personal email format")
      .optional()
      .nullable(),
    personal_phone: z.string().optional().nullable(),
    emergency_contact_name: z.string().optional().nullable(),
    emergency_contact_name_amharic: z.string().optional().nullable(),
    emergency_contact_phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    address_amharic: z.string().optional().nullable(),
    profile_picture: z.string().optional().nullable(),
  }),
  employment: z
    .object({
      official_email: z
        .string()
        .email("Invalid official email format")
        .optional()
        .nullable(),
      official_phone: z.string().optional().nullable(),
      salary: z
        .number()
        .min(0, "Salary must be a positive number")
        .optional()
        .nullable(),
      qualification: z.string().optional().nullable(),
      qualification_amharic: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  academic: z
    .object({
      college_id: z
        .string()
        .uuid("Invalid college ID format")
        .optional()
        .nullable(),
      academic_rank: z.string().optional().nullable(),
      academic_rank_amharic: z.string().optional().nullable(),
      academic_status: z.string().optional().nullable().default("active"),
      field_of_specialization: z.string().optional().nullable(),
      field_of_specialization_amharic: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  hr: z
    .object({
      hr_specialization: z
        .enum([
          "recruitment",
          "payroll",
          "training",
          "employee_relations",
          "compliance",
          "generalist",
        ])
        .optional()
        .nullable(),
      hr_level: z
        .enum(["officer", "supervisor", "manager", "director"])
        .optional()
        .nullable(),
      certifications: z.array(z.string()).optional().nullable(),
    })
    .optional()
    .nullable(),
  outsource: z
    .object({
      outsourcing_company_id: z
        .string()
        .uuid("Invalid outsourcing company ID format")
        .optional()
        .nullable(),
      contract_start_date: dateSchema.optional().nullable(),
      contract_end_date: dateSchema.optional().nullable(),
      service_type: z.enum([
        "security",
        "cleaning",
        "it",
        "catering",
        "maintenance",
        "other",
      ]),
    })
    .optional()
    .nullable(),
  documents: z.array(documentSchema).optional().nullable(),
  education: z.array(educationSchema).optional().nullable(),
});

export const employeeValidationSchema = {
  create: employeeBaseSchema,

  update: employeeBaseSchema.partial(),
  
  id: z.object({
    id: z.string().uuid("Invalid employee ID format"),
  }),
};


// For backward compatibility
export const createEmployeeSchema = employeeValidationSchema.create;
export const updateEmployeeSchema = employeeValidationSchema.update;
export const employeeIdSchema = employeeValidationSchema.id;

export const validateEmployee = (schema) => {
  return (req, res, next) => {
    try {
      // For ID validation, check params instead of body
      if (schema === employeeValidationSchema.id) {
        schema.parse({ id: req.params.id });
      } else {
        schema.parse(req.body);
      }
      next();
    } catch (error) {
      console.error("Validation error:", error);
      // Handle Zod validation errors properly
      if (error.name === "ZodError") {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: error.issues
            ? error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
                code: issue.code,
              }))
            : [
                {
                  field: "unknown",
                  message: "Validation error occurred",
                },
              ],
        });
      }
      // Handle other errors
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        message: error.message,
      });
    }
  };
};
