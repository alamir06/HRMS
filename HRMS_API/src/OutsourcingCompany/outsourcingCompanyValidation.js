import { z } from "zod";

const uuidSchema = z.string().uuid("Invalid UUID format");
const dateSchema = z
  .string()
  .regex(/^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])$/, "Date must be in YYYY-MM-DD format");

const outsourcingCompanyBase = z.object({
  company_id: uuidSchema.optional(),
  company_name: z.string().min(1, "Company name is required"),
  company_name_amharic: z.string().optional().nullable(),
  company_address: z.string().optional().nullable(),
  company_address_amharic: z.string().optional().nullable(),
  company_phone: z.string().optional().nullable(),
  company_email: z.string().email("Invalid email format").optional().nullable(),
  company_service_type: z.enum([
    "security",
    "cleaning",
    "it",
    "catering",
    "maintenance",
    "other",
  ]),
  company_contract_start_date: dateSchema.optional().nullable(),
  company_contract_end_date: dateSchema.optional().nullable(),
  company_status: z.enum(["active", "inactive", "suspended"]).optional(),
});

export const outsourcingCompanyValidationSchema = {
  create: outsourcingCompanyBase,
  update: outsourcingCompanyBase.partial(),
  id: z.object({ id: uuidSchema }),
};
