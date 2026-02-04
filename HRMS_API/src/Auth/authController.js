import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  changeUserPassword,
  createUserAccount,
  findUserByIdentifier,
  getEmployeeContact,
  recordSuccessfulLogin,
} from "./authService.js";
import { sendEmail } from "../../utils/emailService.js";

const signToken = ({ userId, employeeId, role }) => {
  const secret = process.env.JWT_SECRET || "hrms-secret";
  const expiresIn = process.env.JWT_EXPIRES_IN || "1d";
  return jwt.sign({ userId, employeeId, role }, secret, { expiresIn });
};

export const login = async (req, res, next) => {
  const { identifier, password } = req.body;

  try {
    const user = await findUserByIdentifier(identifier);

    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const token = signToken({ userId: user.id, employeeId: user.employee_id, role: user.employee_role });
    await recordSuccessfulLogin(user.id);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          employeeId: user.employee_id,
          username: user.username,
          role: user.employee_role,
          employmentStatus: user.employment_status,
          mustChangePassword: Boolean(user.must_change_password),
          name: [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(" ") || user.username,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createSystemUser = async (req, res, next) => {
  const { employee_id, username, temporary_password, send_email } = req.body;

  try {
    const result = await createUserAccount({
      employeeId: employee_id,
      username,
    });

    const password = temporary_password || result.temporaryPassword;

    if (temporary_password) {
      await changeUserPassword({ userId: result.userId, newPassword: temporary_password, mustChange: true });
    }

    const contact = await getEmployeeContact(employee_id);
    let emailStatus = null;

    if (send_email !== false && contact?.email) {
      const subject = "Your HRMS account credentials";
      const text = `Hello ${contact.name || ""},\n\n` +
        `An HR Manager created an account for you on the HRMS platform.\n\n` +
        `Username: ${username}\n` +
        `Temporary Password: ${password}\n\n` +
        `Please log in and change your password immediately.`;

      try {
        await sendEmail({ to: contact.email, subject, text });
        emailStatus = { delivered: true, to: contact.email };
      } catch (emailError) {
        console.error("Failed to send credential email", emailError);
        emailStatus = { delivered: false, error: "Email delivery failed" };
      }
    }

    res.status(201).json({
      success: true,
      message: "User account created",
      data: {
        userId: result.userId,
        employeeRole: result.employeeRole,
        emailStatus,
        temporaryPassword: emailStatus?.delivered ? undefined : password,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  const { current_password, new_password } = req.body;
  const userId = req.user.id;

  try {
    const userRecord = await findUserByIdentifier(req.user.username);
    if (!userRecord) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const matches = await bcrypt.compare(current_password, userRecord.password_hash);
    if (!matches) {
      return res.status(400).json({ success: false, error: "Current password is incorrect" });
    }

    await changeUserPassword({ userId, newPassword: new_password, mustChange: false });

    res.json({ success: true, message: "Password updated" });
  } catch (error) {
    next(error);
  }
};
