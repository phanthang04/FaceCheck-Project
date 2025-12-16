import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read config
const configPath = path.join(__dirname, "../config/config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const { host, username, password, database } = config.development;

async function createDatabase() {
  try {
    // Connect without database
    const connection = await mysql.createConnection({
      host,
      user: username,
      password: password,
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
    console.log(`✅ Database '${database}' created or already exists.`);
    
    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error creating database:", err);
    process.exit(1);
  }
}

createDatabase();
