import bcrypt from "bcryptjs";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import pool from "../../config/database.js";

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

const generatePassword = () => {
  const raw = crypto.randomBytes(8).toString("base64");
  return raw.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) || "ChangeMe123";
};

export const findUserByIdentifier = async (identifier) => {
  const [rows] = await pool.execute(
    `SELECT 
       BIN_TO_UUID(u.id) AS id,
       BIN_TO_UUID(u.employee_id) AS employee_id,
       u.username,
       u.password_hash,
       u.is_active,
       u.must_change_password,
       u.password_changed_at,
       e.employee_role,
       e.employment_status,
       ep.personal_email,
       ep.first_name,
       ep.middle_name,
       ep.last_name
     FROM users u
     JOIN employee e ON u.employee_id = e.id
     LEFT JOIN employee_personal ep ON e.id = ep.employee_id  
     WHERE u.username = ? OR ep.personal_email = ? OR ep.personal_phone = ?        
     LIMIT 1`,
    [identifier, identifier, identifier]
  );

  return rows.length ? rows[0] : null;
};

export const recordSuccessfulLogin = async (userId) => {
  await pool.execute(
    "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = UUID_TO_BIN(?)",
    [userId]
  );
};

export const changeUserPassword = async ({ userId, newPassword, mustChange = false }) => {
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await pool.execute(
    `UPDATE users
       SET password_hash = ?,
           must_change_password = ?,
           password_changed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
     WHERE id = UUID_TO_BIN(?)`,
    [passwordHash, mustChange ? 1 : 0, userId]
  );
};

