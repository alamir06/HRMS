// validations/hrRoleValidation.js
import { z } from "zod";

// Permission object schema
const permissionSchema = z
  .object({
    read: z.boolean().optional(),
    write: z.boolean().optional(),
    delete: z.boolean().optional(),
    manage: z.boolean().optional(),
  })
  .optional();

export const hrRoleValidationSchema = {
  create: z.object({
    role_name: z
      .string()
      .min(1, "Role name is required")
      .max(255, "Role name must be less than 255 characters"),
    role_name_amharic: z
      .string()
      .max(255, "Amharic role name must be less than 255 characters")
      .optional()
      .nullable(),
    role_code: z
      .string()
      .min(1, "Role code is required")
      .max(50, "Role code must be less than 50 characters")
      .regex(
        /^[A-Z_]+$/,
        "Role code must contain only uppercase letters and underscores"
      )
      .transform((val) => val.toUpperCase()), // Auto-convert to uppercase
    role_description: z
      .string()
      .max(1000, "Description must be less than 1000 characters")
      .optional()
      .nullable(),
    role_description_amharic: z
      .string()
      .max(1000, "Amharic description must be less than 1000 characters")
      .optional()
      .nullable(),
    role_permissions: z
      .record(z.string(), permissionSchema)
      .or(z.array(z.string()))
      .optional()
      .nullable(),
    status: z.enum(["active", "inactive"]).default("active"),
  }),

  update: z.object({
    role_name: z
      .string()
      .min(1, "Role name is required")
      .max(255, "Role name must be less than 255 characters")
      .optional(),
    role_name_amharic: z
      .string()
      .max(255, "Amharic role name must be less than 255 characters")
      .optional()
      .nullable(),
    role_code: z
      .string()
      .min(1, "Role code is required")
      .max(50, "Role code must be less than 50 characters")
      .regex(
        /^[A-Z_]+$/,
        "Role code must contain only uppercase letters and underscores"
      )
      .transform((val) => val.toUpperCase()) // Auto-convert to uppercase
      .optional(),
    role_description: z
      .string()
      .max(1000, "Description must be less than 1000 characters")
      .optional()
      .nullable(),
    role_description_amharic: z
      .string()
      .max(1000, "Amharic description must be less than 1000 characters")
      .optional()
      .nullable(),
    role_permissions: z
      .record(z.string(), permissionSchema)
      .or(z.array(z.string()))
      .optional()
      .nullable(),
    status: z.enum(["active", "inactive"]).optional(),
  }),

  id: z.object({
    id: z.string().uuid("Invalid HR role ID format"),
  }),
};
