import { Router } from "express";
import { authenticateToken } from "../../middleware/auth.js";
import {
  createRecommendation,
  listRecommendations,
  getRecommendationById,
  updateRecommendationStatus,
} from "./RecommendationController.js";
import { recommendationValidationSchema, validateRecommendation } from "./recommendationValidation.js";

const router = Router();

// Require authentication for all routes
router.use(authenticateToken);

router.post(
  "/",
  validateRecommendation(recommendationValidationSchema.create),
  createRecommendation
);

router.get(
  "/",
  validateRecommendation(recommendationValidationSchema.query, "query"),
  listRecommendations
);

router.get(
  "/:id",
  validateRecommendation(recommendationValidationSchema.id, "params"),
  getRecommendationById
);

router.patch(
  "/:id/status",
  validateRecommendation(recommendationValidationSchema.id, "params"),
  validateRecommendation(recommendationValidationSchema.statusUpdate),
  updateRecommendationStatus
);

export default router;
