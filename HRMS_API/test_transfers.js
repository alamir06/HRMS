import pool from './config/database.js';

async function check() {
  const [rows] = await pool.query("SHOW CREATE TABLE employee_surety");
  console.log(rows[0]['Create Table']);
  process.exit(0);
}

check();
