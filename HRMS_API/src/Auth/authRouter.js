import { Router } from "express";
import { authenticateToken, authorize } from "../../middleware/auth.js";
import { changePassword, createSystemUser, login } from "./authController.js";
import { authValidation, validate } from "./authValidation.js";

const router = Router();

router.post("/login", validate(authValidation.login), login);

router.post(
  "/users",
  authenticateToken,
  authorize("HRMANAGER"),
  validate(authValidation.createUser),
  createSystemUser
);

router.patch(
  "/change-password",
  authenticateToken,
  validate(authValidation.changePassword),
  changePassword
);

export default router;
