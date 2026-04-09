import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+03:00'
});

pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+03:00'", () => {
    // Keep app resilient if timezone set fails on some hosts.
  });
});

export default pool;