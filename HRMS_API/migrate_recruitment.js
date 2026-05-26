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
      console.log("Checking recruitment table...");
      await connection.query(`
        ALTER TABLE \`recruitment\`
        ADD COLUMN \`level\` VARCHAR(50) NULL AFTER \`vacancies\`;
      `);
      console.log("✅ Added level to recruitment table.");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
         console.log("ℹ️ level already exists in recruitment table, skipping.");
      } else {
         console.error("❌ Failed to alter recruitment:", e.message);
      }
    }

    await connection.end();
    console.log("Migration finished.");
  } catch (error) {
    console.error("❌ Database Connection Failed:");
    console.error(error.message);
  }
}

migrateRecruitment();
