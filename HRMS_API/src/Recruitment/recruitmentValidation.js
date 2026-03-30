import { z } from "zod";

const uuidSchema = z.string().uuid("Invalid UUID format");
const dateSchema = z
  .string()
  .regex(/^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])$/, "Date must be in YYYY-MM-DD format");

const recruitmentStatusEnum = z.enum(["DRAFT", "OPEN", "CLOSED", "CANCELLED"]);
const applicantStatusEnum = z.enum([
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFERED",
  "REJECTED",
  "HIRED",
]);
const interviewStatusEnum = z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "noShow"]);

const recruitmentBase = z.object({
  jobTitle: z.string().min(1, "Job title is required"),
  jobTitleAmharic: z.string().optional().nullable(),
  departmentId: uuidSchema,
  designationId: uuidSchema,
  jobDescription: z.string().optional().nullable(),
  jobDescriptionAmharic: z.string().optional().nullable(),
  requirements: z.string().optional().nullable(),
  requirementsAmharic: z.string().optional().nullable(),
  vacancies: z
    .number({ invalidTypeError: "Vacancies must be a number" })
    .min(1, "Vacancies must be at least 1"),
  experienceRequired: z.string().optional().nullable(),
  salaryRange: z.string().optional().nullable(),
  status: recruitmentStatusEnum.optional(),
  postedDate: dateSchema.optional().nullable(),
  closingDate: dateSchema.optional().nullable(),
  createdBy: uuidSchema,
}).strict();

const applicantBase = z.object({
  recruitmentId: uuidSchema,
  firstName: z.string().min(1, "First name is required"),
  firstNameAmharic: z.string().optional().nullable(),
  lastName: z.string().min(1, "Last name is required"),
  lastNameAmharic: z.string().optional().nullable(),
  email: z.string().email("Invalid email format"),
  phone: z.string().optional().nullable(),
  resumeUrl: z.string().url("Invalid resume URL").optional().nullable(),
  coverLetter: z.string().optional().nullable(),
  coverLetterAmharic: z.string().optional().nullable(),
  currentCompany: z.string().optional().nullable(),
  currentPosition: z.string().optional().nullable(),
  totalExperience: z
    .number({ invalidTypeError: "Experience must be a number" })
    .min(0, "Experience cannot be negative")
    .optional()
    .nullable(),
  currentSalary: z
    .number({ invalidTypeError: "Current salary must be a number" })
    .min(0, "Salary cannot be negative")
    .optional()
    .nullable(),
  expectedSalary: z
    .number({ invalidTypeError: "Expected salary must be a number" })
    .min(0, "Salary cannot be negative")
    .optional()
    .nullable(),
  noticePeriod: z
    .number({ invalidTypeError: "Notice period must be a number" })
    .min(0, "Notice period cannot be negative")
    .optional()
    .nullable(),
  status: applicantStatusEnum.optional(),
}).strict();

const applicantStatusSchema = z.object({ status: applicantStatusEnum }).strict();

const interviewBase = z.object({
  applicantId: uuidSchema,
  interviewDate: dateSchema,
  interviewTime: z
    .string()
    .regex(/^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, "Time must be in HH:MM or HH:MM:SS format"),
  interviewType: z.enum(["PHONE", "VIDEO", "INPERSON"]),
  interviewers: z
    .array(z.object({ name: z.string(), email: z.string().email().optional() }).strict())
    .optional()
    .nullable(),
  location: z.string().optional().nullable(),
  locationAmharic: z.string().optional().nullable(),
  status: interviewStatusEnum.optional(),
  feedback: z.string().optional().nullable(),
  feedbackAmharic: z.string().optional().nullable(),
  rating: z
    .number({ invalidTypeError: "Rating must be a number" })
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5")
    .optional()
    .nullable(),
}).strict();

const interviewFeedbackSchema = z.object({
  status: interviewStatusEnum.optional(),
  feedback: z.string().optional().nullable(),
  feedbackAmharic: z.string().optional().nullable(),
  rating: z
    .number({ invalidTypeError: "Rating must be a number" })
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5")
    .optional()
    .nullable(),
}).strict();

export const recruitmentValidationSchema = {
  recruitment: {
    create: recruitmentBase,
    update: recruitmentBase.partial(),
    id: z.object({ id: uuidSchema }).strict(),
  },
  applicant: {
    create: applicantBase,
    update: applicantBase.partial(),
    id: z.object({ id: uuidSchema }).strict(),
    statusUpdate: applicantStatusSchema,
  },
  interview: {
    create: interviewBase,
    update: interviewBase.partial(),
    id: z.object({ id: uuidSchema }).strict(),
    feedback: interviewFeedbackSchema,
  },
};

export const validateRecruitment = (schema, source = "body") => {
  return (req, res, next) => {
    try {
      schema.parse(req[source]);
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
