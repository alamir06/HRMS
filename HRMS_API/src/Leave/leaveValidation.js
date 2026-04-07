import Joi from "joi";

export const leaveValidation = {
  createLeave: Joi.object({
    employeeId: Joi.string().required(),
    leaveType: Joi.string()
      .valid(
        "ANNUAL",
        "SICK",
        "MEDICAL",
        "PERSONAL",
        "MATERNITY",
        "PATERNITY",
        "ORGANIZATION_LEAVE"
      )
      .required(),
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
    reason: Joi.string().allow("", null),
    reasonAmharic: Joi.string().allow("", null),
  }),

  approveLeave: Joi.object({
    comments: Joi.string().allow("", null),
    commentsAmharic: Joi.string().allow("", null),
  }),

  rejectLeave: Joi.object({
    comments: Joi.string().required(),
    commentsAmharic: Joi.string().allow("", null),
  }),
};
