import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function createSuretyTable() {
  try {
    const host = process.env.DB_HOST || 'kodama.proxy.rlwy.net';
    const port = Number(process.env.DB_PORT) || 31463;
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_NAME || 'railway';

    console.log("Connecting to database to verify/create 'employee_surety' table...");

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

    const query = `
      CREATE TABLE IF NOT EXISTS \`employee_surety\` (
        \`id\` binary(16) NOT NULL,
        \`employeeId\` binary(16) NOT NULL,
        \`suretyName\` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
        \`suretyPhone\` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
        \`suretyEmail\` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`documentName\` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`documentPath\` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`mimeType\` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        \`fileSize\` int DEFAULT NULL,
        \`createdAt\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`fk_employee_surety\` (\`employeeId\`),
        CONSTRAINT \`fk_employee_surety\` FOREIGN KEY (\`employeeId\`) REFERENCES \`employee\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.query(query);
    console.log("✅ 'employee_surety' table is ready!");
    
    await connection.end();
  } catch (error) {
    console.error("❌ Failed to verify/create 'employee_surety' table:");
    console.error(error.message);
  }
}

createSuretyTable();
