import bcrypt from "bcryptjs";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import pool from "../../config/database.js";

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS);

const generatePassword = () => {
  const raw = crypto.randomBytes(8).toString("base64");
  return raw.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) || "ChangeMe123";
};

export const findUserByIdentifier = async (identifier) => {
  let alt1 = identifier;
  let alt2 = identifier;
  let alt3 = identifier;

  const ethPhoneMatch = identifier.match(/^(?:\+251|0)?(9\d{8})$/);
  if (ethPhoneMatch) {
    alt1 = `+251${ethPhoneMatch[1]}`;
    alt2 = `0${ethPhoneMatch[1]}`;
    alt3 = `${ethPhoneMatch[1]}`;
  }

  const [rows] = await pool.execute(
    `SELECT 
       BIN_TO_UUID(u.id) AS id,
       BIN_TO_UUID(u.employeeId) AS employeeId,
       u.username,
       u.systemRole AS systemRole,
       u.passwordHash,
       u.isActive,
       u.mustChangePassword,
       u.passwordChangedAt,
       e.employeeRole,
       e.employeeCode,
       e.employmentStatus,
       ep.personalEmail,
       ep.personalPhone,
       ep.profilePicture,
       ep.firstName,
       ep.middleName,
       ep.lastName
     FROM users u
     JOIN employee e ON u.employeeId = e.id
     LEFT JOIN employeePersonal ep ON e.id = ep.employeeId  
     WHERE u.username = ? 
        OR ep.personalEmail = ? 
        OR ep.personalPhone IN (?, ?, ?)       
     LIMIT 1`,
    [identifier, identifier, alt1, alt2, alt3]
  );

  return rows.length ? rows[0] : null;
};

export const recordSuccessfulLogin = async (userId) => {
  await pool.execute(
    "UPDATE users SET lastLogin = CURRENT_TIMESTAMP WHERE id = UUID_TO_BIN(?)",
    [userId]
  );
};

export const changeUserPassword = async ({ userId, newPassword, mustChange = false }) => {
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await pool.execute(
    `UPDATE users
       SET passwordHash = ?,
           mustChangePassword = ?,
           passwordChangedAt = CURRENT_TIMESTAMP,
           updatedAt = CURRENT_TIMESTAMP
     WHERE id = UUID_TO_BIN(?)`,
    [passwordHash, mustChange ? 1 : 0, userId]
  );
};

