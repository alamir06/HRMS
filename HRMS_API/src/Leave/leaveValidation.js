import { z } from "zod";

export const leaveValidation = {
  createLeave: z.object({
    employeeId: z.string().min(1, "employeeId is required"),
    leaveType: z.enum([
      "ANNUAL",
      "SICK",
      "MEDICAL",
      "PERSONAL",
      "MATERNITY",
      "PATERNITY",
      "ORGANIZATION_LEAVE"
    ]),
    startDate: z.string(),
    endDate: z.string(),
    reason: z.string().nullable().optional(),
    reasonAmharic: z.string().nullable().optional(),
    supportDocument: z.string().nullable().optional(),
  }),

  approveLeave: z.object({
    comments: z.string().nullable().optional(),
    commentsAmharic: z.string().nullable().optional(),
  }),

  rejectLeave: z.object({
    comments: z.string().min(1, "Comments are required for rejection"),
    commentsAmharic: z.string().nullable().optional(),
  }),
};
