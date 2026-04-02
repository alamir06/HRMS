import { z } from "zod";

const uuidSchema = z.string().uuid("Invalid UUID format");
const dateSchema = z
  .string()
  .regex(/^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])$/, "Date must be in YYYY-MM-DD format");

const outsourcingCompanyBase = z.object({
  companyId: uuidSchema.optional(),
  companyName: z.string().min(1, "Company name is required"),
  companyNameAmharic: z.string().optional().nullable(),
  companyAddress: z.string().optional().nullable(),
  companyAddressAmharic: z.string().optional().nullable(),
  companyPhone: z.string().optional().nullable(),
  companyEmail: z.string().email("Invalid email format").optional().nullable(),
  companyServiceType: z.enum([
    "SECURITY",
    "CLEANING",
    "IT",
    "CATERING",
    "MAINTENANCE",
    "OTHER",
  ]),
  companyContractStartDate: dateSchema.optional().nullable(),
  companyContractEndDate: dateSchema.optional().nullable(),
  companyStatus: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
}).strict();

export const outsourcingCompanyValidationSchema = {
  create: outsourcingCompanyBase,
  update: outsourcingCompanyBase.partial(),
  id: z.object({ id: uuidSchema }).strict(),
};