export const createUserAccount = async ({ employeeId, username, systemRole = 'EMPLOYEE' }) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [employeeRows] = await connection.execute(
      `SELECT BIN_TO_UUID(id) AS id, employeeRole
         FROM employee
         WHERE id = UUID_TO_BIN(?)
         LIMIT 1`,
      [employeeId]
    );

    if (!employeeRows.length) {
      throw new Error("Employee record not found");
    }

    const [existingUserByEmployee] = await connection.execute(
      "SELECT 1 FROM users WHERE employeeId = UUID_TO_BIN(?) LIMIT 1",
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
         employeeId,
         username,
         systemRole,
         passwordHash,
         mustChangePassword,
         isActive
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
      employeeRole: employeeRows[0].employeeRole,
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
           companyName,
           companyNameAmharic,
           companyAddress,
           companyAddressAmharic,
           companyPhone,
           companyEmail,
           companyWebsite,
           companyLogo,
           companyEstablishedDate,
           companyTinNumber,
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
          status || "ACTIVE",
        ]
      );

      return id;
    }

    // Update the targeted row with any provided values.
    await connection.execute(
      `UPDATE company
          SET companyName = ?,
              companyNameAmharic = COALESCE(?, companyNameAmharic),
              companyAddress = COALESCE(?, companyAddress),
              companyAddressAmharic = COALESCE(?, companyAddressAmharic),
              companyPhone = COALESCE(?, companyPhone),
              companyEmail = COALESCE(?, companyEmail),
              companyWebsite = COALESCE(?, companyWebsite),
              companyLogo = COALESCE(?, companyLogo),
              companyEstablishedDate = COALESCE(?, companyEstablishedDate),
              companyTinNumber = COALESCE(?, companyTinNumber),
              status = COALESCE(?, status),
              updatedAt = CURRENT_TIMESTAMP
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
          SET companyName = ?,
              companyNameAmharic = COALESCE(?, companyNameAmharic),
              companyAddress = COALESCE(?, companyAddress),
              companyAddressAmharic = COALESCE(?, companyAddressAmharic),
              companyPhone = COALESCE(?, companyPhone),
              companyEmail = COALESCE(?, companyEmail),
              companyWebsite = COALESCE(?, companyWebsite),
              companyLogo = COALESCE(?, companyLogo),
              companyEstablishedDate = COALESCE(?, companyEstablishedDate),
              companyTinNumber = COALESCE(?, companyTinNumber),
              status = COALESCE(?, status),
              updatedAt = CURRENT_TIMESTAMP
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
       companyName,
       companyNameAmharic,
       companyAddress,
       companyAddressAmharic,
       companyPhone,
       companyEmail,
       companyWebsite,
       companyLogo,
       companyEstablishedDate,
       companyTinNumber,
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
      status || "ACTIVE",
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

const ensureSeedEmployee = async (connection, { companyId, firstName, lastName, email,phone}) => {
  const [existing] = await connection.execute(
    `SELECT BIN_TO_UUID(e.id) AS id
       FROM employee e
       JOIN users u ON e.id = u.employeeId
       WHERE e.employeeRole = 'HRMANAGER'
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
       employeeCode,
       companyId,
       employeeType,
       employeeRole,
       hireDate,
       employmentType,
       employmentStatus
     ) VALUES (
       UUID_TO_BIN(?),
       ?,
       UUID_TO_BIN(?),
       'ADMINISTRATIVE',
       'HRMANAGER',
       CURRENT_DATE,
       'FULLTIME',
       'ACTIVE'
     )`,
    [employeeId, employeeCode, companyId]
  );

  await connection.execute(
    `INSERT INTO employeePersonal (
       id,
       employeeId,
       firstName,
       lastName,
       personalEmail,
       personalPhone
     ) VALUES (
       UUID_TO_BIN(?),
       UUID_TO_BIN(?),
       ?,
       ?,
       ?,
       ?
     )`,
    [uuidv4(), employeeId, firstName, lastName, email,phone]
  );

  await connection.execute(
    `INSERT INTO employeeEmployment (
       id,
       employeeId,
       officialEmail
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
  const phone = process.env.SEED_HR_MANAGER_PHONE;
  const firstName = process.env.SEED_HR_MANAGER_FIRST_NAME;
  const lastName = process.env.SEED_HR_MANAGER_LAST_NAME;
  const companyName = process.env.SEED_COMPANY_NAME;
  const companyAddress = process.env.SEED_COMPANY_ADDRESS;
  const companyPhone = process.env.SEED_COMPANY_PHONE;
  const rawExplicitCompanyId = process.env.SEED_COMPANY_ID;
  const explicitCompanyId = rawExplicitCompanyId && rawExplicitCompanyId.trim() ? rawExplicitCompanyId.trim() : null;
  const seededPassword = process.env.SEED_HR_MANAGER_PASSWORD;

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
         JOIN employee e ON u.employeeId = e.id
         WHERE e.employeeRole = 'HRMANAGER'
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
      phone
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
         employeeId,
         username,
         systemRole,
         passwordHash,
         mustChangePassword,
         isActive
       ) VALUES (
         UUID_TO_BIN(?),
         UUID_TO_BIN(?),
         ?,
         ?,
         ?,
         TRUE,
         TRUE
       )`,
      [userId, employeeId, username, 'HRMANAGER', passwordHash]
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
       ep.personalEmail,
       ee.officialEmail,
       ep.firstName,
       ep.middleName,
       ep.lastName
     FROM employee e
     LEFT JOIN employeePersonal ep ON e.id = ep.employeeId
     LEFT JOIN employeeEmployment ee ON e.id = ee.employeeId
     WHERE e.id = UUID_TO_BIN(?)
     LIMIT 1`,
    [employeeId]
  );

  if (!rows.length) {
    return null;
  }

  const record = rows[0];
  const email = record.personalEmail || record.officialEmail || null;
  const name = [record.firstName, record.middleName, record.lastName]
    .filter(Boolean)
    .join(" ");

  return { email, name: name || null };
};