export const createUserAccount = async ({ employeeId, username }) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [employeeRows] = await connection.execute(
      `SELECT BIN_TO_UUID(id) AS id, employee_role
         FROM employee
         WHERE id = UUID_TO_BIN(?)
         LIMIT 1`,
      [employeeId]
    );

    if (!employeeRows.length) {
      throw new Error("Employee record not found");
    }

    const [existingUserByEmployee] = await connection.execute(
      "SELECT 1 FROM users WHERE employee_id = UUID_TO_BIN(?) LIMIT 1",
      [employeeId]
    );
    if (existingUserByEmployee.length) {
      throw new Error("User account already exists for this employee");
    }

    const [existingUserByUsername] = await connection.execute(
      "SELECT 1 FROM users WHERE username = ? LIMIT 1",
      [username]
    );
    if (existingUserByUsername.length) {
      throw new Error("Username already in use");
    }

    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const userId = uuidv4();

    await connection.execute(
      `INSERT INTO users (
         id,
         employee_id,
         username,
         password_hash,
         must_change_password,
         is_active
       ) VALUES (
         UUID_TO_BIN(?),
         UUID_TO_BIN(?),
         ?,
         ?,
         TRUE,
         TRUE
       )`,
      [userId, employeeId, username, passwordHash]
    );

    await connection.commit();

    return {
      userId,
      employeeRole: employeeRows[0].employee_role,
      temporaryPassword: password,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const ensureCompany = async (connection, { name, address, phone }) => {
  const [rows] = await connection.execute(
    "SELECT BIN_TO_UUID(id) AS id FROM company WHERE company_name = ? LIMIT 1",
    [name]
  );

  if (rows.length) {
    return rows[0].id;
  }

  const companyId = uuidv4();
  await connection.execute(
    `INSERT INTO company (
       id,
       company_name,
       company_address,
       company_phone
     ) VALUES (
       UUID_TO_BIN(?),
       ?,
       ?,
       ?
     )`,
    [companyId, name, address || null, phone || null]
  );

  return companyId;
};

const ensureSeedEmployee = async (connection, { companyId, firstName, lastName, email }) => {
  const [existing] = await connection.execute(
    `SELECT BIN_TO_UUID(e.id) AS id
       FROM employee e
       JOIN users u ON e.id = u.employee_id
       WHERE e.employee_role = 'HR_MANAGER'
       LIMIT 1`
  );

  if (existing.length) {
    return null;
  }

  const employeeId = uuidv4();
  const employeeCode = `HRM-${Date.now()}`;

  await connection.execute(
    `INSERT INTO employee (
       id,
       employee_code,
       company_id,
       employee_type,
       employee_category,
       employee_role,
       hire_date,
       employment_type,
       employment_status
     ) VALUES (
       UUID_TO_BIN(?),
       ?,
       UUID_TO_BIN(?),
       'hr_officer',
       'hr_officer',
       'HR_MANAGER',
       CURRENT_DATE,
       'full_time',
       'active'
     )`,
    [employeeId, employeeCode, companyId]
  );

  await connection.execute(
    `INSERT INTO employee_personal (
       id,
       employee_id,
       first_name,
       last_name,
       personal_email
     ) VALUES (
       UUID_TO_BIN(?),
       UUID_TO_BIN(?),
       ?,
       ?,
       ?
     )`,
    [uuidv4(), employeeId, firstName, lastName, email]
  );

  await connection.execute(
    `INSERT INTO employee_employment (
       id,
       employee_id,
       official_email
     ) VALUES (
       UUID_TO_BIN(?),
       UUID_TO_BIN(?),
       ?
     )`,
    [uuidv4(), employeeId, email]
  );

  return employeeId;
};

export const seedDefaultHrManager = async () => {
  const username = process.env.SEED_HR_MANAGER_USERNAME || "hr.manager";
  const email = process.env.SEED_HR_MANAGER_EMAIL || "hr.manager@example.com";
  const firstName = process.env.SEED_HR_MANAGER_FIRST_NAME || "Primary";
  const lastName = process.env.SEED_HR_MANAGER_LAST_NAME || "Manager";
  const companyName = process.env.SEED_COMPANY_NAME || "Default HRMS Organization";
  const companyAddress = process.env.SEED_COMPANY_ADDRESS || null;
  const companyPhone = process.env.SEED_COMPANY_PHONE || null;
  const seededPassword = process.env.SEED_HR_MANAGER_PASSWORD || "ChangeMe123!";

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existingManager] = await connection.execute(
      `SELECT 1
         FROM users u
         JOIN employee e ON u.employee_id = e.id
         WHERE e.employee_role = 'HR_MANAGER'
         LIMIT 1`
    );

    if (existingManager.length) {
      await connection.rollback();
      return { created: false };
    }

    const companyId = await ensureCompany(connection, {
      name: companyName,
      address: companyAddress,
      phone: companyPhone,
    });

    const employeeId = await ensureSeedEmployee(connection, {
      companyId,
      firstName,
      lastName,
      email,
    });

    if (!employeeId) {
      await connection.rollback();
      return { created: false };
    }

    const passwordHash = await bcrypt.hash(seededPassword, SALT_ROUNDS);
    const userId = uuidv4();

    await connection.execute(
      `INSERT INTO users (
         id,
         employee_id,
         username,
         password_hash,
         must_change_password,
         is_active
       ) VALUES (
         UUID_TO_BIN(?),
         UUID_TO_BIN(?),
         ?,
         ?,
         TRUE,
         TRUE
       )`,
      [userId, employeeId, username, passwordHash]
    );

    await connection.commit();

    console.info("Seeded default HR manager", {
      username,
      email,
    });

    return {
      created: true,
      credentials: {
        username,
        password: seededPassword,
        email,
      },
    };
  } catch (error) {
    await connection.rollback();
    console.error("Failed to seed HR manager", error);
    return { created: false, error };
  } finally {
    connection.release();
  }
};

export const getEmployeeContact = async (employeeId) => {
  const [rows] = await pool.execute(
    `SELECT 
       ep.personal_email,
       ee.official_email,
       ep.first_name,
       ep.middle_name,
       ep.last_name
     FROM employee e
     LEFT JOIN employee_personal ep ON e.id = ep.employee_id
     LEFT JOIN employee_employment ee ON e.id = ee.employee_id
     WHERE e.id = UUID_TO_BIN(?)
     LIMIT 1`,
    [employeeId]
  );

  if (!rows.length) {
    return null;
  }

  const record = rows[0];
  const email = record.personal_email || record.official_email || null;
  const name = [record.first_name, record.middle_name, record.last_name]
    .filter(Boolean)
    .join(" ");

  return { email, name: name || null };
};
