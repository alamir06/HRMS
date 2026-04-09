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
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || "1d";
  return jwt.sign({ userId, employeeId, role }, secret, { expiresIn });
};

export const login = async (req, res, next) => {
  let { identifier, password } = req.body;

  // Normalize Ethiopian phone number to start with +2519
  const ethPhoneMatch = identifier.match(/^(?:\+251|0)?(9\d{8})$/);
  if (ethPhoneMatch) {
    identifier = `+251${ethPhoneMatch[1]}`;
  }

  try {
    const user = await findUserByIdentifier(identifier);

    if (!user) {
      return res.status(401).json({ success: false, error: "User not found with the provided identifier" });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, error: "User account is inactive" });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ success: false, error: "Incorrect password" });
    }

    const token = signToken({ userId: user.id, employeeId: user.employeeId, role: user.systemRole || user.employeeRole });
    await recordSuccessfulLogin(user.id);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          employeeId: user.employeeId,
          employeeCode: user.employeeCode,
          username: user.username,
          role: user.systemRole || user.employeeRole,
          employmentStatus: user.employmentStatus,
          mustChangePassword: Boolean(user.mustChangePassword),
          name: [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ") || user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.personalEmail,
          phone: user.personalPhone,
          profilePicture: user.profilePicture,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createSystemUser = async (req, res, next) => {
  const { employeeId, username, temporaryPassword, sendEmail, systemRole } = req.body;

  try {
    const roleToAssign = systemRole || 'EMPLOYEE';

    const result = await createUserAccount({
      employeeId: employeeId,
      username,
      systemRole: roleToAssign,
    });

    const password = temporaryPassword || result.temporaryPassword;

    if (temporaryPassword) {
      await changeUserPassword({ userId: result.userId, newPassword: temporaryPassword, mustChange: true });
    }

    const contact = await getEmployeeContact(employeeId);
    let emailStatus = null;

    if (sendEmail !== false && contact?.email) {
      const subject = "Your HRMS Account Credentials";
      
      // HTML email template with styling
      const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HRMS Account Credentials</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        .email-container {
            background-color: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
            color: white;
        }
        .content {
            padding: 30px;
        }
        .welcome-text {
            color: #2ecc71;
            font-size: 18px;
            margin-bottom: 20px;
            font-weight: 600;
        }
        .credentials-box {
            background-color: #f8f9fa;
            border-left: 4px solid #2ecc71;
            padding: 20px;
            margin: 25px 0;
            border-radius: 0 8px 8px 0;
        }
        .credential-item {
            margin: 15px 0;
            padding: 10px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .credential-item:last-child {
            border-bottom: none;
        }
        .label {
            font-weight: 600;
            color: #2c3e50;
            display: inline-block;
            width: 160px;
        }
        .value {
            color: #34495e;
            font-weight: 500;
        }
        .password-highlight {
            background-color: #e8f5e9;
            padding: 8px 12px;
            border-radius: 5px;
            font-weight: bold;
            color: #27ae60;
            font-family: monospace;
            font-size: 16px;
            letter-spacing: 1px;
        }
        .role-badge {
            display: inline-block;
            background-color: #3498db;
            color: white;
            padding: 6px 15px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            margin-left: 10px;
        }
        .important-note {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 15px;
            margin: 25px 0;
        }
        .important-note h3 {
            color: #e67e22;
            margin-top: 0;
        }
        .button-container {
            text-align: center;
            margin: 30px 0;
        }
        .login-button {
            display: inline-block;
            background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
            color: white;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.3s ease;
        }
        .login-button:hover {
            background: linear-gradient(135deg, #27ae60 0%, #219653 100%);
            transform: translateY(-2px);
            box-shadow: 0 6px 15px rgba(39, 174, 96, 0.3);
        }
        .footer {
            text-align: center;
            padding: 20px;
            color: #7f8c8d;
            font-size: 14px;
            border-top: 1px solid #ecf0f1;
            background-color: #f8f9fa;
        }
        .contact-info {
            margin-top: 10px;
            font-size: 13px;
        }
        .security-note {
            color: #e74c3c;
            font-weight: 600;
            margin-top: 20px;
            padding: 12px;
            background-color: #fff5f5;
            border-radius: 5px;
            text-align: center;
            border: 1px solid #ffdddd;
        }
        .greeting {
            font-size: 16px;
            color: #555;
            margin-bottom: 20px;
        }
        @media (max-width: 600px) {
            .content {
                padding: 20px;
            }
            .credential-item {
                display: block;
            }
            .label {
                width: 100%;
                margin-bottom: 5px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">HRMS</div>
            <h1>Your Account Has Been Created</h1>
        </div>
        
        <div class="content">
            <div class="greeting">
                Hello ${contact.name || "Valued Employee"},
            </div>
            
            <div class="welcome-text">
                Welcome to the HRMS Platform! Your account has been successfully created.
            </div>
            
            <div class="credentials-box">
                <div class="credential-item">
                    <span class="label">Username:</span>
                    <span class="value">${username}</span>
                </div>
                
                <div class="credential-item">
                    <span class="label">Temporary Password:</span>
                    <div class="password-highlight">${password}</div>
                </div>
                
                <div class="credential-item">
                    <span class="label">Account Role:</span>
                    <span class="value">${result.systemRole || 'EMPLOYEE'}</span>
                    <span class="role-badge">${(result.systemRole || 'EMPLOYEE').toUpperCase()}</span>
                </div>
            </div>
            
            <div class="important-note">
                <h3>🔐 Important Security Notice</h3>
                <p>For your security, please change your temporary password immediately after your first login. This helps protect your account and sensitive information.</p>
            </div>
            
            <div class="security-note">
                ⚠️ Do not share your credentials with anyone. HRMS staff will never ask for your password.
            </div>
            
            <div class="button-container">
                <a href="#" class="login-button">Access HRMS Portal</a>
            </div>
            
            <p style="text-align: center; color: #666; font-size: 14px;">
                Use the button above or visit the HRMS portal to log in with your credentials.
            </p>
        </div>
        
        <div class="footer">
            <p>This is an automated message from the HR Management System.</p>
            <div class="contact-info">
                Need help? Contact your HR department or system administrator.
            </div>
            <p style="margin-top: 15px; font-size: 12px; color: #95a5a6;">
                © ${new Date().getFullYear()} HRMS Platform. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
      `;

      // Plain text version as fallback
      const text = `Hello ${contact.name || ""},\n\n` +
        `An account was created for you on the HRMS platform.\n\n` +
        `Username: ${username}\n` +
        `Temporary Password: ${password}\n` +
        `Role: ${result.systemRole || 'EMPLOYEE'}\n\n` +
        `Please log in and change your password immediately.\n\n` +
        `This is an automated message from the HR Management System.`;

      try {
        await sendEmail({ 
          to: contact.email, 
          subject, 
          text, 
          html // Added HTML version
        });
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
        employeeRole: result.employeeRole || 'EMPLOYEE',
        systemRole: result.systemRole,
        emailStatus,
        temporaryPassword: emailStatus?.delivered ? undefined : password,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    const userRecord = await findUserByIdentifier(req.user.username);
    if (!userRecord) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const matches = await bcrypt.compare(currentPassword, userRecord.passwordHash);
    if (!matches) {
      return res.status(400).json({ success: false, error: "Current password is incorrect" });
    }

    await changeUserPassword({ userId, newPassword: newPassword, mustChange: false });

    res.json({ success: true, message: "Password updated" });
  } catch (error) {
    next(error);
  }
};
