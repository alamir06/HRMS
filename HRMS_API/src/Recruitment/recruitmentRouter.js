import { Router } from "express";
import {
  createRecruitment,
  listRecruitment,
  getRecruitmentById,
  updateRecruitment,
  deleteRecruitment,
  createApplicant,
  listApplicants,
  updateApplicantStatus,
  createInterview,
  listInterviews,
  updateInterview,
} from "./recruitmentController.js";
import {
  recruitmentValidationSchema,
  validateRecruitment,
} from "./recruitmentValidation.js";

const router = Router();

// Recruitment routes
router.post(
  "/",
  validateRecruitment(recruitmentValidationSchema.recruitment.create),
  createRecruitment
);
router.get("/", listRecruitment);
router.get(
  "/:id",
  validateRecruitment(recruitmentValidationSchema.recruitment.id, "params"),
  getRecruitmentById
);
router.patch(
  "/:id",
  validateRecruitment(recruitmentValidationSchema.recruitment.id, "params"),
  validateRecruitment(recruitmentValidationSchema.recruitment.update),
  updateRecruitment
);
router.delete(
  "/:id",
  validateRecruitment(recruitmentValidationSchema.recruitment.id, "params"),
  deleteRecruitment
);

// Applicant routes
router.post(
  "/applicants",
  validateRecruitment(recruitmentValidationSchema.applicant.create),
  createApplicant
);
router.get("/applicants", listApplicants);
router.patch(
  "/applicants/:id/status",
  validateRecruitment(recruitmentValidationSchema.applicant.id, "params"),
  validateRecruitment(recruitmentValidationSchema.applicant.statusUpdate),
  updateApplicantStatus
);

// Interview routes
router.post(
  "/interviews",
  validateRecruitment(recruitmentValidationSchema.interview.create),
  createInterview
);
router.get("/interviews", listInterviews);
router.patch(
  "/interviews/:id",
  validateRecruitment(recruitmentValidationSchema.interview.id, "params"),
  validateRecruitment(recruitmentValidationSchema.interview.update),
  updateInterview
);
router.patch(
  "/interviews/:id/feedback",
  validateRecruitment(recruitmentValidationSchema.interview.id, "params"),
  validateRecruitment(recruitmentValidationSchema.interview.feedback),
  updateInterview
);

export default router;
