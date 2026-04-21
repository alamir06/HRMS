import pool from './config/database.js';

async function run() {
  try {
    const [rows] = await pool.query("DESCRIBE department");
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
