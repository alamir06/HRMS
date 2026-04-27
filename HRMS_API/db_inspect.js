import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('d:/Major Course/Fifth Year/GC Document/HR/Implementation/HRMS/hrms_api/.env') });

async function getSchemas() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hrms'
  });

  const [personal] = await connection.query("SHOW CREATE TABLE employee_personal");
  const [doc] = await connection.query("SHOW CREATE TABLE document");
  
  console.log("employee_personal Schema:\n", personal[0]['Create Table']);
  console.log("\ndocument Schema:\n", doc[0]['Create Table']);
  
  await connection.end();
}

getSchemas().catch(console.error);
