import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function migrateRecruitment() {
  try {
    const host = process.env.DB_HOST || 'kodama.proxy.rlwy.net';
    const port = Number(process.env.DB_PORT) || 31463;
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_NAME || 'railway';

    console.log("Connecting to database to run migrations on 'recruitment' table...");

    const connection = await mysql.createConnection({
      host: host,
      port: port,
      user: user,
      password: password,
      database: database,
      ssl: {
          rejectUnauthorized: false
      }
    });

    try {
      console.log("Checking recruitment table for 'level'...");
      await connection.query(`
        ALTER TABLE \`recruitment\`
        ADD COLUMN \`level\` VARCHAR(50) NULL AFTER \`vacancies\`;
      `);
      console.log("✅ Added 'level' to recruitment table.");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
         console.log("ℹ️ 'level' already exists in recruitment table, skipping.");
      } else {
         console.error("❌ Failed to alter recruitment for 'level':", e.message);
      }
    }

    try {
      console.log("Checking recruitment table for 'referenceNumber'...");
      await connection.query(`
        ALTER TABLE \`recruitment\`
        ADD COLUMN \`referenceNumber\` VARCHAR(100) NULL AFTER \`id\`;
      `);
      console.log("✅ Added 'referenceNumber' to recruitment table.");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
         console.log("ℹ️ 'referenceNumber' already exists in recruitment table, skipping.");
      } else {
         console.error("❌ Failed to alter recruitment for 'referenceNumber':", e.message);
      }
    }

    try {
      console.log("Adding remaining missing columns to recruitment table...");
      await connection.query(`
        ALTER TABLE \`recruitment\`
        ADD COLUMN \`educationLevel\` VARCHAR(100) NULL,
        ADD COLUMN \`recruitmentType\` ENUM('ADMINISTRATIVE', 'ACADEMIC') DEFAULT 'ADMINISTRATIVE',
        ADD COLUMN \`specialization\` VARCHAR(255) NULL,
        ADD COLUMN \`specializationAmharic\` VARCHAR(255) NULL,
        ADD COLUMN \`academicRank\` VARCHAR(100) NULL,
        ADD COLUMN \`academicRankAmharic\` VARCHAR(100) NULL,
        ADD COLUMN \`remark\` TEXT NULL,
        ADD COLUMN \`remarkAmharic\` TEXT NULL,
        ADD COLUMN \`notes\` TEXT NULL,
        ADD COLUMN \`notesAmharic\` TEXT NULL;
      `);
      console.log("✅ Added all remaining missing columns to recruitment table.");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
         console.log("ℹ️ Columns already exist in recruitment table, skipping.");
      } else {
         console.error("❌ Failed to alter recruitment for remaining columns:", e.message);
      }
    }

    try {
      console.log("Removing NOT NULL constraints from recruitment columns...");
      await connection.query(`
        ALTER TABLE \`recruitment\`
        MODIFY COLUMN \`jobTitle\` VARCHAR(255) NULL,
        MODIFY COLUMN \`departmentId\` BINARY(16) NULL,
        MODIFY COLUMN \`designationId\` BINARY(16) NULL;
      `);
      console.log("✅ Removed NOT NULL constraints from jobTitle, departmentId, and designationId.");
    } catch (e) {
      console.error("❌ Failed to alter recruitment constraints:", e.message);
    }

    await connection.end();
    console.log("Migration finished.");
  } catch (error) {
    console.error("❌ Database Connection Failed:");
    console.error(error.message);
  }
}

migrateRecruitment();
