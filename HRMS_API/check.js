import pool from './config/database.js';
async function run() {
  const [rows] = await pool.query("SHOW COLUMNS FROM employeeBenefits LIKE 'status'");
  console.log(rows);
  process.exit();
}
run();
