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
  documentType: z.enum([
    "IDDOCUMENT",
    "EDUCATION",
    "CERTIFICATION",
    "CONTRACT",
    "OTHER",
  ]),
  documentName: z.string().min(1, "Document name is required"),
  documentNameAmharic: z.string().optional().nullable(),
  fileName: z.string().min(1, "File name is required"),
  filePath: z.string().min(1, "File path is required"),
  fileSize: z.number().positive().optional().nullable(),
  mimeType: z.string().optional().nullable(),
  issueDate: dateSchema.optional().nullable(),
  expiryDate: dateSchema.optional().nullable(),
  issuingAuthority: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  descriptionAmharic: z.string().optional().nullable(),
}).strict();

// Education schema
const educationSchema = z.object({
  institutionName: z.string().min(1, "Institution name is required"),
  institutionNameAmharic: z.string().optional().nullable(),
  qualification: z.string().min(1, "Qualification is required"),
  qualificationAmharic: z.string().optional().nullable(),
  fieldOfStudy: z.string().optional().nullable(),
  fieldOfStudyAmharic: z.string().optional().nullable(),
  startDate: dateSchema,
  endDate: dateSchema.optional().nullable(),
  graduationDate: dateSchema.optional().nullable(),
  grade: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  descriptionAmharic: z.string().optional().nullable(),
  documentId: z.string().uuid("Invalid document ID").optional().nullable(),
}).strict();
// Base employee schema
const employeeBaseSchema = z.object({
  companyId: z.string().uuid("Invalid company ID format"),
  employeeType: z.enum(["ACADEMIC", "ADMINISTRATIVE", "OUTSOURCE"]),
  departmentId: z.string().uuid("Invalid department ID format").optional().nullable(),
  managerId: z
    .string()
    .uuid("Invalid manager ID format")
    .nullable()
    .optional(),
  employeeRole: z.enum([
    "HRMANAGER", "DEAN", "HEAD", "HROFFICER", "RECRUITER", "PAYROLLOFFICER", "EMPLOYEE"
  ]).optional(),
  hireDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Hire date must be in YYYY-MM-DD format"),
  employmentType: z.enum(["FULLTIME", "PARTTIME", "CONTRACT", "INTERN"]),
  employmentStatus: z
    .enum(["ACTIVE", "ONLEAVE", "TERMINATED", "RESIGNED"])
    .default("ACTIVE"),
  terminationDate: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "Termination date must be in YYYY-MM-DD format"
    )
    .nullable()
    .optional(),
  personal: z.object({
    firstName: z.string().optional().nullable(),
    firstNameAmharic: z.string().optional().nullable(),
    middleName: z.string().optional().nullable(),
    middleNameAmharic: z.string().optional().nullable(),
    lastName: z.string().optional().nullable(),
    lastNameAmharic: z.string().optional().nullable(),
    gender: z.string().toUpperCase().optional().nullable(),
    dateOfBirth: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "Date of birth must be in YYYY-MM-DD format"
      )
      .optional()
      .nullable(),
    personalEmail: z
      .string()
      .email("Invalid personal email format")
      .optional()
      .nullable(),
    personalPhone: z.string().optional().nullable(),
    emergencyContactName: z.string().optional().nullable(),
    emergencyContactNameAmharic: z.string().optional().nullable(),
    emergencyContactPhone: z.string().optional().nullable(),
    profilePicture: z.string().optional().nullable(),
  }).strict(),
  employment: z
    .object({
      officialEmail: z
        .string()
        .email("Invalid official email format")
        .optional()
        .nullable(),
      officialPhone: z.string().optional().nullable(),
      salary: z
        .number()
        .min(0, "Salary must be a positive number")
        .optional()
        .nullable(),
      qualification: z.string().optional().nullable(),
      qualificationAmharic: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  academic: z
    .object({
      collegeId: z
        .string()
        .uuid("Invalid college ID format")
        .optional()
        .nullable(),
      academicRank: z.string().optional().nullable(),
      academicRankAmharic: z.string().optional().nullable(),
      academicStatus: z.enum(["ACTIVE", "ONLEAVE", "SABBATICAL"]).optional().nullable().default("ACTIVE"),
      fieldOfSpecialization: z.string().optional().nullable(),
      fieldOfSpecializationAmharic: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  hr: z
    .object({
      hrSpecialization: z
        .enum([
          "recruitment",
          "payroll",
          "training",
          "employeeRelations",
          "compliance",
          "generalist",
        ])
        .optional()
        .nullable(),
      hrLevel: z
        .enum(["officer", "supervisor", "manager", "director"])
        .optional()
        .nullable(),
      certifications: z.array(z.string()).optional().nullable(),
    })
    .optional()
    .nullable(),
  outsource: z
    .object({
      outsourcingCompanyId: z
        .string()
        .uuid("Invalid outsourcing company ID format")
        .optional()
        .nullable(),
      contractStartDate: dateSchema.optional().nullable(),
      contractEndDate: dateSchema.optional().nullable(),
      serviceType: z.enum([
        "SECURITY",
        "CLEANING",
        "IT",
        "CATERING",
        "MAINTENANCE",
        "OTHER",
      ]),
    })
    .optional()
    .nullable(),
  surety: z.object({
    name: z.string().min(1, "Surety name is required"),
    phone: z.string().min(1, "Surety phone is required"),
    email: z.string().email("Invalid email format").optional().nullable(),
  }).optional().nullable(),
  documents: z.array(documentSchema).optional().nullable(),
  education: z.array(educationSchema).optional().nullable(),
}).strict();

const employeeCreateSchema = employeeBaseSchema.superRefine((data, ctx) => {
  if (data.personal) {
    if (!data.personal.firstName && !data.personal.firstNameAmharic) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "First name is required",
        path: ["personal", "firstName"],
      });
    }
    if (!data.personal.lastName && !data.personal.lastNameAmharic) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Last name is required",
        path: ["personal", "lastName"],
      });
    }
  }
  if (data.employeeType === "ACADEMIC") {
    const rank = ((data.academic?.academicRank || "") + " " + (data.academic?.academicRankAmharic || "")).toLowerCase();
    const eduCount = data.education?.length || 0;
    
    let requiredEdu = 1;
    
    if (rank.includes("professor") || rank.includes("phd") || rank.includes("doctor") || rank.includes("prof")) {
      requiredEdu = 3;
    } else if (rank.includes("msc") || rank.includes("master") || rank.includes("lecturer")) {
      requiredEdu = 2;
    } else if (rank.includes("bsc") || rank.includes("bachelor") || rank.includes("degree") || rank.includes("ga") || rank.includes("graduate")) {
      requiredEdu = 1;
    }
    
    if (eduCount < requiredEdu) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Academic Rank requires at least ${requiredEdu} educational record(s)`,
        path: ["education"],
      });
    }
  }
});

export const employeeValidationSchema = {
  create: employeeCreateSchema,

  update: employeeBaseSchema.partial(),
  
  id: z.object({
    id: z.string().uuid("Invalid employee ID format"),
  }).strict(),
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
