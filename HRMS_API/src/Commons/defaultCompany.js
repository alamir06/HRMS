import pool from "../../config/database.js";

let cachedDefaultCompanyId = null;
let cachedKey = null;

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const getDefaultCompanyId = async () => {
  const rawSeedCompanyId = process.env.SEED_COMPANY_ID || "";
  const seedCompanyId = rawSeedCompanyId && rawSeedCompanyId.trim() ? rawSeedCompanyId.trim() : null;
  const seedCompanyName = process.env.SEED_COMPANY_NAME;
  const cacheKey = seedCompanyId || seedCompanyName || "__first_company__";

  if (cachedDefaultCompanyId && cachedKey === cacheKey) {
    return cachedDefaultCompanyId;
  }

  const connection = await pool.getConnection();
  try {
    if (seedCompanyId) {
      if (!uuidRegex.test(seedCompanyId)) {
        throw new Error("SEED_COMPANY_ID must be a valid UUID");
      }

      const [rows] = await connection.execute(
        "SELECT BIN_TO_UUID(id) AS id FROM company WHERE id = UUID_TO_BIN(?) LIMIT 1",
        [seedCompanyId]
      );

      if (!rows.length) {
        throw new Error("Seed Company ID was provided but no matching company exists");
      }

      cachedDefaultCompanyId = rows[0].id;
      cachedKey = cacheKey;
      return cachedDefaultCompanyId;
    }

    if (seedCompanyName) {
      const [rows] = await connection.execute(
        "SELECT BIN_TO_UUID(id) AS id FROM company WHERE companyName = ? LIMIT 1",
        [seedCompanyName]
      );

      if (rows.length) {
        cachedDefaultCompanyId = rows[0].id;
        cachedKey = cacheKey;
        return cachedDefaultCompanyId;
      }
    }

    const [[countRow]] = await connection.execute(
      "SELECT COUNT(*) AS companyCount FROM company"
    );
    const companyCount = Number(countRow?.companyCount || 0);
    if (companyCount > 1) {
      throw new Error(
        "Multiple companies found. Set Seed Company ID to pin the intended company or delete extra companies from the database."
      );
    }

    // Fallback: first (and only) company in DB.
    const [rows] = await connection.execute(
      "SELECT BIN_TO_UUID(id) AS id FROM company ORDER BY createdAt ASC LIMIT 1"
    );

    if (!rows.length) {
      throw new Error(
        "No company found. Ensure Seed Company Name is set so startup seeding can create one."
      );
    }

    cachedDefaultCompanyId = rows[0].id;
    cachedKey = cacheKey;
    return cachedDefaultCompanyId;
  } finally {
    connection.release();
  }
};

export const ensureDefaultCompanyIdInBody = () => {
  return async (req, res, next) => {
    try {
      if (!req.body || typeof req.body !== "object") {
        return next();
      }

      if (!req.body.companyId) {
        req.body.companyId = await getDefaultCompanyId();
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Default company not configured",
        message: error?.message || "Failed to resolve default company",
      });
    }
  };
};
