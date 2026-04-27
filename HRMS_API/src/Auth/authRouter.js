import { Router } from "express";
import { authenticateToken, authorize } from "../../middleware/auth.js";
import { changePassword, createSystemUser, login, logout, forgotPassword, resetPassword } from "./authController.js";
import { authValidation, validate } from "./authValidation.js";

const router = Router();

router.post("/login", validate(authValidation.login), login);
router.post("/logout", authenticateToken, logout);

router.post(
  "/forgot-password",
  validate(authValidation.forgotPassword),
  forgotPassword
);

router.post(
  "/reset-password",
  validate(authValidation.resetPassword),
  resetPassword
);

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
