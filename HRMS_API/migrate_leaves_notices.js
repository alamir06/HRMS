import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function migrateLeavesNotices() {
  try {
    const host = process.env.DB_HOST || 'kodama.proxy.rlwy.net';
    const port = Number(process.env.DB_PORT) || 31463;
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_NAME || 'railway';

    console.log("Connecting to database to run migrations on 'leaveRequest' and 'notices' tables...");

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

    // 1. Add documentNumber to leaveRequest
    try {
      console.log("Checking leaveRequest table...");
      await connection.query(`
        ALTER TABLE \`leaveRequest\`
        ADD COLUMN \`documentNumber\` VARCHAR(100) NULL AFTER \`supportDocument\`;
      `);
      console.log("✅ Added documentNumber to leaveRequest table.");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
         console.log("ℹ️ documentNumber already exists in leaveRequest table, skipping.");
      } else {
         console.error("❌ Failed to alter leaveRequest:", e.message);
      }
    }

    // 2. Add targetCollegeId to notices
    try {
      console.log("Checking notices table...");
      await connection.query(`
        ALTER TABLE \`notices\`
        ADD COLUMN \`targetCollegeId\` BINARY(16) NULL AFTER \`targetAudience\`;
      `);
      console.log("✅ Added targetCollegeId to notices table.");

      // Run foreign key addition
      try {
          await connection.query(`
            ALTER TABLE \`notices\`
            ADD CONSTRAINT \`fk_notices_college\` FOREIGN KEY (\`targetCollegeId\`) REFERENCES \`college\`(\`id\`) ON DELETE CASCADE;
          `);
          console.log("✅ Added Foreign Key constraint for targetCollegeId.");
      } catch (f) {
           console.log("ℹ️ Foreign Key for targetCollegeId might already exist or failed:", f.message);
      }
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
         console.log("ℹ️ targetCollegeId already exists in notices table, skipping.");
      } else {
          console.error("❌ Failed to alter notices:", e.message);
      }
    }

    await connection.end();
    console.log("Migration finished.");
  } catch (error) {
    console.error("❌ Database Connection Failed:");
    console.error(error.message);
  }
}

migrateLeavesNotices();
