import fs from 'fs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function seed() {
  try {
    const host = process.env.DB_HOST || 'mysql-1946dd8f-hrms-123.f.aivencloud.com';
    const port = Number(process.env.DB_PORT) || 18319;
    const user = process.env.DB_USER || 'avnadmin';
    const password = process.env.DB_PASSWORD;
    const database = process.env.DB_NAME || 'defaultdb';

    console.log(`\nDEBUG VARIABLES: host=${host}, port=${port}, user=${user}, db=${database}`);
    console.log(`PASSWORD EXISTS?: ${!!password}`);

    console.log("\nConnecting to your Aiven MySQL database...");
    
    // We will pull the connection details directly from your .env variables!
    const connection = await mysql.createConnection({
      host: host,
      port: port,
      user: user,
      password: password,
      database: database,
      ssl: {
          rejectUnauthorized: false
      },
      multipleStatements: true
    });
    
    console.log("Connected successfully! Reading and parsing HRMS.SQL...");
    const sqlFile = fs.readFileSync('HRMS.SQL', 'utf8');
    
    // We must manually parse DELIMITER statements because mysql2 does not understand them
    let statements = [];
    let currentStatement = '';
    let currentDelimiter = ';';
    
    const lines = sqlFile.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Handle empty lines or comments
      if (!line || line.startsWith('--')) {
        continue;
      }

      // Handle changing delimiter
      if (line.startsWith('DELIMITER ')) {
        currentDelimiter = line.substring(10).trim();
        continue;
      }
      
      currentStatement += line + '\n';
      
      // If statement ends with current delimiter, save it and reset
      if (line.endsWith(currentDelimiter)) {
        let stmt = currentStatement.trim();
        // Remove the delimiter from the end of the query
        stmt = stmt.slice(0, -currentDelimiter.length).trim();
        
        if (stmt) {
          statements.push(stmt);
        }
        currentStatement = '';
      }
    }

    console.log(`Executing ${statements.length} parsed statements to Aiven... This takes about 15 seconds.`);
    
    for (let i = 0; i < statements.length; i++) {
      try {
        await connection.query(statements[i]);
      } catch (err) {
        // Suppress "already exists" errors to allow script to re-run gracefully
        if(err.code !== 'ER_TABLE_EXISTS_ERROR' && err.code !== 'ER_TRG_ALREADY_EXISTS') {
           console.error(`\n❌ Error on statement ${i + 1}:`, err.message);
           console.log(`Statement snippet: ${statements[i].substring(0, 100)}...`);
           throw err;
        }
      }
    }
    
    console.log("\n✅ Success! Your database schema has been successfully pushed and created in Aiven.");
    await connection.end();
  } catch (error) {
    console.error("\n❌ Fatal Error:", error.message);
    process.exit(1);
  }
}

seed();
