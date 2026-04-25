import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env' });

async function alterDb() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    console.log("Adding columns to users table...");
    await connection.query(`
      ALTER TABLE users 
      ADD COLUMN resetPasswordToken VARCHAR(255) NULL,
      ADD COLUMN resetPasswordExpires TIMESTAMP NULL;
    `);
    console.log("Database updated successfully.");
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log("Columns already exist.");
    } else {
      console.error("Error updating database:", error);
    }
  } finally {
    await connection.end();
  }
}

alterDb();
