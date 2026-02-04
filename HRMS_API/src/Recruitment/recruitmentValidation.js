import { z } from "zod";

const uuidSchema = z.string().uuid("Invalid UUID format");
const dateSchema = z
  .string()
  .regex(/^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])$/, "Date must be in YYYY-MM-DD format");

const recruitmentStatusEnum = z.enum(["draft", "open", "closed", "cancelled"]);
const applicantStatusEnum = z.enum([
  "applied",
  "screening",
  "interview",
  "offered",
  "rejected",
  "hired",
]);
const interviewStatusEnum = z.enum(["scheduled", "completed", "cancelled", "no_show"]);

const recruitmentBase = z.object({
  job_title: z.string().min(1, "Job title is required"),
  job_title_amharic: z.string().optional().nullable(),
  department_id: uuidSchema,
  designation_id: uuidSchema,
  job_description: z.string().optional().nullable(),
  job_description_amharic: z.string().optional().nullable(),
  requirements: z.string().optional().nullable(),
  requirements_amharic: z.string().optional().nullable(),
  vacancies: z
    .number({ invalid_type_error: "Vacancies must be a number" })
    .min(1, "Vacancies must be at least 1"),
  experience_required: z.string().optional().nullable(),
  salary_range: z.string().optional().nullable(),
  status: recruitmentStatusEnum.optional(),
  posted_date: dateSchema.optional().nullable(),
  closing_date: dateSchema.optional().nullable(),
  created_by: uuidSchema,
});

const applicantBase = z.object({
  recruitment_id: uuidSchema,
  first_name: z.string().min(1, "First name is required"),
  first_name_amharic: z.string().optional().nullable(),
  last_name: z.string().min(1, "Last name is required"),
  last_name_amharic: z.string().optional().nullable(),
  email: z.string().email("Invalid email format"),
  phone: z.string().optional().nullable(),
  resume_url: z.string().url("Invalid resume URL").optional().nullable(),
  cover_letter: z.string().optional().nullable(),
  cover_letter_amharic: z.string().optional().nullable(),
  current_company: z.string().optional().nullable(),
  current_position: z.string().optional().nullable(),
  total_experience: z
    .number({ invalid_type_error: "Experience must be a number" })
    .min(0, "Experience cannot be negative")
    .optional()
    .nullable(),
  current_salary: z
    .number({ invalid_type_error: "Current salary must be a number" })
    .min(0, "Salary cannot be negative")
    .optional()
    .nullable(),
  expected_salary: z
    .number({ invalid_type_error: "Expected salary must be a number" })
    .min(0, "Salary cannot be negative")
    .optional()
    .nullable(),
  notice_period: z
    .number({ invalid_type_error: "Notice period must be a number" })
    .min(0, "Notice period cannot be negative")
    .optional()
    .nullable(),
  status: applicantStatusEnum.optional(),
});

const applicantStatusSchema = z.object({ status: applicantStatusEnum });

const interviewBase = z.object({
  applicant_id: uuidSchema,
  interview_date: dateSchema,
  interview_time: z
    .string()
    .regex(/^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, "Time must be in HH:MM or HH:MM:SS format"),
  interview_type: z.enum(["phone", "video", "in_person"]),
  interviewers: z
    .array(z.object({ name: z.string(), email: z.string().email().optional() }))
    .optional()
    .nullable(),
  location: z.string().optional().nullable(),
  location_amharic: z.string().optional().nullable(),
  status: interviewStatusEnum.optional(),
  feedback: z.string().optional().nullable(),
  feedback_amharic: z.string().optional().nullable(),
  rating: z
    .number({ invalid_type_error: "Rating must be a number" })
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5")
    .optional()
    .nullable(),
});

const interviewFeedbackSchema = z.object({
  status: interviewStatusEnum.optional(),
  feedback: z.string().optional().nullable(),
  feedback_amharic: z.string().optional().nullable(),
  rating: z
    .number({ invalid_type_error: "Rating must be a number" })
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5")
    .optional()
    .nullable(),
});

export const recruitmentValidationSchema = {
  recruitment: {
    create: recruitmentBase,
    update: recruitmentBase.partial(),
    id: z.object({ id: uuidSchema }),
  },
  applicant: {
    create: applicantBase,
    update: applicantBase.partial(),
    id: z.object({ id: uuidSchema }),
    statusUpdate: applicantStatusSchema,
  },
  interview: {
    create: interviewBase,
    update: interviewBase.partial(),
    id: z.object({ id: uuidSchema }),
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
