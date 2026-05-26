import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function createSuretyTable() {
  try {
    const host = process.env.DB_HOST || 'mysql-1946dd8f-hrms-123.f.aivencloud.com';
    const port = Number(process.env.DB_PORT) || 18319;
    const user = process.env.DB_USER || 'avnadmin';
    const password = process.env.DB_PASSWORD;
    const database = process.env.DB_NAME || 'defaultdb';

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
