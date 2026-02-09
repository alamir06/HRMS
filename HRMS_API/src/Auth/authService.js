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
       u.system_role AS system_role,
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

export const createUserAccount = async ({ employeeId, username, systemRole = 'employee' }) => {
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
         system_role,
         password_hash,
         must_change_password,
         is_active
       ) VALUES (
         UUID_TO_BIN(?),
         UUID_TO_BIN(?),
         ?,
         ?,
         ?,
         TRUE,
         TRUE
       )`,
      [userId, employeeId, username, systemRole, passwordHash]
    );

    await connection.commit();

    return {
      userId,
      employeeRole: employeeRows[0].employee_role,
      temporaryPassword: password,
      systemRole,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const ensureCompany = async (
  connection,
  {
    id,
    name,
    nameAmharic,
    address,
    addressAmharic,
    phone,
    email,
    website,
    logo,
    establishedDate,
    tinNumber,
    status,
  }
) => {
  if (!name) {
    throw new Error("Company name is required to seed default company");
  }

  const [[countRow]] = await connection.execute(
    "SELECT COUNT(*) AS companyCount FROM company"
  );
  const companyCount = Number(countRow?.companyCount || 0);

  if (companyCount > 1) {
    throw new Error(
      "Multiple companies found in database. This deployment is configured for single-company mode; delete extra rows from `company` table and restart."
    );
  }

  if (id) {
    const [rows] = await connection.execute(
      "SELECT 1 FROM company WHERE id = UUID_TO_BIN(?) LIMIT 1",
      [id]
    );

    if (!rows.length) {
      if (companyCount === 1) {
        throw new Error(
          "SEED_COMPANY_ID does not match the existing company row. Update SEED_COMPANY_ID to the existing company id (or clear the company table) and restart."
        );
      }

      await connection.execute(
        `INSERT INTO company (
           id,
           company_name,
           company_name_amharic,
           company_address,
           company_address_amharic,
           company_phone,
           company_email,
           company_website,
           company_logo,
           company_established_date,
           company_tin_number,
           status
         ) VALUES (
           UUID_TO_BIN(?),
           ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
         )`,
        [
          id,
          name,
          nameAmharic || null,
          address || null,
          addressAmharic || null,
          phone || null,
          email || null,
          website || null,
          logo || null,
          establishedDate || null,
          tinNumber || null,
          status || "active",
        ]
      );

      return id;
    }

    // Update the targeted row with any provided values.
    await connection.execute(
      `UPDATE company
          SET company_name = ?,
              company_name_amharic = COALESCE(?, company_name_amharic),
              company_address = COALESCE(?, company_address),
              company_address_amharic = COALESCE(?, company_address_amharic),
              company_phone = COALESCE(?, company_phone),
              company_email = COALESCE(?, company_email),
              company_website = COALESCE(?, company_website),
              company_logo = COALESCE(?, company_logo),
              company_established_date = COALESCE(?, company_established_date),
              company_tin_number = COALESCE(?, company_tin_number),
              status = COALESCE(?, status),
              updated_at = CURRENT_TIMESTAMP
        WHERE id = UUID_TO_BIN(?)`,
      [
        name,
        nameAmharic || null,
        address || null,
        addressAmharic || null,
        phone || null,
        email || null,
        website || null,
        logo || null,
        establishedDate || null,
        tinNumber || null,
        status || null,
        id,
      ]
    );

    return id;
  }

  // Single-company mode without explicit ID:
  // - If one company already exists, update it (even if the name changes)
  // - If none exists, insert the new company
  if (companyCount === 1) {
    const [rows] = await connection.execute(
      "SELECT BIN_TO_UUID(id) AS id FROM company LIMIT 1"
    );
    const existingId = rows?.[0]?.id;
    if (!existingId) {
      throw new Error("Expected a single company row but none was found");
    }

    await connection.execute(
      `UPDATE company
          SET company_name = ?,
              company_name_amharic = COALESCE(?, company_name_amharic),
              company_address = COALESCE(?, company_address),
              company_address_amharic = COALESCE(?, company_address_amharic),
              company_phone = COALESCE(?, company_phone),
              company_email = COALESCE(?, company_email),
              company_website = COALESCE(?, company_website),
              company_logo = COALESCE(?, company_logo),
              company_established_date = COALESCE(?, company_established_date),
              company_tin_number = COALESCE(?, company_tin_number),
              status = COALESCE(?, status),
              updated_at = CURRENT_TIMESTAMP
        WHERE id = UUID_TO_BIN(?)`,
      [
        name,
        nameAmharic || null,
        address || null,
        addressAmharic || null,
        phone || null,
        email || null,
        website || null,
        logo || null,
        establishedDate || null,
        tinNumber || null,
        status || null,
        existingId,
      ]
    );

    return existingId;
  }

  const companyId = uuidv4();
  await connection.execute(
    `INSERT INTO company (
       id,
       company_name,
       company_name_amharic,
       company_address,
       company_address_amharic,
       company_phone,
       company_email,
       company_website,
       company_logo,
       company_established_date,
       company_tin_number,
       status
     ) VALUES (
       UUID_TO_BIN(?),
       ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
     )`,
    [
      companyId,
      name,
      nameAmharic || null,
      address || null,
      addressAmharic || null,
      phone || null,
      email || null,
      website || null,
      logo || null,
      establishedDate || null,
      tinNumber || null,
      status || "active",
    ]
  );

  return companyId;
};

export const seedDefaultCompany = async () => {
  const rawCompanyId = process.env.SEED_COMPANY_ID || "";
  const companyId = rawCompanyId && rawCompanyId.trim() ? rawCompanyId.trim() : null;
  const companyName = process.env.SEED_COMPANY_NAME;

  if (!companyName) {
    console.error(
      "SEED_COMPANY_NAME is required in single-company deployments. Provide all company attributes via .env and restart."
    );
    return {
      createdOrUpdated: false,
      error: new Error("Missing SEED_COMPANY_NAME"),
    };
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const id = await ensureCompany(connection, {
      id: companyId,
      name: companyName,
      nameAmharic: process.env.SEED_COMPANY_NAME_AMHARIC,
      address: process.env.SEED_COMPANY_ADDRESS,
      addressAmharic: process.env.SEED_COMPANY_ADDRESS_AMHARIC,
      phone: process.env.SEED_COMPANY_PHONE,
      email: process.env.SEED_COMPANY_EMAIL,
      website: process.env.SEED_COMPANY_WEBSITE,
      logo: process.env.SEED_COMPANY_LOGO,
      establishedDate: process.env.SEED_COMPANY_ESTABLISHED_DATE,
      tinNumber: process.env.SEED_COMPANY_TIN_NUMBER,
      status: process.env.SEED_COMPANY_STATUS,
    });

    await connection.commit();
    return { createdOrUpdated: true, companyId: id };
  } catch (error) {
    await connection.rollback();
    console.error("Failed to seed default company", error);
    return { createdOrUpdated: false, error };
  } finally {
    connection.release();
  }
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
  const username = process.env.SEED_HR_MANAGER_USERNAME;
  const email = process.env.SEED_HR_MANAGER_EMAIL;
  const firstName = process.env.SEED_HR_MANAGER_FIRST_NAME;
  const lastName = process.env.SEED_HR_MANAGER_LAST_NAME;
  const companyName = process.env.SEED_COMPANY_NAME || "Default Organization";
  const companyAddress = process.env.SEED_COMPANY_ADDRESS;
  const companyPhone = process.env.SEED_COMPANY_PHONE;
  const rawExplicitCompanyId = process.env.SEED_COMPANY_ID || "";
  const explicitCompanyId = rawExplicitCompanyId && rawExplicitCompanyId.trim() ? rawExplicitCompanyId.trim() : null;
  const seededPassword = process.env.SEED_HR_MANAGER_PASSWORD || "ChangeMe123!";

  if (!username || !email || !firstName || !lastName) {
    console.warn(
      "HR manager seeding skipped. Missing required data.",
      {
        SEED_HR_MANAGER_USERNAME: Boolean(username),
        SEED_HR_MANAGER_EMAIL: Boolean(email),
        SEED_HR_MANAGER_FIRST_NAME: Boolean(firstName),
        SEED_HR_MANAGER_LAST_NAME: Boolean(lastName),
      }
    );
    return { created: false, skipped: true };
  }

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
      id: explicitCompanyId,
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
         system_role,
         password_hash,
         must_change_password,
         is_active
       ) VALUES (
         UUID_TO_BIN(?),
         UUID_TO_BIN(?),
         ?,
         ?,
         ?,
         TRUE,
         TRUE
       )`,
      [userId, employeeId, username, 'HR_MANAGER', passwordHash]
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
