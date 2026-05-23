import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
  host: process.env.DB_HOST || 'mysql-1946dd8f-hrms-123.f.aivencloud.com',
  port: Number(process.env.DB_PORT) || 18319,
  user: process.env.DB_USER || 'avnadmin',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'defaultdb',
  ssl: {
    rejectUnauthorized: false
  }
});

async function test() {
    try {
        console.log("Connecting as Postgres...");
        await client.connect();
        console.log("SUCCESSFULLY CONNECTED USING POSTGRESQL PROTOCOL!");
        const res = await client.query('SELECT version()');
        console.log("Version:", res.rows[0].version);
        await client.end();
    } catch (e) {
        console.log("POSTGRESQL ERROR:", e.message);
        await client.end();
    }
}
test();
